import express from "express";

const router = express.Router();
const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;

const COUNTRY_HINT = "Palestine";

const pickBestLocationMatch = (searchData, userRaw) => {
  if (!Array.isArray(searchData) || searchData.length === 0) return null;

  // 1) Prefer real Palestine
  const byCountry = searchData.find((loc) =>
    loc.country?.toLowerCase().includes(COUNTRY_HINT.toLowerCase())
  );
  if (byCountry) return byCountry;

  // 2) Exact match by name
  const byName = searchData.find((loc) =>
    loc.name?.toLowerCase() === userRaw.toLowerCase()
  );
  if (byName) return byName;

  // 3) fallback
  return searchData[0];
};

const getWeatherForLocation = async (location) => {
  const apiKey = process.env.WEATHERAPI_KEY;
  if (!apiKey || !location) return null;

  try {
    // Search city
    const searchUrl = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(location)}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const match = pickBestLocationMatch(searchData, location);
    const qParam = match ? `${match.lat},${match.lon}` : location;

    // Get weather
    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(qParam)}&aqi=no`;
    const res = await fetch(weatherUrl);
    if (!res.ok) return null;

    const data = await res.json();
    const curr = data.current;

    console.log(
      "[WeatherAPI] INPUT:",
      location,
      " → MATCH:",
      data.location.name,
      ", ",
      data.location.country,
      "TEMP:",
      curr.temp_c
    );

    return {
      provider: "weatherapi",
      location: `${data.location.name}, ${data.location.region}`,
      temperature_c: curr.temp_c,
      humidity: curr.humidity,
      conditions: curr.condition?.text,
      wind_speed_kmh: curr.wind_kph,
      icon: curr.condition?.icon,
      uvIndex: curr.uv
    };
  } catch (err) {
    console.error("Weather error:", err);
    return null;
  }
};


router.get("/current", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Missing query param q" });
    const weather = await getWeatherForLocation(q);
    if (!weather) return res.status(404).json({ error: "Weather not found" });
    console.log("[WeatherAPI] location:", q, "resolved:", weather.location, "tempC:", weather.temperature_c, "conditions:", weather.conditions);
    res.json(weather);
  } catch (err) {
    console.error("Weather route error:", err);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

export default router;
