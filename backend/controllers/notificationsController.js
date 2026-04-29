import { supabase } from "../config/supabaseClient.js";

export const getNotifications = async (req, res) => {
  const farmer_id = req.params.farmer_id;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("farmer_id", farmer_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};
