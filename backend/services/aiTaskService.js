// services/aiTaskService.js
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createTask } from "../models/taskModel.js";
import { supabase } from "../config/supabaseClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateAITask = async (farmer, crop, weather) => {
  return new Promise((resolve, reject) => {
    // ai_service lives one level above the backend folder
    const script = path.join(__dirname, "..", "..", "ai_service", "ai_task_generator.py");
    const py = spawn("python", [script]);

    const inputData = JSON.stringify({
      name: crop.name,
      stage: crop.stage,
      weather: weather || {},
    });

    let output = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });

    py.stderr.on("data", (err) => {
      console.error("Python AI Error:", err.toString());
    });

    py.on("close", async () => {
      try {
        const task = JSON.parse(output || "{}");
        const type = task.type || "check";

        // Skip if a similar task exists recently or is still open
        const { data: recent } = await supabase
          .from("tasks")
          .select("id, type, completed, created_at")
          .eq("farmer_id", farmer.id)
          .eq("crop_id", crop.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const now = Date.now();
        const shouldSkip = (recent || []).some((t) => {
          if (t.type !== type) return false;
          if (!t.completed) return true; // open similar task
          const createdAt = t.created_at ? new Date(t.created_at).getTime() : 0;
          const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
          return hoursAgo < 36; // avoid re-creating within 36h
        });
        if (shouldSkip) {
          return resolve(null);
        }

        const savedTask = await createTask({
          farmer_id: farmer.id,
          crop_id: crop.id,
          title: task.title || "AI task",
          description: task.description || "",
          type,
          priority: task.priority || "medium",
          due_date: task.due_date,
          progress: typeof task.progress === "number" ? task.progress : 0,
          completed: !!task.completed,
        });

        resolve(savedTask);
      } catch (e) {
        reject(e);
      }
    });

    py.stdin.write(inputData);
    py.stdin.end();
  });
};
