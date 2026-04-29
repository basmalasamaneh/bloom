// models/taskModel.js
import { supabase } from "../config/supabaseClient.js";

export const createTask = async (task) => {
  const {
    farmer_id,
    crop_id,
    title,
    task: taskTitle,
    description = "",
    type = "check",
    priority = "medium",
    due_date = null,
    progress = 0,
    completed = false,
  } = task || {};

  const payload = {
    farmer_id,
    crop_id: crop_id || null,
    title: title || taskTitle || "Task",
    description,
    type,
    priority,
    due_date,
    progress: typeof progress === "number" ? progress : 0,
    completed: !!completed,
  };

  const { data, error } = await supabase.from("tasks").insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const getTasksByFarmer = async (farmerId) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("farmer_id", farmerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

export const completeTask = async (taskId, farmerId) => {
  const taskIdNum = Number(taskId);
  const farmerIdNum = Number(farmerId);

  const { data, error } = await supabase
    .from("tasks")
    .update({ completed: true })
    .eq("id", taskIdNum)
    .eq("farmer_id", farmerIdNum)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
