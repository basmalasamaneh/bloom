import express from "express";
import auth from "../middleware/authMiddleware.js";
import { supabase } from "../config/supabaseClient.js";

const router = express.Router();

// Get my friends (mutual followers)
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // People I follow
    const { data: iFollow } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", userId);

    // People who follow me
    const { data: followMe } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("following_id", userId);

    const followingIds = new Set(iFollow.map(r => r.following_id));
    const followerIds  = new Set(followMe.map(r => r.follower_id));

    // Mutual = friends
    const friends = [...followingIds].filter(id => followerIds.has(id));

    if (friends.length === 0) {
      return res.json({ friends: [] });
    }

    // Load friend profiles
    const { data: friendProfiles } = await supabase
      .from("farmer")
      .select("id, name, avatar, email")
      .in("id", friends);

    res.json({ friends: friendProfiles || [] });

  } catch (err) {
    console.error("friend error:", err);
    res.status(500).json({ error: "Server error fetching friends" });
  }
});

export default router;
