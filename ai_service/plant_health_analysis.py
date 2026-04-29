import os
import sys
import json
import base64
import re
from io import BytesIO
from datetime import datetime
from typing import Any, Dict, List, Optional

# Image libs
from PIL import Image

# HF / Torch (runtime deps)
try:
    import torch
    from transformers import AutoImageProcessor, AutoModelForImageClassification
except Exception:
    torch = None
    AutoImageProcessor = None
    AutoModelForImageClassification = None

# Gemini Vision
try:
    from google import genai
except Exception:
    genai = None


# -----------------------------
# Config (env overrides)
# -----------------------------
MODEL_ID = os.getenv("PLANT_HEALTH_MODEL_ID", "ryanheise/plantvillage-vgg16")
TOPK = int(os.getenv("PLANT_HEALTH_TOPK", "5"))

SUPPORTED_CROPS = {
    "apple",
    "blueberry",
    "cherry",
    "corn",
    "grape",
    "orange",
    "peach",
    "pepper",
    "bell pepper",
    "potato",
    "raspberry",
    "soybean",
    "squash",
    "strawberry",
    "tomato",
    "eggplant",
    "lettuce",
    "citrus",
}

GEMINI_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-2.0-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


# -----------------------------
# Helpers
# -----------------------------
def _read_payload() -> Dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    return json.loads(raw)


def _decode_data_url(image_data: str) -> bytes:
    """
    Accepts:
      - data:image/jpeg;base64,xxxx
      - xxxx (pure base64)
    Returns raw bytes.
    """
    if not image_data:
        raise ValueError("No image_data provided")

    if "," in image_data:
        _, b64 = image_data.split(",", 1)
    else:
        b64 = image_data

    return base64.b64decode(b64)


def _bytes_to_pil(img_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(img_bytes)).convert("RGB")


def _topk_predictions(model, processor, img: Image.Image, k: int = 5) -> List[Dict[str, Any]]:
    """
    Returns: [{"label": str, "confidence": float, "notes": "..."}...]
    """
    if torch is None or AutoImageProcessor is None:
        return []

    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        out = model(**inputs)

    logits = out.logits
    probs = torch.softmax(logits, dim=-1)[0]
    k = min(k, probs.shape[-1])
    vals, idxs = torch.topk(probs, k=k)

    id2label = model.config.id2label or {}
    preds = []
    for conf, idx in zip(vals.tolist(), idxs.tolist()):
        label = (id2label.get(idx) or str(idx)).strip()
        preds.append(
            {
                "label": label,
                "confidence": round(float(conf), 4),
                "notes": "PlantVillage image classifier",
            }
        )
    return preds


def _extract_crop_from_label(label: str) -> str:
    """
    Try to extract crop name from PlantVillage-style labels, e.g.:
      - "Grape___Black_rot"
      - "Pepper,_bell___Bacterial_spot"
      - "Grape with Black Rot"
    """
    if not label:
        return ""

    txt = label.replace("___", " ").replace("_", " ").strip().lower()

    # if "with" exists => crop is before it
    if " with " in txt:
        return txt.split(" with ", 1)[0].strip()

    # if "pepper, bell" etc
    # take first up to 3 tokens (works well enough)
    tokens = re.split(r"\s+", txt)
    return " ".join(tokens[:3]).strip()


def _normalize_crop(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _crop_mismatch(plantvillage_label: str, hint: str) -> bool:
    """
    Returns True if crop names have no token overlap (simple/robust).
    """
    pv_crop = _normalize_crop(_extract_crop_from_label(plantvillage_label))
    hint_crop = _normalize_crop(hint or "")

    if not pv_crop or not hint_crop:
        return False

    pv_tokens = set(pv_crop.split())
    hint_tokens = set(hint_crop.split())
    return len(pv_tokens & hint_tokens) == 0

def _crop_mismatch_with_hints(label: str, hints: List[str]) -> bool:
    if not label:
        return False
    normalized_hints = [hint.strip() for hint in hints if hint and hint.strip()]
    if not normalized_hints:
        return False
    return all(_crop_mismatch(label, hint) for hint in normalized_hints)


def _is_supported_crop(name: str) -> bool:
    normalized = _normalize_crop(name)
    if not normalized:
        return False
    return any(supported in normalized for supported in SUPPORTED_CROPS)


def run_gemini_vision(img_bytes: bytes, plant_hint: str = "", stage_hint: str = "") -> Dict[str, Any]:
    """
    Returns dict:
      { plant, disease, symptoms[], confidence, raw }
    or { error: "..." }
    """
    if genai is None:
        return {"error": "Gemini SDK missing. Install: pip install google-genai"}
    if not GEMINI_API_KEY:
        return {"error": "GEMINI_API_KEY not set"}

    prompt = f"""
You are a plant disease assistant.
From the IMAGE ONLY, answer in JSON with keys:
- plant (string): most likely plant/crop name (e.g., grape, pepper, potato, orchid)
- disease (string): most likely disease name OR "Unknown"
- stage (string): growth stage (seedling, vegetative, flowering, fruiting, mature, etc.) if you can infer it, otherwise "Unknown"
- symptoms (array of strings): visible symptoms you can see (short bullet-style)
- confidence (number 0-1): how confident you are

If the plant is not a common crop leaf (e.g., orchid/houseplant), disease may be "Unknown".
Plant hint (may be wrong): {plant_hint}
Stage hint (if provided): {stage_hint}

Return ONLY valid JSON.
""".strip()

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": img_bytes}},
            ],
        )

        raw = (resp.text or "").strip()
        data = json.loads(raw)

        # normalize expected fields
        data.setdefault("plant", "")
        data.setdefault("disease", "Unknown")
        data.setdefault("stage", "Unknown")
        data.setdefault("symptoms", [])
        data.setdefault("confidence", 0.0)
        data["raw"] = raw
        return data

    except Exception as exc:
        return {"error": f"Gemini Vision failed: {exc}"}


# -----------------------------
# Main
# -----------------------------
def main():
    payload = _read_payload()

    image_data = payload.get("image_data") or payload.get("image")
    plant_name = payload.get("plant_name") or payload.get("crop_name") or ""
    analysis_mode = payload.get("analysis_mode") or "disease"
    environment = payload.get("environment") or ""
    location = payload.get("location") or ""

    # if missing runtime deps
    if torch is None or AutoImageProcessor is None or AutoModelForImageClassification is None:
        out = {
            "ok": False,
            "summary": "Missing dependencies. Install: torch, transformers, pillow, huggingface_hub",
            "predictions": [],
            "confidence": 0.0,
            "gemini_vision": {"error": "Skipped (missing deps for image pipeline)"},
            "is_crop_mismatch": False,
            "warning": "PlantVillage model only supports crop leaves",
            "final_disease": "Unknown / Needs manual confirmation",
        }
        print(json.dumps(out))
        return

    # decode image
    try:
        img_bytes = _decode_data_url(image_data)
        img = _bytes_to_pil(img_bytes)
    except Exception as exc:
        out = {
            "ok": False,
            "summary": f"Image decode failed: {exc}",
            "predictions": [],
            "confidence": 0.0,
            "gemini_vision": {"error": "Skipped (invalid image)"},
            "is_crop_mismatch": False,
            "warning": None,
            "final_disease": "Unknown / Needs manual confirmation",
        }
        print(json.dumps(out))
        return

    # PlantVillage classification
    plant_supported = _is_supported_crop(plant_name)
    use_plantvillage = (
        analysis_mode == "disease" and (plant_supported or not plant_name.strip())
    )
    pv_error = None
    predictions = []
    top_label = ""
    top_conf = 0.0
    pv_warning = None

    if use_plantvillage:
        try:
            processor = AutoImageProcessor.from_pretrained(MODEL_ID)
            model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
            model.eval()

            predictions = _topk_predictions(model, processor, img, k=TOPK)
        except Exception as exc:
            predictions = []
            pv_error = str(exc)
        if predictions:
            top_label = predictions[0]["label"]
            top_conf = float(predictions[0]["confidence"])
    else:
        pv_warning = (
            "PlantVillage model only supports known crop leaves; using Gemini instead."
        )

    # Gemini Vision (plant + symptoms)
    payload_stage = payload.get("stage", "")
    gemini = run_gemini_vision(img_bytes, plant_hint=plant_name, stage_hint=payload_stage)

    # mismatch logic
    hint_sources = []
    if plant_name:
        hint_sources.append(plant_name)
    if gemini and not gemini.get("error"):
        hint_sources.append(gemini.get("plant", ""))
    is_mismatch = False
    if use_plantvillage and top_label:
        is_mismatch = _crop_mismatch_with_hints(top_label, hint_sources)

    warning = pv_warning
    if is_mismatch:
        warning = "PlantVillage model only supports crop leaves"

    # Stage info
    gemini_stage = (gemini or {}).get("stage") if gemini else None
    inferred_stage = (
        gemini_stage
        if gemini_stage and gemini_stage.strip() and gemini_stage.lower() != "unknown"
        else payload_stage
    )
    stage_info = {
        "provided": payload_stage or None,
        "inferred": inferred_stage or "Unknown",
        "notes": (
            "Stage inferred from Gemini Vision"
            if gemini_stage and gemini_stage.strip() and gemini_stage.lower() != "unknown"
            else "Stage provided by user or unknown"
        ),
    }

    stage_mode_active = analysis_mode == "stage"

    # final decision
    if not use_plantvillage:
        if gemini and not gemini.get("error"):
            final_disease = gemini.get("disease") or "Unknown"
        else:
            final_disease = "Unknown / Needs manual confirmation"
    elif is_mismatch:
        final_disease = "Unknown / Needs manual confirmation"
    else:
        if top_label:
            final_disease = top_label
        elif gemini and not gemini.get("error"):
            final_disease = gemini.get("disease") or "Unknown"
        else:
            final_disease = "Unknown / Needs manual confirmation"

    if analysis_mode == "stage":
        final_disease = stage_info["inferred"] or "Unknown"
        warning = warning or "Stage-focused analysis requested."

    if stage_mode_active:
        summary_text = (
            f"Stage focus: {stage_info['inferred']} ({stage_info['notes']})"
        )
    else:
        summary_text = (
            f"PlantVillage top: {top_label} ({top_conf})"
            if top_label
            else "PlantVillage classification unavailable; using Gemini fallback"
        )

    # Build output
    out = {
        "ok": True,
        "timestamp": datetime.utcnow().isoformat() + "Z",

        "plant_name": plant_name,
        "environment": environment,
        "location": location,

        "model": MODEL_ID,
        "predictions": predictions,
        "confidence": top_conf,

        "gemini_vision": gemini,
        "is_crop_mismatch": is_mismatch,
        "analysis_mode": analysis_mode,
        "warning": warning,
        "final_disease": final_disease,
        "stage_analysis": stage_info,

        "summary": summary_text,
    }

    # if PlantVillage failed completely, attach error in a safe field
    if not predictions:
        out["plantvillage_error"] = locals().get("pv_error", "Unknown error")

    print(json.dumps(out))


if __name__ == "__main__":
    main()
