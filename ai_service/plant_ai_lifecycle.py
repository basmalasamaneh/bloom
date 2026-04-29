import json
import os
import sys
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    def load_dotenv(*args, **kwargs):
        return None

try:
    import requests
except ModuleNotFoundError:
    requests = None

from pydantic import BaseModel, Field

# ✅ Gemini SDK
# pip install -U google-genai
try:
    from google import genai
except ModuleNotFoundError:
    genai = None
load_dotenv()

# ----------------------------
# 1) Structured Output Schema
# ----------------------------
class TimelineItem(BaseModel):
    stage: str
    start_date: str
    end_date: str


class CareBlocks(BaseModel):
    watering: str
    fertilizer: str
    sunlight: str
    pruning: Optional[str] = None
    soil: Optional[str] = None
    pests: Optional[str] = None


class LifecycleAdvice(BaseModel):
    # ✅ quick suitability fields
    suitable_for_selected_environment: bool
    suitability_notes: str
    recommended_environment: str
    recommended_location: str
    recommended_soil_type: str

    # lifecycle
    current_stage: str
    confidence: float = Field(..., ge=0, le=1)
    timeline: List[TimelineItem]
    care: CareBlocks
    red_flags: List[str]


# ----------------------------
# 2) Quick rule-based checks
# ----------------------------
def normalize_text(s: str) -> str:
    return (s or "").strip().lower()


def normalize_soil(soil: str) -> str:
    s = normalize_text(soil)
    # simple normalization
    if "loam" in s:
        return "loamy"
    if "clay" in s:
        return "clay"
    if "sand" in s:
        return "sandy"
    if "compost" in s or "mix" in s:
        return "compost_mix"
    if "silt" in s:
        return "silty"
    return s or "unknown"


# Plant rules: these are "reminders" only — user can continue anyway
PLANT_RULES: Dict[str, Dict[str, Any]] = {
    "rice": {
        "best_environment": "outdoor",
        "indoor_ok": False,
        "why_not_indoor": "Needs very strong direct light, warm temperatures, and constant saturation/flooding; indoors is usually not suitable without special setup.",
        "preferred_soils": ["clay", "silty"],
        "avoid_soils": ["sandy"],
        "soil_note": "Rice likes heavy clay/silty clay to hold standing water.",
        "recommended_location": "Full sun; flooded paddy or large water-retaining container",
    },
    "corn": {
        "best_environment": "outdoor",
        "indoor_ok": False,
        "why_not_indoor": "Grows tall, needs strong sun and space; indoor containers are usually not suitable.",
        "preferred_soils": ["loamy"],
        "avoid_soils": ["clay"],
        "soil_note": "Corn prefers fertile, well-draining loamy soil.",
        "recommended_location": "Full sun in open ground",
    },
    "watermelon": {
        "best_environment": "outdoor",
        "indoor_ok": False,
        "why_not_indoor": "Needs lots of sun, space, and pollination; indoor is not recommended.",
        "preferred_soils": ["sandy", "loamy"],
        "avoid_soils": ["clay"],
        "soil_note": "Watermelon prefers well-draining sandy/loamy soil.",
        "recommended_location": "Full sun; plenty of space for vines",
    },
    "tomato": {
        "best_environment": "outdoor",
        "indoor_ok": "conditional",  # possible with strong grow light + hand pollination
        "why_not_indoor": "Possible indoors only with strong grow lights and hand pollination; otherwise fruiting is weak.",
        "preferred_soils": ["loamy", "compost_mix"],
        "avoid_soils": ["clay"],
        "soil_note": "Tomato prefers rich, well-draining loamy soil + compost.",
        "recommended_location": "Full sun; large pot or garden bed",
    },
    "basil": {
        "best_environment": "indoor",
        "indoor_ok": True,
        "why_not_indoor": "",
        "preferred_soils": ["compost_mix", "loamy"],
        "avoid_soils": ["clay"],
        "soil_note": "Basil likes light, well-draining mix.",
        "recommended_location": "Sunny windowsill / balcony / garden",
    },
    "mint": {
        "best_environment": "indoor",
        "indoor_ok": True,
        "why_not_indoor": "",
        "preferred_soils": ["compost_mix", "loamy"],
        "avoid_soils": [],
        "soil_note": "Mint is flexible; keep soil slightly moist.",
        "recommended_location": "Container (mint spreads fast)",
    },
}


def quick_reminders(plant_name: str, user_env: str, user_soil: str, user_location: str):
    """
    Print reminders early, but DO NOT stop the program.
    """
    p = normalize_text(plant_name)
    env = normalize_text(user_env)
    soil = normalize_soil(user_soil)

    rules = PLANT_RULES.get(p)
    if not rules:
        print("\nQuick Reminders")
        print("---------------------------------")
        print("• No local rules for this plant name. I will rely on the AI analysis.")
        print("• Tip: Use correct plant spelling (e.g., 'rice', not 'rise').")
        return

    print("\nQuick Reminders (before AI)")
    print("---------------------------------")

    # Environment reminder
    indoor_ok = rules.get("indoor_ok", True)
    best_env = rules.get("best_environment", "outdoor")

    if env == "indoor":
        if indoor_ok is False:
            print("⚠️ Environment reminder:")
            print(f"• {plant_name} is generally NOT recommended indoors.")
            print(f"• Why: {rules.get('why_not_indoor')}")
            print(f"• Recommended environment: {best_env}")
            print(f"• Recommended location: {rules.get('recommended_location', 'N/A')}")
        elif indoor_ok == "conditional":
            print("⚠️ Environment reminder:")
            print(f"• {plant_name} indoors is possible but needs strong grow lights + (often) hand pollination.")
            print(f"• Recommended environment: {best_env} (best results)")
        else:
            print("✅ Environment reminder:")
            print(f"• {plant_name} is generally OK indoors.")
    else:
        # outdoor selected
        if best_env == "indoor":
            print("⚠️ Environment reminder:")
            print(f"• {plant_name} is often easier indoors, but outdoor can still work if conditions are good.")
        else:
            print("✅ Environment reminder:")
            print(f"• {plant_name} is generally OK outdoors.")

    # Soil reminder
    preferred = rules.get("preferred_soils", [])
    avoid = rules.get("avoid_soils", [])
    soil_note = rules.get("soil_note", "")

    print("\n⚠️ Soil reminder:")
    if soil in avoid:
        print(f"• Your soil '{user_soil}' may be a bad match for {plant_name}.")
        print(f"• Note: {soil_note}" if soil_note else "• Consider changing soil type.")
        if preferred:
            print(f"• Better soil types: {', '.join(preferred)}")
    elif preferred and soil not in preferred and soil != "unknown":
        print(f"• Your soil '{user_soil}' may not be ideal for {plant_name}.")
        print(f"• Note: {soil_note}" if soil_note else "")
        print(f"• Better soil types: {', '.join(preferred)}")
    else:
        print(f"• Soil looks acceptable for {plant_name} (based on simple rules).")
        if soil_note:
            print(f"• Note: {soil_note}")

    # Always remind user can continue
    print("\n✅ You can continue with your choice — these are just reminders.\n")


# ----------------------------
# 2b) Service helpers (backend)
# ----------------------------
def _normalize_stage_label(label: str) -> Optional[str]:
    if not label:
        return None
    s = normalize_text(label).replace("-", " ").replace("_", " ")
    if "germin" in s:
        return "germination"
    if "seedling" in s or s == "seed":
        return "seedling"
    if "vegetative" in s:
        return "vegetative"
    if "flower" in s or "bloom" in s:
        return "flowering"
    if "fruit" in s:
        return "fruiting"
    if "harvest" in s:
        return "harvest"
    return None


def _timeline_to_map(timeline: List[TimelineItem], planting_date: datetime):
    out = {
        "germination": None,
        "seedling": None,
        "vegetative": None,
        "flowering": None,
        "fruiting": None,
        "harvest": None,
    }

    for item in timeline or []:
        key = _normalize_stage_label(item.stage)
        if key:
            out[key] = {"start": item.start_date, "end": item.end_date}

    for item in generate_timeline(planting_date):
        key = _normalize_stage_label(item.stage)
        if key and out.get(key) is None:
            out[key] = {"start": item.start_date, "end": item.end_date}

    return out


def _build_care_tips(advice: LifecycleAdvice) -> str:
    parts = []
    if advice.care.sunlight:
        parts.append(f"Sunlight: {advice.care.sunlight}")
    if advice.care.pruning:
        parts.append(f"Pruning: {advice.care.pruning}")
    if advice.care.soil:
        parts.append(f"Soil: {advice.care.soil}")
    if advice.care.pests:
        parts.append(f"Pests: {advice.care.pests}")
    if advice.red_flags:
        parts.append(f"Red flags: {', '.join(advice.red_flags)}")
    if advice.suitability_notes:
        parts.append(f"Suitability: {advice.suitability_notes}")
    return " ".join(parts).strip()


def _build_service_output(payload: Dict[str, Any]) -> Dict[str, Any]:
    plant_name = (payload.get("name") or payload.get("plant_name") or payload.get("plant") or "").strip()
    if not plant_name:
        plant_name = "Plant"

    planting_date = payload.get("planting_date") or payload.get("plantingDate")
    if not planting_date:
        raise ValueError("planting_date is required")

    user_environment = normalize_text(
        payload.get("environment") or payload.get("user_environment") or payload.get("userEnvironment") or "outdoor"
    )
    if user_environment not in ["indoor", "outdoor"]:
        user_environment = "outdoor"

    planting_location = payload.get("plant_location") or payload.get("planting_location") or payload.get("plantLocation") or ""
    soil_type = payload.get("soil_type") or payload.get("soilType") or ""

    weather = payload.get("weather") or {}
    if not isinstance(weather, dict):
        weather = {}

    temperature = weather.get("temperature_c", None)
    if temperature is None:
        temperature = payload.get("temperature", 25.0)
    humidity = weather.get("humidity", None)
    if humidity is None:
        humidity = payload.get("humidity", 60.0)

    try:
        temperature = float(temperature)
    except (TypeError, ValueError):
        temperature = 25.0
    try:
        humidity = float(humidity)
    except (TypeError, ValueError):
        humidity = 60.0

    city = weather.get("location") or payload.get("location") or payload.get("city") or "unknown"

    metadata, planting_date_obj = prepare_metadata(
        plant_name,
        planting_date,
        temperature,
        humidity,
        city,
        user_environment,
        planting_location,
        soil_type,
    )

    prompt = create_prompt(metadata)
    model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")

    advice = get_care_advice(prompt, model_name)
    if advice is None:
        advice = build_fallback_advice(planting_date_obj, user_environment, planting_location, soil_type)

    timeline_map = _timeline_to_map(advice.timeline, planting_date_obj)
    timeline_items = [
        {"stage": item.stage, "start_date": item.start_date, "end_date": item.end_date}
        for item in (advice.timeline or [])
    ]

    return {
        "plant_name": plant_name,
        "detected_name": plant_name,
        "timeline": timeline_map,
        "timeline_items": timeline_items,
        "irrigation": advice.care.watering,
        "fertilizer": advice.care.fertilizer,
        "care_tips": _build_care_tips(advice),
        "weather": weather or None,
        "current_stage": advice.current_stage,
        "confidence": advice.confidence,
        "suitable_for_selected_environment": advice.suitable_for_selected_environment,
        "suitability_notes": advice.suitability_notes,
        "recommended_environment": advice.recommended_environment,
        "recommended_location": advice.recommended_location,
        "recommended_soil_type": advice.recommended_soil_type,
        "red_flags": advice.red_flags,
    }


def _run_service_from_stdin():
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"error": "No JSON input provided"}))
        return

    try:
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            raise ValueError("JSON input must be an object")
        output = _build_service_output(payload)
        print(json.dumps(output))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))


# ----------------------------
# 3) Weather (optional)
# ----------------------------
def get_local_weather():
    """
    Best-effort weather lookup using IP + Open-Meteo current_weather.
    Humidity is a fallback constant here.
    """
    try:
        if requests is None:
            return 25.0, 60.0, "unknown"
        loc = requests.get("https://ipapi.co/json/", timeout=10).json()
        lat = loc.get("latitude")
        lon = loc.get("longitude")
        city = loc.get("city", "unknown")

        if not lat or not lon:
            return 25.0, 60.0, city

        weather_url = (
            "https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&current_weather=true"
        )
        weather_data = requests.get(weather_url, timeout=10).json()
        current = weather_data.get("current_weather", {})
        temp = current.get("temperature", 25.0)
        humidity = 55  # fallback

        print(f"Location: {city}, Temperature: {temp}C, Humidity: {humidity}%")
        return float(temp), float(humidity), city

    except Exception:
        return 25.0, 60.0, "unknown"


# ----------------------------
# 4) Metadata + Prompt
# ----------------------------
def prepare_metadata(
    plant_name: str,
    planting_date: str,
    temperature: float,
    humidity: float,
    city: str,
    user_environment: str,
    planting_location: str,
    soil_type: str,
):
    planting_date_dt = datetime.strptime(planting_date, "%Y-%m-%d")
    days_since = max((datetime.now().date() - planting_date_dt.date()).days, 0)

    metadata = {
        "plant": plant_name.strip(),
        "planting_date": planting_date_dt.strftime("%Y-%m-%d"),
        "days_since_planting": days_since,
        "temperature": temperature,
        "humidity": humidity,
        "city": city,
        "user_environment": user_environment,
        "planting_location": planting_location,
        "soil_type": soil_type,
    }
    return metadata, planting_date_dt


def create_prompt(metadata):
    return (
        "You are an agriculture assistant AI.\n"
        f"Plant: {metadata['plant']}\n"
        f"City/Region: {metadata['city']}\n"
        f"Planted on: {metadata['planting_date']} ({metadata['days_since_planting']} days ago)\n"
        f"Temperature: {metadata['temperature']}C\n"
        f"Humidity: {metadata['humidity']}%\n"
        f"User selected environment: {metadata['user_environment']}\n"
        f"User planting location detail: {metadata['planting_location']}\n"
        f"User soil type: {metadata['soil_type']}\n\n"
        "Tasks:\n"
        "1) Evaluate whether the plant is suitable for the user's selected environment (indoor/outdoor).\n"
        "2) Recommend the best environment, recommended_location, and recommended_soil_type for this plant.\n"
        "3) Predict the current life cycle stage and provide a timeline using ISO dates (YYYY-MM-DD).\n"
        "4) Provide practical care advice and red flags.\n"
        "Return JSON only, matching the provided schema.\n"
    )


# ----------------------------
# 5) Fallback timeline
# ----------------------------
def generate_timeline(planting_date: datetime):
    stages = {
        "Germination": (0, 14),
        "Seedling": (14, 28),
        "Vegetative Growth": (29, 50),
        "Flowering": (51, 65),
        "Fruiting": (66, 90),
        "Harvest": (91, 120),
    }
    timeline = []
    for stage, (start_offset, end_offset) in stages.items():
        start = planting_date + timedelta(days=start_offset)
        end = planting_date + timedelta(days=end_offset)
        timeline.append(
            TimelineItem(
                stage=stage,
                start_date=start.strftime("%Y-%m-%d"),
                end_date=end.strftime("%Y-%m-%d"),
            )
        )
    return timeline


def build_fallback_advice(planting_date: datetime, user_env: str, user_location: str, user_soil: str):
    return LifecycleAdvice(
        suitable_for_selected_environment=False,
        suitability_notes="AI unavailable; cannot verify suitability. Using defaults.",
        recommended_environment="outdoor",
        recommended_location=user_location or "garden bed",
        recommended_soil_type=user_soil or "well-draining loamy soil",
        current_stage="Unknown",
        confidence=0.0,
        timeline=generate_timeline(planting_date),
        care=CareBlocks(
            watering="Keep soil evenly moist (avoid waterlogging).",
            fertilizer="Use a balanced fertilizer per label directions.",
            sunlight="Aim for strong light (6-8 hours) if possible.",
            pruning="Remove dead or diseased growth only.",
            soil="Add compost; ensure drainage.",
            pests="Inspect weekly; treat pests early.",
        ),
        red_flags=["AI service unavailable; using default guidance."],
    )


# ----------------------------
# 6) Gemini call
# ----------------------------
def get_care_advice(prompt: str, model_name: str) -> Optional[LifecycleAdvice]:
    try:
        if genai is None:
            print(
                "Gemini SDK not installed. Install with: pip install -U google-genai",
                file=sys.stderr,
            )
            return None
        client = genai.Client()

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": LifecycleAdvice.model_json_schema(),
            },
        )

        return LifecycleAdvice.model_validate_json(response.text)

    except Exception as e:
        print(f"Error communicating with Gemini: {e}", file=sys.stderr)
        return None


def format_timeline(timeline: List[TimelineItem]) -> str:
    return "\n".join(
        f"{item.stage:<20} {item.start_date} -> {item.end_date}" for item in timeline
    )


# ----------------------------
# 7) Main
# ----------------------------
if __name__ == "__main__":
    if not sys.stdin.isatty():
        _run_service_from_stdin()
        sys.exit(0)

    print("AI Plant Life Cycle Assistant (Gemini)\n")

    plant_name = input("Enter plant name (e.g., tomato, cucumber): ").strip()
    planting_date = input("Enter planting date (YYYY-MM-DD): ").strip()

    user_environment = input("Enter environment (Indoor/Outdoor): ").strip().lower()
    if user_environment not in ["indoor", "outdoor"]:
        user_environment = "outdoor"

    planting_location = input(
        "Enter planting location (e.g., container, garden bed, greenhouse): "
    ).strip()

    soil_type = input("Enter soil type (e.g., loamy, sandy, clay, compost mix): ").strip()

    # ✅ EARLY REMINDERS (no stopping, user can continue)
    quick_reminders(plant_name, user_environment, soil_type, planting_location)

    # Continue the rest
    temperature, humidity, city = get_local_weather()

    metadata, planting_date_obj = prepare_metadata(
        plant_name,
        planting_date,
        temperature,
        humidity,
        city,
        user_environment,
        planting_location,
        soil_type,
    )

    prompt = create_prompt(metadata)

    model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")

    advice = get_care_advice(prompt, model_name)
    if advice is None:
        advice = build_fallback_advice(planting_date_obj, user_environment, planting_location, soil_type)

    timeline_text = format_timeline(advice.timeline)
    suitability_line = "OK" if advice.suitable_for_selected_environment else "Not recommended"

    care_lines = [
        f"Watering: {advice.care.watering}",
        f"Fertilizer: {advice.care.fertilizer}",
        f"Sunlight: {advice.care.sunlight}",
    ]
    if advice.care.pruning:
        care_lines.append(f"Pruning: {advice.care.pruning}")
    if advice.care.soil:
        care_lines.append(f"Soil: {advice.care.soil}")
    if advice.care.pests:
        care_lines.append(f"Pests: {advice.care.pests}")
    care_text = "\n".join(care_lines)

    red_flags_text = "None" if not advice.red_flags else "\n".join(f"- {x}" for x in advice.red_flags)

    output = (
        "Environment Check\n"
        "---------------------------------\n"
        f"Selected Environment OK? {suitability_line}\n"
        f"Notes: {advice.suitability_notes}\n"
        f"Recommended Environment: {advice.recommended_environment}\n"
        f"Recommended Location: {advice.recommended_location}\n"
        f"Recommended Soil Type: {advice.recommended_soil_type}\n\n"
        "Estimated Life Cycle Timeline\n"
        "---------------------------------\n"
        f"{timeline_text}\n\n"
        "AI Life Cycle & Care Advice\n"
        "---------------------------------\n"
        f"Current Stage: {advice.current_stage}\n"
        f"Confidence: {advice.confidence}\n\n"
        "Care:\n"
        f"{care_text}\n\n"
        "Red Flags:\n"
        f"{red_flags_text}\n"
    )

    print(output)

    safe_plant = (plant_name or "plant").strip().replace(" ", "_")
    filename = f"{safe_plant}_lifecycle_{datetime.now().strftime('%Y-%m-%d_%H-%M')}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\nSaved advice to: {filename}")
