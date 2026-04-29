import express from "express";
import axios from "axios";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const healthScriptPath = path.join(
  __dirname,
  "../../ai_service/plant_health_analysis.py"
);

const router = express.Router();

const PYTHON = process.env.PYTHON_PATH || "python";
const AI_ENV = {
  ...process.env,
  HF_HOME: process.env.HF_HOME || "C:\\huggingface",
  HF_HUB_CACHE: process.env.HF_HUB_CACHE || "C:\\huggingface\\cache",
};

const runHealthProcess = (payload) =>
  new Promise((resolve, reject) => {
    const aiProcess = spawn(PYTHON, [healthScriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: AI_ENV,
    });

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

// POST /api/ai/chat
// router.post("/chat", async (req, res) => {
//   try {
//     const { message } = req.body;

//     if (!message || !message.trim()) {
//       return res.status(400).json({ error: "Message is required." });
//     }

//     // const ollama = await axios.post("http://localhost:11434/api/generate", {
//     //   model: "llama3.1",
//     //   prompt: message,
//     //   stream: false,
//     // });

//     // const reply = ollama.data.response || "No response received.";


//     // POST /api/ai/chat



//     return res.json({ reply });
//   } catch (err) {
//     console.error("AI error:", err);
//     return res.status(500).json({
//       error: "AI backend error",
//       details: err.message,
//     });
//   }
// });


// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing GEMINI_API_KEY",
        details: "Add GEMINI_API_KEY to backend/.env then restart backend",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // ✅ موديل مجاني/شائع ومتوافق (Gemini 2.0 Flash)
    const modelName = process.env.GEMINI_MODEL || "gemini-3.0-flash-preview";

    const result = await ai.models.generateContent({
      model: modelName,
      contents: message,
    });

    const reply =
      result?.text ||
      result?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      "No response received.";

    return res.json({ reply });
  } catch (err) {
    console.error("Gemini AI error:", err);
    return res.status(500).json({
      error: "AI backend error",
      details: err.message,
    });
  }
});





// POST /api/ai/health
router.post("/health", async (req, res) => {
  try {
    const image =
      req.body?.image ||
      req.body?.image_data ||
      req.body?.imageUrl ||
      req.body?.image_url;

    const payload = {
      plant_name: req.body?.plantName || req.body?.name || "Plant",
      plant_description: req.body?.description || req.body?.notes || "",
      environment: req.body?.environment || "",
      location: req.body?.plantLocation || req.body?.location || "",
      image_data: image,
    };

    const { parsed } = await runHealthProcess(payload);
    return res.json({ success: true, analysis: parsed });
  } catch (err) {
    console.error("AI health analysis error:", err);
    res.status(500).json({
      error: err.message || "Plant health analysis failed",
      details: err.raw || err.details || null,
    });
  }
});

export default router;
