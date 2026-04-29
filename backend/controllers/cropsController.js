// FILE: controllers/cropsController.js

import { calculateStageAndProgress } from "../utils/cropStageCalculator.js";
import { supabase } from "../config/supabaseClient.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pythonScriptPath = path.join(
  __dirname,
  "../../ai_service/plant_ai_lifecycle.py"
);

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

const runAiProcess = (payload) =>
  new Promise((resolve, reject) => {
    const aiProcess = spawn("python", [pythonScriptPath]);

    let aiResult = "";
    let aiError = "";

    aiProcess.stdout.on("data", (chunk) => {
      aiResult += chunk.toString();
    });
    aiProcess.stderr.on("data", (chunk) => {
      aiError += chunk.toString();
    });

    aiProcess.on("close", (code) => {
      if (!aiResult.trim()) {
        return reject({
          message: "AI returned no output",
          details: aiError || null,
          exit_code: code,
        });
      }

      let parsed;
      try {
        parsed = JSON.parse(aiResult);
      } catch (e) {
        return reject({
          message: "AI returned invalid JSON",
          raw: aiResult,
          details: aiError || null,
          exit_code: code,
        });
      }

      if (parsed?.error) {
        return reject({
          message: parsed.error,
          raw: aiResult,
          details: aiError || null,
          exit_code: code,
        });
      }

      return resolve({ parsed, exit_code: code });
    });

    aiProcess.stdin.write(JSON.stringify(payload));
    aiProcess.stdin.end();
  });


// --------------------------------------------------
// ADD NEW CROP + AI PROCESSING
// --------------------------------------------------

export const addCrop = async (req, res) => {
  try {
    const {
      farmer_id,
      name,
      planting_date,
      soil_type,
      plant_location,
      environment,
      image_url,
    } = req.body || {};

    if (!farmer_id || !name || !planting_date) {
      return res.status(400).json({
        error: "farmer_id, name, and planting_date are required",
      });
    }

    let userLocation = plant_location || null;

    try {
      if (farmer_id) {
        const { data: farmerRow } = await supabase
          .from("farmer")
          .select("city, village")
          .eq("id", farmer_id)
          .single();

        if (farmerRow) {
          userLocation =
            farmerRow.city || farmerRow.village || userLocation || null;
        }
      }
    } catch (err) {
      console.error("Failed to load farmer for weather:", err);
    }

    const weather = await getWeatherForLocation(userLocation);

      const { data: crop, error: cropErr } = await supabase
      .from("crops")
      .insert([
        {
          farmer_id,
          name,
          planting_date,
          soil_type,
          plant_location,
          image_url,
          stage: "Germination",
          progress: 0,
        },
      ])
      .select()
      .single();

    if (cropErr) {
      console.error("Supabase Insert Error:", cropErr);
      return res.status(500).json({ error: cropErr.message });
    }

    let parsed = req.body?.ai_preview;
    if (!parsed || typeof parsed !== "object") {
      const aiPayload = {
        name,
        planting_date,
        soil_type,
        plant_location,
        environment,
        image_path: image_url,
        location: userLocation,
        weather,
      };

      try {
        ({ parsed } = await runAiProcess(aiPayload));
      } catch (err) {
        console.error("AI error:", err);
        return res.status(500).json({
          error: err.message || "AI error",
          raw: err.raw || null,
          details: err.details || null,
          exit_code: err.exit_code,
        });
      }
    }

    const timelineItems = Array.isArray(parsed.timeline_items)
      ? parsed.timeline_items
      : Array.isArray(parsed.timeline)
      ? parsed.timeline
      : null;

    const timeline = parsed.timeline || {};

    const { error: aiErr } = await supabase.from("crop_ai_data").insert([
      {
        crop_id: crop.id,

        timeline_items: timelineItems,

        germination_start: timeline?.germination?.start ?? null,
        germination_end: timeline?.germination?.end ?? null,

        seedling_start: timeline?.seedling?.start ?? null,
        seedling_end: timeline?.seedling?.end ?? null,

        vegetative_start: timeline?.vegetative?.start ?? null,
        vegetative_end: timeline?.vegetative?.end ?? null,

        flowering_start: timeline?.flowering?.start ?? null,
        flowering_end: timeline?.flowering?.end ?? null,

        fruiting_start: timeline?.fruiting?.start ?? null,
        fruiting_end: timeline?.fruiting?.end ?? null,

        harvest_start: timeline?.harvest?.start ?? null,
        harvest_end: timeline?.harvest?.end ?? null,

        irrigation: parsed.irrigation,
        fertilizer: parsed.fertilizer,
        care_tips: parsed.care_tips,
      },
    ]);

    if (aiErr) {
      console.error("Supabase AI insert error:", aiErr);
      return res.status(500).json({ error: aiErr.message });
    }

    res.json({
      success: true,
      crop,
      ai: parsed,
      weather,
    });
  } catch (error) {
    console.error("addCrop Controller Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --------------------------------------------------
// PREVIEW AI SUITABILITY (NO DB WRITE)
// --------------------------------------------------

export const previewCropAdvice = async (req, res) => {
  try {
    const {
      farmer_id,
      name,
      planting_date,
      soil_type,
      plant_location,
      environment,
      image_url,
    } = req.body || {};

    if (!name || !planting_date) {
      return res.status(400).json({
        error: "name and planting_date are required",
      });
    }

    let userLocation = plant_location || null;

    try {
      if (farmer_id) {
        const { data: farmerRow } = await supabase
          .from("farmer")
          .select("city, village")
          .eq("id", farmer_id)
          .single();

        if (farmerRow) {
          userLocation =
            farmerRow.city || farmerRow.village || userLocation || null;
        }
      }
    } catch (err) {
      console.error("Failed to load farmer for weather:", err);
    }

    const weather = await getWeatherForLocation(userLocation);

    const aiPayload = {
      name,
      planting_date,
      soil_type,
      plant_location,
      environment,
      image_path: image_url,
      location: userLocation,
      weather,
    };

    try {
      const { parsed } = await runAiProcess(aiPayload);
      return res.json({ success: true, ai: parsed, weather });
    } catch (err) {
      console.error("AI preview error:", err);
      return res.status(500).json({
        error: err.message || "AI error",
        raw: err.raw || null,
        details: err.details || null,
        exit_code: err.exit_code,
      });
    }
  } catch (error) {
    console.error("previewCropAdvice Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// --------------------------------------------------
// GET SINGLE CROP + AI DATA
// --------------------------------------------------

export const getCropById = async (req, res) => {
  try {
    const cropId = req.params.id;

    const { data: crop, error: cropErr } = await supabase
      .from("crops")
      .select("*")
      .eq("id", cropId)
      .single();

    if (cropErr) {
      return res.status(404).json({ error: "Crop not found" });
    }

    const { data: ai, error: aiErr } = await supabase
      .from("crop_ai_data")
      .select("*")
      .eq("crop_id", cropId)
      .single();

    if (aiErr) {
      return res
        .status(404)
        .json({ error: "AI data not found for crop" });
    }

    const { currentStage, progress } = calculateStageAndProgress(ai);

    const stageChanged = crop.stage !== currentStage;

    if (stageChanged || crop.progress !== progress) {
      await supabase
        .from("crops")
        .update({
          stage: currentStage,
          progress,
        })
        .eq("id", cropId);
    }

    if (stageChanged) {
      await supabase.from("notifications").insert([
        {
          farmer_id: crop.farmer_id,
          crop_id: crop.id,
          title: `Your crop entered the ${currentStage} stage!`,
          message: `${crop.name} has now reached the ${currentStage} phase.`,
          type: "stage_update",
        },
      ]);
    }

    let userLocation = crop.plant_location || null;

    try {
      if (crop.farmer_id) {
        const { data: farmerRow } = await supabase
          .from("farmer")
          .select("city, village")
          .eq("id", crop.farmer_id)
          .single();

        if (farmerRow) {
          userLocation =
            farmerRow.city || farmerRow.village || userLocation || null;
        }
      }
    } catch (err) {
      console.error("getCropById farmer weather error:", err);
    }

    const weather = await getWeatherForLocation(userLocation);

    const updatedCrop = {
      ...crop,
      stage: currentStage,
      progress,
    };

    res.json({ crop: updatedCrop, ai, weather });
  } catch (error) {
    console.error("getCropById Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --------------------------------------------------
// GET ALL CROPS FOR ONE FARMER
// --------------------------------------------------

export const getCropsForFarmer = async (req, res) => {
  try {
    const farmer_id = req.params.farmer_id;

    const { data, error } = await supabase
      .from("crops")
      .select("*")
      .eq("farmer_id", farmer_id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("getCropsForFarmer Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --------------------------------------------------
// DELETE CROP + RELATED AI DATA
// --------------------------------------------------

export const deleteCrop = async (req, res) => {
  try {
    const cropId = Number(req.params.id);
    if (!cropId) {
      return res.status(400).json({ error: "Crop id is required" });
    }

    const { error: aiErr } = await supabase
      .from("crop_ai_data")
      .delete()
      .eq("crop_id", cropId);
    if (aiErr) {
      console.error("Failed to delete crop AI data:", aiErr);
      return res.status(500).json({ error: "Failed to delete crop AI data" });
    }

    const { error: cropErr } = await supabase
      .from("crops")
      .delete()
      .eq("id", cropId);

    if (cropErr) {
      console.error("Failed to delete crop:", cropErr);
      return res.status(500).json({ error: "Failed to delete crop" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("deleteCrop Error:", error);
    res.status(500).json({ error: error.message });
  }
};
