// routes/messagesRoutes.js
import express from "express";
import { supabase } from "../config/supabaseClient.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(auth);
const EXPERT_CHAT_PRICE = 25;
const PLATFORM_FEE_RATE = 0.1;

/* ============================================================
   🌿 1) CHECK IF TWO USERS ARE FRIENDS (Mutual Follow)
   ============================================================ */
async function areFriends(userA, userB) {
  const { data: followAB } = await supabase
    .from("followers")
    .select("*")
    .eq("follower_id", userA)
    .eq("following_id", userB);

  const { data: followBA } = await supabase
    .from("followers")
    .select("*")
    .eq("follower_id", userB)
    .eq("following_id", userA);

  return followAB?.length > 0 && followBA?.length > 0;
}

/* ============================================================
   🌿 2) GET EXISTING CONVERSATION BETWEEN 2 USERS
   (via Supabase RPC: get_conversation_between)
   ============================================================ */
async function getExistingConversation(userA, userB) {
  const { data, error } = await supabase.rpc("get_conversation_between", {
    user1: userA,
    user2: userB,
  });

  if (error) {
    console.error("RPC error:", error);
    return null;
  }

  return data?.length > 0 ? data[0].conversation_id : null;
}

async function getApprovedExpertByFarmerId(expertFarmerId) {
  if (!expertFarmerId) return null;
  const { data, error } = await supabase
    .from("experts")
    .select("id, farmer_id, chat_price, status, specialization")
    .eq("farmer_id", expertFarmerId)
    .eq("status", "approved")
    .limit(1);

  if (error) {
    console.error("Fetch expert by farmer error:", error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

async function getApprovedExpertByAnyId(expertKey) {
  if (!expertKey) return null;
  const key =
    Number.isFinite(Number(expertKey)) && String(expertKey).trim() !== ""
      ? Number(expertKey)
      : expertKey;
  const byFarmer = await getApprovedExpertByFarmerId(key);
  if (byFarmer) return byFarmer;

  const { data, error } = await supabase
    .from("experts")
    .select("id, farmer_id, chat_price, status, specialization")
    .eq("id", key)
    .eq("status", "approved")
    .limit(1);

  if (error) {
    console.error("Fetch expert by id error:", error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

async function hasActiveExpertAccess(buyerId, expertFarmerId) {
  if (!buyerId || !expertFarmerId) return false;
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("expert_chat_purchases")
    .select("id, status, expires_at")
    .eq("buyer_id", buyerId)
    .eq("expert_farmer_id", expertFarmerId)
    .eq("status", "paid")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Expert access lookup error:", error);
    return false;
  }

  return data && data.length > 0;
}

async function isApprovedExpertUser(farmerId) {
  const expert = await getApprovedExpertByFarmerId(farmerId);
  return !!expert;
}

async function getApprovedExpertsForFarmers(farmerIds) {
  if (!Array.isArray(farmerIds) || farmerIds.length === 0) return [];
  const { data, error } = await supabase
    .from("experts")
    .select("id, farmer_id, status")
    .in("farmer_id", farmerIds)
    .eq("status", "approved");

  if (error) {
    console.error("Fetch experts for farmers error:", error);
    return [];
  }

  return data || [];
}
/* ============================================================
   🌿 3) CREATE/START A CONVERSATION (ONLY IF FRIENDS)
   POST /api/messages/create
   ============================================================ */
router.post("/create", async (req, res) => {
  try {
    const userId = req.user.id; // this maps to farmers.id
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ error: "Missing otherUserId" });
    }

    const otherId = Number(otherUserId);
    const otherIsExpert = await isApprovedExpertUser(otherId);
    const meIsExpert = await isApprovedExpertUser(userId);

    if (otherIsExpert && meIsExpert) {
      const access = await hasActiveExpertAccess(userId, otherId);
      if (!access) {
        return res.status(402).json({
          error: "PAYMENT_REQUIRED",
          expertId: otherId,
          price: Number(EXPERT_CHAT_PRICE),
        });
      }
    } else if (otherIsExpert && !meIsExpert) {
      const access = await hasActiveExpertAccess(userId, otherId);
      if (!access) {
        return res.status(402).json({
          error: "PAYMENT_REQUIRED",
          expertId: otherId,
          price: Number(EXPERT_CHAT_PRICE),
        });
      }
    } else if (meIsExpert && !otherIsExpert) {
      const access = await hasActiveExpertAccess(otherId, userId);
      if (!access) {
        return res
          .status(403)
          .json({ error: "This user has not unlocked your expert chat." });
      }
    } else {
      // MUST be friends (mutual follow)
      const isFriend = await areFriends(userId, otherId);
      if (!isFriend) {
        return res
          .status(403)
          .json({ error: "Not friends; cannot start chat." });
      }
    }

    // 1️⃣ Check if a conversation already exists between us
    let conversationId = await getExistingConversation(userId, otherUserId);

    if (conversationId) {
      // 2️⃣ Ensure BOTH users are actually registered as participants
      const { error: upsertErr } = await supabase
        .from("conversation_participants")
        .upsert(
          [
            { conversation_id: conversationId, farmer_id: userId },
            { conversation_id: conversationId, farmer_id: otherUserId },
          ],
          { onConflict: "conversation_id,farmer_id" }
        );

      if (upsertErr) {
        console.error("Upsert participants error:", upsertErr);
        return res
          .status(500)
          .json({ error: "Failed to ensure conversation participants" });
      }

      // ✅ Return the existing conversation (now fixed)
      return res.json({ conversationId });
    }

    // 3️⃣ No existing conversation → create a new one
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (convoErr) {
      console.error("Create conversation error:", convoErr);
      return res.status(500).json({ error: "Failed to create conversation" });
    }

    conversationId = convo.id;

    // 4️⃣ Add both participants using farmer_id
    const { error: partErr } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: conversationId, farmer_id: userId },
        { conversation_id: conversationId, farmer_id: otherUserId },
      ]);

    if (partErr) {
      console.error("Insert participants error:", partErr);
      return res
        .status(500)
        .json({ error: "Failed to register conversation participants" });
    }

    res.json({ conversationId });
  } catch (err) {
    console.error("Create chat error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* 
    4) GET USER'S CONVERSATIONS

   */
router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user.id;
    const meIsExpert = await isApprovedExpertUser(userId);

    if (meIsExpert) {
      const { data: purchases, error: purchaseErr } = await supabase
        .from("expert_chat_purchases")
        .select("buyer_id, expires_at")
        .eq("expert_farmer_id", userId)
        .eq("status", "paid");

      if (purchaseErr) {
        console.warn("Expert purchases lookup error:", purchaseErr);
      } else {
        const now = Date.now();
        for (const purchase of purchases || []) {
          if (
            purchase.expires_at &&
            new Date(purchase.expires_at).getTime() <= now
          ) {
            continue;
          }
          const buyerId = purchase.buyer_id;
          if (!buyerId) continue;

          let conversationId = await getExistingConversation(userId, buyerId);
          if (conversationId) {
            const { error: upsertErr } = await supabase
              .from("conversation_participants")
              .upsert(
                [
                  { conversation_id: conversationId, farmer_id: userId },
                  { conversation_id: conversationId, farmer_id: buyerId },
                ],
                { onConflict: "conversation_id,farmer_id" }
              );
            if (upsertErr) {
              console.warn("Upsert participants error:", upsertErr);
            }
          } else {
            const { data: convo, error: convoErr } = await supabase
              .from("conversations")
              .insert({})
              .select("id")
              .single();
            if (convoErr) {
              console.warn("Create conversation error:", convoErr);
              continue;
            }

            conversationId = convo.id;
            const { error: partErr } = await supabase
              .from("conversation_participants")
              .insert([
                { conversation_id: conversationId, farmer_id: userId },
                { conversation_id: conversationId, farmer_id: buyerId },
              ]);
            if (partErr) {
              console.warn("Insert participants error:", partErr);
            }
          }
        }
      }
    }

    const { data, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("farmer_id", userId); // 🔁 fixed: farmer_id

    if (error) throw error;

    const convIds = data.map((c) => c.conversation_id);

    if (convIds.length === 0) {
      return res.json([]);
    }

    const { data: convos } = await supabase
      .from("conversations")
      .select("id, created_at")
      .in("id", convIds)
      .order("created_at", { ascending: false });

    const { data: participants, error: participantsError } = await supabase
      .from("conversation_participants")
      .select(
        "conversation_id, farmer_id, farmer:farmer_id (id, name, email, avatar, bio, city, village, is_expert, expert_verified, expert_field, expert_years)"
      )
      .in("conversation_id", convIds);

    if (participantsError) throw participantsError;

    const participantsMap = new Map();
    (participants || []).forEach((entry) => {
      const list = participantsMap.get(entry.conversation_id) || [];
      list.push(entry);
      participantsMap.set(entry.conversation_id, list);
    });

    const payload = (convos || []).map((convo) => ({
      ...convo,
      participants: participantsMap.get(convo.id) || [],
    }));

    res.json({ meIsExpert, conversations: payload });
  } catch (err) {
    console.error("Get conv error:", err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

router.get("/paid-users", async (req, res) => {
  try {
    const expertId = req.user.id;
    const meIsExpert = await isApprovedExpertUser(expertId);
    if (!meIsExpert) return res.json([]);

    const { data: purchases, error } = await supabase
      .from("expert_chat_purchases")
      .select(
        "buyer_id, expires_at, status, buyer:buyer_id (id, name, avatar, email, city, village)"
      )
      .eq("expert_farmer_id", expertId)
      .eq("status", "paid");

    if (error) throw error;

    const now = Date.now();
    const activePurchases = (purchases || []).filter(
      (p) => !p.expires_at || new Date(p.expires_at).getTime() > now
    );

    const out = [];
    for (const purchase of activePurchases) {
      const buyerId = purchase.buyer_id;
      if (!buyerId) continue;

      let conversationId = await getExistingConversation(expertId, buyerId);
      if (conversationId) {
        const { error: upsertErr } = await supabase
          .from("conversation_participants")
          .upsert(
            [
              { conversation_id: conversationId, farmer_id: expertId },
              { conversation_id: conversationId, farmer_id: buyerId },
            ],
            { onConflict: "conversation_id,farmer_id" }
          );
        if (upsertErr) {
          console.warn("Upsert participants error:", upsertErr);
        }
      } else {
        const { data: convo, error: convoErr } = await supabase
          .from("conversations")
          .insert({})
          .select("id")
          .single();
        if (convoErr) {
          console.warn("Create conversation error:", convoErr);
        } else {
          conversationId = convo.id;
          const { error: partErr } = await supabase
            .from("conversation_participants")
            .insert([
              { conversation_id: conversationId, farmer_id: expertId },
              { conversation_id: conversationId, farmer_id: buyerId },
            ]);
          if (partErr) {
            console.warn("Insert participants error:", partErr);
          }
        }
      }

      out.push({
        id: purchase.buyer?.id || buyerId,
        name: purchase.buyer?.name || "User",
        avatar: purchase.buyer?.avatar || null,
        email: purchase.buyer?.email || null,
        city: purchase.buyer?.city || null,
        village: purchase.buyer?.village || null,
        conversationId,
      });
    }

    res.json(out);
  } catch (err) {
    console.error("Get paid users error:", err);
    res.status(500).json({ error: "Failed to load paid users" });
  }
});

/* ============================================================
   ?? 5) LIST APPROVED EXPERTS + UNLOCK STATE
   GET /api/messages/experts
   ============================================================ */
router.get("/experts", async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: experts, error } = await supabase
      .from("experts")
      .select(
        "farmer_id, specialization, experience_years, chat_price, status, created_at, farmer:farmer_id (id, name, avatar, city, village, bio, email, expert_years, expert_field)"
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: purchases, error: pErr } = await supabase
      .from("expert_chat_purchases")
      .select("expert_farmer_id, status, expires_at")
      .eq("buyer_id", userId)
      .eq("status", "paid");

    if (pErr) throw pErr;

    const now = Date.now();
    const activeSet = new Set(
      (purchases || [])
        .filter((p) => !p.expires_at || new Date(p.expires_at).getTime() > now)
        .map((p) => String(p.expert_farmer_id))
    );

    const out = (experts || [])
      .filter((expert) => String(expert.farmer_id) !== String(userId))
      .map((expert) => {
        const chatPriceRaw = Number(expert.chat_price);
        const chatPrice =
          Number.isFinite(chatPriceRaw) && chatPriceRaw > 0
            ? chatPriceRaw
            : Number(EXPERT_CHAT_PRICE);
        return {
          id: expert.farmer?.id || expert.farmer_id,
          name: expert.farmer?.name || "Expert",
          avatar: expert.farmer?.avatar || null,
          bio: expert.farmer?.bio || null,
          city: expert.farmer?.city || null,
          village: expert.farmer?.village || null,
          email: expert.farmer?.email || null,
          specialization: expert.specialization || expert.farmer?.expert_field || null,
          experience_years:
            expert.experience_years ?? expert.farmer?.expert_years ?? null,
          chat_price: chatPrice,
          locked: !activeSet.has(String(expert.farmer_id)),
        };
      });

    res.json(out);
  } catch (err) {
    console.error("GET /experts error:", err);
    res.status(500).json({ error: "Failed to load experts" });
  }
});

/* ============================================================
   ?? 6) PURCHASE EXPERT CHAT (SIMULATED PAYMENT)
   POST /api/messages/experts/:expertFarmerId/purchase
   ============================================================ */
router.post("/experts/:expertFarmerId/purchase", async (req, res) => {
  try {
    const buyerId = req.user.id;
    const expertKey = req.params.expertFarmerId;

    const expert = await getApprovedExpertByAnyId(expertKey);
    if (!expert) {
      return res.status(404).json({ error: "Expert not found." });
    }
    const expertFarmerId = expert.farmer_id;

    const existing = await hasActiveExpertAccess(buyerId, expertFarmerId);
    if (existing) return res.json({ ok: true, alreadyPaid: true });

    const amountRaw = Number(expert.chat_price);
    const amount =
      Number.isFinite(amountRaw) && amountRaw > 0
        ? amountRaw
        : Number(EXPERT_CHAT_PRICE);
    const platformFee = Number((amount * PLATFORM_FEE_RATE).toFixed(2));

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("expert_chat_purchases")
      .insert({
        buyer_id: buyerId,
        expert_farmer_id: expertFarmerId,
        amount,
        status: "paid",
        paid_at: new Date().toISOString(),
        expires_at: expiresAt,
      });

    if (error) throw error;

    let conversationId = await getExistingConversation(buyerId, expertFarmerId);
    if (conversationId) {
      const { error: upsertErr } = await supabase
        .from("conversation_participants")
        .upsert(
          [
            { conversation_id: conversationId, farmer_id: buyerId },
            { conversation_id: conversationId, farmer_id: expertFarmerId },
          ],
          { onConflict: "conversation_id,farmer_id" }
        );
      if (upsertErr) {
        console.error("Upsert participants error:", upsertErr);
      }
    } else {
      const { data: convo, error: convoErr } = await supabase
        .from("conversations")
        .insert({})
        .select("id")
        .single();
      if (convoErr) {
        console.error("Create conversation error:", convoErr);
      } else {
        conversationId = convo.id;
        const { error: partErr } = await supabase
          .from("conversation_participants")
          .insert([
            { conversation_id: conversationId, farmer_id: buyerId },
            { conversation_id: conversationId, farmer_id: expertFarmerId },
          ]);
        if (partErr) {
          console.error("Insert participants error:", partErr);
        }
      }
    }

    res.json({
      ok: true,
      platformFee,
      expertEarnings: amount - platformFee,
      conversationId,
    });
    if (conversationId) {
      const recipient = await supabase
        .from("farmer")
        .select("name")
        .eq("id", expertFarmerId)
        .single();
      const buyer = await supabase
        .from("farmer")
        .select("name")
        .eq("id", buyerId)
        .single();
      const buyerName = buyer.data?.name || "Someone";
      await supabase.from("notifications").insert({
        farmer_id: expertFarmerId,
        title: "New expert chat purchase",
        message: `${buyerName} unlocked your expert chat.`,
        type: "expert_purchase",
        metadata: {
          conversation_id: conversationId,
          actor_id: buyerId,
          actor_name: buyerName,
        },
      });
    }
  } catch (err) {
    console.error("purchase error:", err);
    res.status(500).json({ error: "Failed to unlock expert chat" });
  }
});

/* 
    7) GET MESSAGES IN A CONVERSATION
  */
router.get("/:conversationId", async (req, res) => {
  try {
    const userId = req.user.id;
    const convoId = req.params.conversationId;

    // Ensure user is in conversation
    const { data: part } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", convoId)
      .eq("farmer_id", userId)
      .single();

    if (!part) {
      return res
        .status(403)
        .json({ error: "Not a participant in this conversation." });
    }

    const { data: participants, error: participantsError } = await supabase
      .from("conversation_participants")
      .select("farmer_id")
      .eq("conversation_id", convoId);

    if (participantsError) {
      console.error("Participants lookup error:", participantsError);
      return res.status(500).json({ error: "Failed to load conversation." });
    }

    const participantIds = (participants || []).map((p) => p.farmer_id);
    const experts = await getApprovedExpertsForFarmers(participantIds);
    if (experts.length === 1) {
      const expertFarmerId = experts[0].farmer_id;
      if (String(userId) !== String(expertFarmerId)) {
        const allowed = await hasActiveExpertAccess(userId, expertFarmerId);
        if (!allowed) {
          return res
            .status(403)
            .json({ error: "Expert chat locked. Please unlock first." });
        }
      } else {
        const otherId = participantIds.find(
          (id) => String(id) !== String(expertFarmerId)
        );
        if (otherId) {
          const allowed = await hasActiveExpertAccess(otherId, expertFarmerId);
          if (!allowed) {
            return res
              .status(403)
              .json({ error: "This user has not unlocked your expert chat." });
          }
        }
      }
    } else if (experts.length === 2) {
      const otherExpert = experts.find(
        (expert) => String(expert.farmer_id) !== String(userId)
      );
      if (otherExpert) {
        const allowed = await hasActiveExpertAccess(userId, otherExpert.farmer_id);
        if (!allowed) {
          return res
            .status(403)
            .json({ error: "Expert chat locked. Please unlock first." });
        }
      }
    }

    const { data: msgs, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json(msgs);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/* ============================================================
   ?? 8) SEND MESSAGE (store + broadcast WebSocket)
   POST /api/messages/send
   ============================================================ */
router.post("/send", async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId, content } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const { data: participants, error: participantsError } = await supabase
      .from("conversation_participants")
      .select("farmer_id")
      .eq("conversation_id", conversationId);

    if (participantsError) {
      console.error("Participants lookup error:", participantsError);
      return res.status(500).json({ error: "Failed to send message." });
    }

    const participantIds = (participants || []).map((p) => p.farmer_id);
    const isParticipant = participantIds.some(
      (id) => String(id) === String(senderId)
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ error: "Not a participant in this conversation." });
    }

    const recipientIds = participantIds.filter(
      (farmerId) => String(farmerId) !== String(senderId)
    );

    const experts = await getApprovedExpertsForFarmers(participantIds);
    if (experts.length === 1) {
      const expertFarmerId = experts[0].farmer_id;
      if (String(senderId) !== String(expertFarmerId)) {
        const allowed = await hasActiveExpertAccess(senderId, expertFarmerId);
        if (!allowed) {
          return res
            .status(403)
            .json({ error: "Expert chat locked. Please unlock first." });
        }
      } else {
        const otherId = participantIds.find(
          (id) => String(id) !== String(expertFarmerId)
        );
        if (otherId) {
          const allowed = await hasActiveExpertAccess(otherId, expertFarmerId);
          if (!allowed) {
            return res
              .status(403)
              .json({ error: "This user has not unlocked your expert chat." });
          }
        }
      }
    } else if (experts.length === 2) {
      const otherExpert = experts.find(
        (expert) => String(expert.farmer_id) !== String(senderId)
      );
      if (otherExpert) {
        const allowed = await hasActiveExpertAccess(
          senderId,
          otherExpert.farmer_id
        );
        if (!allowed) {
          return res
            .status(403)
            .json({ error: "Expert chat locked. Please unlock first." });
        }
      }
    }

    // Store message in DB
    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      })
      .select("*")
      .single();

    if (error) throw error;

    // Prepare broadcast payload (matches frontend handler)
    const payload = {
      type: "new_message",
      conversationId,
      content,
      senderId,
      createdAt: msg.created_at,
    };

    // Broadcast via global WebSocket helper
    if (globalThis.broadcastMessage) {
      globalThis.broadcastMessage(payload);
    }

    if (recipientIds.length > 0) {
      const senderName = req.user?.name || "Someone";
      const notificationRows = recipientIds.map((farmerId) => ({
        farmer_id: farmerId,
        title: "New message",
        message: `${senderName} sent you a message.`,
        type: "message",
        metadata: {
          conversation_id: conversationId,
          message_id: msg.id,
          actor_id: senderId,
          actor_name: senderName,
        },
      }));

      const { error: notifErr } = await supabase
        .from("notifications")
        .insert(notificationRows);
      if (notifErr) {
        console.error("Send message notification error:", notifErr);
      }
    }

    res.json(msg);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

router.post("/contact-seller", async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: "Missing sellerId" });
    }

    const expert = await getApprovedExpertByFarmerId(sellerId);
    if (expert) {
      const allowed = await hasActiveExpertAccess(buyerId, expert.farmer_id || sellerId);
      if (!allowed) {
        return res
          .status(403)
          .json({ error: "Expert chat locked. Please unlock first." });
      }
    }

    // 1️⃣ Check if conversation already exists
    const { data: existing, error: findErr } = await supabase.rpc(
      "get_conversation_between",
      { user1: buyerId, user2: sellerId }
    );

    if (findErr) {
      console.error("RPC error:", findErr);
      return res.status(500).json({ error: "Failed to fetch conversation" });
    }

    if (existing && existing.length > 0) {
      return res.json({ conversationId: existing[0].conversation_id });
    }

    // 2️⃣ Create new conversation
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({ is_group: false })
      .select("id")
      .single();

    if (convoErr) {
      console.error("Create convo error:", convoErr);
      return res.status(500).json({ error: "Failed to create conversation" });
    }

    // 3️⃣ Register participants
    await supabase.from("conversation_participants").insert([
      { conversation_id: convo.id, farmer_id: buyerId },
      { conversation_id: convo.id, farmer_id: sellerId },
    ]);

    return res.json({ conversationId: convo.id });
  } catch (err) {
    console.error("contact-seller error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
