import sys
import os
import json
import base64
import tempfile
from datetime import datetime, timedelta
import requests
import replicate


# --------------------------------------------------
# Image Tools
# --------------------------------------------------
def _data_url_to_file(data_url: str) -> str:
    header, b64data = data_url.split(",", 1)
    suffix = ".png" if "png" in header.lower() else ".jpg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(base64.b64decode(b64data))
    tmp.close()
    return tmp.name


def _resolve_image_path(image_path: str):
    if not image_path:
        return None, False

    if image_path.startswith("data:image"):
        try:
            return _data_url_to_file(image_path), True
        except:
            return None, False

    if os.path.exists(image_path):
        return image_path, False

    return None, False


# --------------------------------------------------
# PLANT ID USING REPLICATE
# --------------------------------------------------
def identify_plant_from_image(image_path: str) -> str:
    token = os.getenv("REPLICATE_API_TOKEN")
    if not token:
        print("Missing REPLICATE_API_TOKEN")
        return "Unknown Plant"

    resolved, cleanup = _resolve_image_path(image_path)
    if not resolved:
        return "Unknown Plant"

    try:
        output = replicate.run(
            "nateraw/plant-id:latest",
            input={"image": open(resolved, "rb")}
        )

        # Example output:
        # {
        #   "predictions": [
        #       { "species": {"scientificNameWithoutAuthor": "Solanum Lycopersicum"} }
        #   ]
        # }

        preds = output.get("predictions", [])
        if preds:
            sci = preds[0]["species"]["scientificNameWithoutAuthor"]
            return sci.replace("_", " ").title()

        return "Unknown Plant"

    except Exception as e:
        print("Replicate Error:", e)
        return "Unknown Plant"

    finally:
        if cleanup and os.path.exists(resolved):
            os.remove(resolved)


# --------------------------------------------------
# Date Helpers
# --------------------------------------------------
def parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y-%m-%d")


def format_date(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


# --------------------------------------------------
# Timeline
# --------------------------------------------------
def generate_timeline(planting_date: datetime):
    stages = {
        "germination": (0, 14),
        "seedling": (14, 28),
        "vegetative": (29, 50),
        "flowering": (51, 65),
        "fruiting": (66, 90),
        "harvest": (91, 120)
    }

    t = {}
    for stage, (s, e) in stages.items():
        t[stage] = {
            "start": format_date(planting_date + timedelta(days=s)),
            "end": format_date(planting_date + timedelta(days=e))
        }
    return t


# --------------------------------------------------
# Weather Summary
# --------------------------------------------------
def weather_summary(w):
    if not w:
        return ""

    parts = []
    if "temperature_c" in w:
        parts.append(f"{w['temperature_c']}°C")
    if "conditions" in w:
        parts.append(w["conditions"])

    if "location" in w:
        return f"Current weather in {w['location']}: {', '.join(parts)}. "
    return f"Current weather: {', '.join(parts)}. "


# --------------------------------------------------
# Irrigation
# --------------------------------------------------
def build_irrigation_plan(name, loc, soil, w=None):
    base = "Keep soil evenly moist."
    freq = "Water 2–3 times a week."

    name = name.lower()
    if "tomato" in name:
        base = "Tomatoes need consistent moisture."
        freq = "Water 3–4 times per week."
    if "cucumber" in name:
        base = "Cucumbers dry quickly."
        freq = "Water 4+ times per week."

    soil_hint = ""
    if "sandy" in soil.lower():
        soil_hint = " Sandy soil drains quickly; water more often."
    elif "clay" in soil.lower():
        soil_hint = " Clay soil retains water longer."

    loc_hint = ""
    if "container" in loc.lower():
        loc_hint = " Containers dry fast; check soil daily."

    return weather_summary(w) + base + " " + freq + soil_hint + loc_hint


# --------------------------------------------------
# Fertilizer
# --------------------------------------------------
def build_fertilizer_plan(name):
    name = name.lower()

    if "tomato" in name:
        return "Use 10-10-10 fertilizer every 2–3 weeks."
    if "cucumber" in name:
        return "Use balanced fertilizer every 3–4 weeks."

    return "Use balanced fertilizer every 3–4 weeks."


# --------------------------------------------------
# Care Tips
# --------------------------------------------------
def build_care_tips(name, loc, w=None):
    base = "Give 6–8 hours of sunlight. Check for pests weekly."

    loc_hint = ""
    if "container" in loc.lower():
        loc_hint = " Rotate containers weekly."

    plant_hint = ""
    name = name.lower()
    if "tomato" in name:
        plant_hint = " Stake tomatoes & prune suckers."
    elif "cucumber" in name:
        plant_hint = " Use a trellis for cucumbers."

    return weather_summary(w) + base + " " + loc_hint + plant_hint


# --------------------------------------------------
# Main Handler
# --------------------------------------------------
def main():
    try:
        raw = sys.stdin.read().strip()
        data = json.loads(raw)

        image = data.get("image_path", "")
        provided = data.get("name", "Plant")

        detected = identify_plant_from_image(image)
        plant_name = detected if detected != "Unknown Plant" else provided

        if "planting_date" not in data:
            raise ValueError("planting_date is required")

        planting_date = parse_date(data["planting_date"])
        soil = data.get("soil_type", "")
        loc = data.get("plant_location", "")
        weather = data.get("weather")

        out = {
            "plant_name": plant_name,
            "detected_name": detected,
            "timeline": generate_timeline(planting_date),
            "irrigation": build_irrigation_plan(plant_name, loc, soil, weather),
            "fertilizer": build_fertilizer_plan(plant_name),
            "care_tips": build_care_tips(plant_name, loc, weather),
            "weather": weather,
        }

        print(json.dumps(out))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    main()
