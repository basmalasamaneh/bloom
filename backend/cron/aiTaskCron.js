// cron/aiTaskCron.js
import { supabase } from "../config/supabaseClient.js";
import { generateAITask } from "../services/aiTaskService.js";

const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;

const getWeatherForLocation = async (location) => {
  if (!WEATHERAPI_KEY || !location) return null;
  try {
    const searchUrl = `https://api.weatherapi.com/v1/search.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(
      location
    )}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const match = searchData?.[0];
    const qParam = match ? `${match.lat},${match.lon}` : location;

    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(
      qParam
    )}&aqi=no`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const locName = data?.location
      ? `${data.location.name}, ${data.location.region || data.location.country || ""}`.trim().replace(/,\s*$/, "")
      : location;
    const current = data?.current || {};

    return {
      provider: "weatherapi",
      location: locName || location,
      temperature_c: current.temp_c ?? null,
      humidity: current.humidity ?? null,
      conditions: current.condition?.text ?? "",
      wind_speed_kmh: current.wind_kph ?? null,
      icon: current.condition?.icon ?? null,
      uv_index: current.uv ?? null,
    };
  } catch (err) {
    console.error("WeatherAPI fetch failed:", err);
    return null;
  }
};

const runAITaskGeneration = async () => {
  try {
    console.log("Running AI task generator");

    const { data: farmers, error: farmerErr } = await supabase.from("farmer").select("*");
    const { data: crops, error: cropErr } = await supabase.from("crops").select("*");

    if (farmerErr) throw farmerErr;
    if (cropErr) throw cropErr;

    for (const farmer of farmers || []) {
      const myCrops = (crops || []).filter((c) => c.farmer_id === farmer.id);

      for (const crop of myCrops) {
        try {
          const locationGuess = farmer.city || farmer.village || crop.plant_location || null;
          const weather = await getWeatherForLocation(locationGuess);
          console.log(
            "[AI Weather]",
            locationGuess || "unknown",
            weather
              ? `temp=${weather.temperature_c}C, cond=${weather.conditions}, hum=${weather.humidity}, wind=${weather.wind_speed_kmh}`
              : "no weather data"
          );
          await generateAITask(farmer, crop, weather);
          console.log(`Task generated for ${farmer.name} + ${crop.name}`);
        } catch (err) {
          console.error("AI Task Generation Error:", err);
        }
      }
    }
  } catch (err) {
    console.error("runAITaskGeneration failed:", err);
  }
};

export default runAITaskGeneration;
