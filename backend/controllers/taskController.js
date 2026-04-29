// controllers/taskController.js
import { createTask, getTasksByFarmer, completeTask } from "../models/taskModel.js";

export const addTask = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const taskData = req.body || {};

    const newTask = await createTask({
      farmer_id,
      ...taskData,
      source: taskData.source || "manual",
    });

    res.json(newTask);
  } catch (err) {
    console.error("Error adding task", err);
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const getMyTasks = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const tasks = await getTasksByFarmer(farmerId);
    res.json(tasks);
  } catch (err) {
    console.error("Error loading tasks", err);
    res.status(500).json({ error: "Error loading tasks" });
  }
};

export const markCompleted = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { taskId } = req.params;

    const updated = await completeTask(taskId, farmerId);
    res.json(updated);
  } catch (err) {
    console.error("Error completing task", err);
    res.status(500).json({ error: "Error completing task" });
  }
};
