import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiSend } from "react-icons/fi";
import Header from "../components/Header";

const BLOOM = {
  forest: "#2E8B57",
  leaf: "#6FCF97",
  yellow: "#F2C94C",
  cream: "#FAF9F6",
  sage: "#E8F3E8",
  olive: "#1B4332",
  text: "#333333",
  sub: "#4F6F52",
  orange: "#FF6E00",
};

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const TOKEN_KEY = "token";
const resolveWsUrl = () => {
  if (process.env.REACT_APP_WS_URL) return process.env.REACT_APP_WS_URL;
  try {
    const api = new URL(API_BASE);
    const isHttps = api.protocol === "https:";
    return `${isHttps ? "wss" : "ws"}://${api.host}/ws/chat`;
  } catch {
    if (typeof window !== "undefined" && window.location) {
      const isHttps = window.location.protocol === "https:";
      return `${isHttps ? "wss" : "ws"}://${window.location.host}/ws/chat`;
    }
    return "ws://localhost:5000/ws/chat";
  }
};
const WS_URL = resolveWsUrl();

const resolveAssetUrl = (path) => {
  if (typeof path !== "string" || path.trim() === "") return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) {
    try {
      const api = new URL(API_BASE);
      return `${api.origin}${path}`;
    } catch {
      return path;
    }
  }
  return path;
};

const isImageSrc = (value) =>
  typeof value === "string" &&
  (value.startsWith("http://") ||
    value.startsWith("https://") ||
    (value.startsWith("/") && value.length > 1));

const safeParseJwt = (token) => {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const buildWsUrl = (token) => {
  try {
    const url = new URL(WS_URL);
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return `${WS_URL}?token=${encodeURIComponent(token)}`;
  }
};

// FRIENDS
const fallbackFriends = [];

// EXPERTS (LOCKED)
const fallbackExperts = [
  {
    id: "expert-1",
    name: "Expert Advisor",
    role: "Agronomy Expert",
    avatar: "EX",
    locked: true,
    chatPrice: 25,
    intro: {
      bio: "Experienced agronomy advisor.",
      specialty: ["Soil Health", "Crop Planning"],
      rating: 0,
    },
  },
];

const DEFAULT_CONVERSATION_ID = null;

// MESSAGES (empty until conversations are fetched/created)
const initialMessages = {};
const EMPTY_PAYMENT_INFO = {
  cardNumber: "",
  cardName: "",
  expiryDate: "",
  cvv: "",
  saveCard: false,
};

export default function BloomChatPage() {
  // 🔥 SECTION 1 — State + Refs (add at the top inside your component)
  const [activeConversationId, setActiveConversationId] = useState(DEFAULT_CONVERSATION_ID);
  const [messages, setMessages] = useState(initialMessages);
  const wsRef = useRef(null);
  
  // You MUST have the logged-in user ID
   // Normalized current user ID (string)
  let currentUserId = null;
  let currentUserIsExpert = false;
  try {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (stored && stored.id != null) {
      currentUserId = String(stored.id);
    }
    currentUserIsExpert = Boolean(stored?.expert_verified || stored?.is_expert);
  } catch {
    currentUserId = null;
    currentUserIsExpert = false;
  }

  
  // Existing state variables
  const [friends, setFriends] = useState(fallbackFriends);
  const [paidContacts, setPaidContacts] = useState([]);
  const [experts, setExperts] = useState(fallbackExperts);
  const [meIsExpert, setMeIsExpert] = useState(Boolean(currentUserIsExpert));
  const [loadingExperts, setLoadingExperts] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [draft, setDraft] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(EMPTY_PAYMENT_INFO);
  const [paymentError, setPaymentError] = useState("");
  const [socketState, setSocketState] = useState("idle"); // idle | no-token | connecting | connected | error | disconnected
  const [connectionError, setConnectionError] = useState("");
  const userIdRef = useRef(null);
  const meIsExpertRef = useRef(Boolean(currentUserIsExpert));
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const keepAliveTimerRef = useRef(null);
  const sellerContactRef = useRef(null);
  const chatParamHandled = useRef(null);
  const conversationsLoadedRef = useRef(false);
  const location = useLocation();
  const [chatParams, setChatParams] = useState(null);
  const [conversationIds, setConversationIds] = useState({});
  const [activeChat, setActiveChat] = useState(null); // { type: 'friend'|'expert', contact: {...}, conversationId }
  const autoStartRef = useRef(false);

  const getMyId = () => {
    // prefer JWT id if available, fallback to localStorage id
    return userIdRef.current || currentUserId;
  };

  const isFromMe = (senderId) => {
    const me = getMyId();
    if (!me || senderId == null) return false;
    return String(senderId) === String(me);
  };

  const handlePaymentChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPaymentInfo((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 🔥 SECTION 2 — WebSocket Connector (paste inside component)
  const connectWS = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return; // already connected

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setSocketState("no-token");
      setConnectionError("No token found. Please sign in.");
      return;
    }

    setSocketState("connecting");
    setConnectionError("");

    // Use the buildWsUrl function to properly construct the URL with token
    wsRef.current = new WebSocket(buildWsUrl(token));

    wsRef.current.onopen = () => {
      console.log("🌿 WS connected");
      setSocketState("connected");
      reconnectAttemptsRef.current = 0;
      if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== "new_message") return;

      const convoId = data.conversationId || data.conversation_id;
      if (!convoId) return;

      const sender = data.senderId ?? data.sender_id ?? null;
      if (isFromMe(sender)) return; // avoid duplicating our own message (already optimistically added)

      const senderIdStr = sender != null ? String(sender) : null;
      const senderName =
        data.senderName ||
        data.sender_name ||
        data.sender ||
        "Contact";

      if (senderIdStr) {
        const avatar =
          senderName && senderName.length > 0
            ? senderName[0].toUpperCase()
            : "💬";
        const isSenderExpert = experts.some(
          (item) => String(item.id) === senderIdStr
        );
        const contactRole =
          meIsExpertRef.current && !isSenderExpert
            ? "Paid User"
            : isSenderExpert
            ? "Expert"
            : "Seller";
        const contact = {
          id: senderIdStr,
          name: senderName,
          role: contactRole,
          avatar,
          intro: null,
          locked: false,
        };
        if (meIsExpertRef.current && !isSenderExpert) {
          setPaidContacts((prev) => {
            const exists = prev.some((f) => String(f.id) === senderIdStr);
            if (exists) return prev;
            return [...prev, contact];
          });
        } else {
          setFriends((prev) => {
            const exists = prev.some((f) => String(f.id) === senderIdStr);
            if (exists) return prev;
            return [...prev, contact];
          });
        }

        setConversationIds((prev) =>
          prev[senderIdStr] ? prev : { ...prev, [senderIdStr]: convoId }
        );
      }

      if (!activeConversationId) {
        setActiveConversationId(convoId);
      }
      if (!activeChat) {
        const avatar =
          senderName && senderName.length > 0
            ? senderName[0].toUpperCase()
            : "💬";
        const isSenderExpert = experts.some(
          (item) => String(item.id) === senderIdStr
        );
        const contactRole =
          meIsExpertRef.current && !isSenderExpert
            ? "Paid User"
            : isSenderExpert
            ? "Expert"
            : "Seller";
        setActiveChat({
          type: "friend",
          contact: {
            id: senderIdStr,
            name: senderName,
            role: contactRole,
            avatar,
            intro: null,
            locked: false,
          },
          conversationId: convoId,
        });
      }

      setMessages((prev) => ({
        ...prev,
        [convoId]: [
          ...(prev[convoId] || []),
          {
            id:
              data.id ||
              data.message?.id ||
              data.createdAt ||
              data.created_at ||
              Date.now(),
            from: isFromMe(sender) ? "me" : "them",
            text: data.content,
            createdAt: data.createdAt || data.created_at || new Date().toISOString(),
            pending: false,
          },
        ],
      }));
    };

    wsRef.current.onclose = (event) => {
      console.warn("WS closed", event?.code, event?.reason);
      wsRef.current = null;
      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = null;
      }
      const canRetry = event?.code !== 4001 && event?.code !== 4002;
      if (event?.code === 4001) {
        setSocketState("no-token");
        setConnectionError("No token provided. Please sign in again.");
        return;
      }
      if (event?.code === 4002) {
        setSocketState("error");
        setConnectionError("Token invalid or expired. Please log in again.");
        return;
      }
      setSocketState("disconnected");
      if (canRetry) scheduleReconnect();
    };

    wsRef.current.onerror = (event) => {
      console.warn("WS error", event);
      setSocketState("error");
      setConnectionError("Chat server unreachable.");
    };
  };

  const ensureMessagesForConversation = async (convoId) => {
    if (!convoId) return null;
    if (messages[convoId] && messages[convoId].length > 0) return messages[convoId];
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setConnectionError("Please sign in to load messages.");
      return null;
    }
    try {
      const msgRes = await fetch(`${API_BASE}/messages/${convoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const msgData = await msgRes.json();
      if (!msgRes.ok) {
        setConnectionError(msgData?.error || "Failed to load messages.");
        return null;
      }
      setMessages((prev) => ({
        ...prev,
        [convoId]: msgData.map((m) => ({
          id: m.id || m.created_at,
          from: isFromMe(m.sender_id) ? "me" : "them",
          text: m.content,
          createdAt: m.created_at,
          pending: false,
        })),
      }));
      return msgData;
    } catch (err) {
      console.error("Load messages error:", err);
      setConnectionError("Failed to load messages.");
      return null;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimerRef.current || socketState === "no-token") return;
    const attempt = reconnectAttemptsRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // 1s,2s,4s,8s,10s cap
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      reconnectAttemptsRef.current = attempt + 1;
      connectWS();
    }, delay);
  };

  // 🔥 SECTION 3 — startChat(friendId)
  const startChat = async (friendId) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setConnectionError("Please sign in to start a chat.");
        return;
      }

      const candidateId =
        typeof friendId === "string" || typeof friendId === "number"
          ? friendId
          : friendId?.id;
      const expertMatch = experts.find(
        (expert) => String(expert.id) === String(candidateId)
      );
      if (expertMatch) {
        handleExpertSelect(expertMatch);
        return;
      }

      const friend =
        typeof friendId === "string"
          ? friends.find((f) => f.id === friendId) || fallbackFriends.find((f) => f.id === friendId)
          : friendId;
      if (!friend) return;

      // show selection immediately
      const existingConvo = conversationIds[friend.id] || null;
      setActiveChat({ type: "friend", contact: friend, conversationId: existingConvo });
      setActiveConversationId(existingConvo);
      setConnectionError("");

      let convoId = existingConvo;

      // 1️⃣ Create or fetch conversation if we don't have one
      if (!convoId) {
        const res = await fetch(`${API_BASE}/messages/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ otherUserId: friend.id }),
        });

        const data = await res.json();
        if (!res.ok || !data.conversationId) {
          setConnectionError(data?.error || "Unable to start chat with this friend.");
          return;
        }

        convoId = data.conversationId;
        setConversationIds((prev) => ({ ...prev, [friend.id]: convoId }));
        setActiveConversationId(convoId);
        setActiveChat({ type: "friend", contact: friend, conversationId: convoId });
      }

      if (convoId && !conversationIds[friend.id]) {
        setConversationIds((prev) => ({ ...prev, [friend.id]: convoId }));
      }

      // 2️⃣ load old messages if we don't have them yet
      if (!messages[convoId] || messages[convoId].length === 0) {
        await ensureMessagesForConversation(convoId);
      }

      // 3️⃣ connect websocket
      connectWS();

    } catch (error) {
      console.error("startChat error:", error);
      setConnectionError("Failed to start chat. Please try again.");
    }
  };

  // 🔥 SECTION 4 — Send message function
  const sendMessage = async (content) => {
    if (!activeConversationId) {
      setConnectionError("No conversation yet. Select a chat first.");
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    const tempId = Date.now();

    // UI optimistic update
    setMessages((prev) => ({
      ...prev,
      [activeConversationId]: [
        ...(prev[activeConversationId] || []),
        {
          id: tempId,
          from: "me",
          text: content,
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ],
    }));

    // Try HTTP persist first so DB is authoritative
    try {
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send message");

      // Replace optimistic with saved message
      setMessages((prev) => {
        const list = prev[activeConversationId] || [];
        return {
          ...prev,
          [activeConversationId]: list.map((m) =>
            m.id === tempId && m.pending
              ? {
                  id: data.id || data.message?.id || tempId,
                  from: "me",
                  text: data.content || content,
                  createdAt: data.createdAt || data.created_at || m.createdAt,
                  pending: false,
                }
              : m
          ),
        };
      });
    } catch (err) {
      console.error("Send failed:", err);
      setConnectionError(err?.message || "Failed to send message.");
    }
  };

  // Fixed: Combined the duplicate useEffect hooks for URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get("chat");
    const sellerId = params.get("sellerId");
    const sellerName = params.get("seller") || "Seller";

    if (!chatId || chatParamHandled.current === chatId) return;

    chatParamHandled.current = chatId;

    // 1️⃣ Create seller contact object
    const sellerContact = {
      id: sellerId,
      name: sellerName,
      role: "Seller",
      avatar: "🛒",
      intro: null,
      locked: false,
    };

    // 2️⃣ Add seller to the chat list IF not already there
    setFriends((prev) => {
      const exists = prev.some((f) => String(f.id) === String(sellerId));
      if (exists) return prev;

      return [...prev, sellerContact];
    });

    // 3️⃣ Register this conversation ID
    setConversationIds((prev) => ({
      ...prev,
      [sellerId]: chatId,
    }));

    // 4️⃣ Set the active chat
    setActiveChat({
      type: "friend",
      contact: sellerContact,
      conversationId: chatId,
    });

    setActiveConversationId(chatId);

    // 5️⃣ Load old messages + connect WS
    ensureMessagesForConversation(chatId);
    connectWS();
  }, [location.search]);

  const renderAvatar = (chat) => {
    const avatar = chat.avatar;
    const resolved = resolveAssetUrl(avatar);
    if (isImageSrc(resolved)) {
      return <img src={resolved} alt={chat.name} className="avatar-img" />;
    }
    return <div style={{ fontSize: 26 }}>{avatar || "👥"}</div>;
  };

  const formatPrice = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0.00";
    return amount.toFixed(2);
  };

  const normalizeExpert = (expert) => {
    const name = expert?.name || "Expert";
    const expertBio = expert?.bio ?? expert?.farmer?.bio ?? "";
    const expertSpecialization =
      expert?.specialization ??
      expert?.expert_field ??
      expert?.farmer?.expert_field ??
      null;
    const specialtiesRaw = Array.isArray(expert?.specialty)
      ? expert.specialty
      : Array.isArray(expert?.specialties)
      ? expert.specialties
      : typeof expertSpecialization === "string"
      ? expertSpecialization.split(",")
      : [];
    const specialties = specialtiesRaw
      .map((item) => String(item).trim())
      .filter(Boolean);

    const locked =
      typeof expert?.locked === "boolean" ? expert.locked : !(expert?.unlocked === true);
    const farmerId = expert?.farmerId ?? expert?.farmer_id ?? expert?.id;

    return {
      id: farmerId != null ? String(farmerId) : name,
      name,
      role: expert?.role || expertSpecialization || "Expert",
      avatar:
        expert?.avatar ||
        (name && name.length > 0 ? name[0].toUpperCase() : "E"),
      locked,
      chatPrice: Number(expert?.chatPrice ?? expert?.chat_price ?? 0),
      intro: {
        bio: expertBio,
        specialty: specialties,
        rating: Number.isFinite(Number(expert?.rating)) ? Number(expert.rating) : 0,
      },
      bio: expertBio,
      specialization: expertSpecialization,
      experienceYears:
        expert?.experienceYears ??
        expert?.experience_years ??
        expert?.expert_years ??
        expert?.farmer?.expert_years ??
        null,
      city: expert?.city || null,
      village: expert?.village || null,
      email: expert?.email || null,
    };
  };

  const startExpertChat = async (expertInput) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setConnectionError("Please sign in to start a chat.");
        return;
      }

      const expert = normalizeExpert(expertInput);
      if (!expert?.id) return;

      const existingConvo = conversationIds[expert.id] || null;
      setActiveChat({ type: "expert", contact: expert, conversationId: existingConvo });
      setActiveConversationId(existingConvo);
      setConnectionError("");

      let convoId = existingConvo;
      if (!convoId) {
        const res = await fetch(`${API_BASE}/messages/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ otherUserId: expert.id }),
        });

        const data = await res.json();
        if (!res.ok || !data.conversationId) {
          setConnectionError(data?.error || "Unable to start chat with this expert.");
          return;
        }

        convoId = data.conversationId;
        setConversationIds((prev) => ({ ...prev, [expert.id]: convoId }));
        setActiveConversationId(convoId);
        setActiveChat({ type: "expert", contact: expert, conversationId: convoId });
      }

      if (convoId && !messages[convoId]) {
        await ensureMessagesForConversation(convoId);
      }

      connectWS();
    } catch (error) {
      console.error("startExpertChat error:", error);
      setConnectionError("Failed to start expert chat. Please try again.");
    }
  };

  function handleExpertSelect(expertInput) {
    const expert = normalizeExpert(expertInput);
    const existingConvo = conversationIds[expert.id] || null;
    if (expert.locked) {
      setActiveChat({ type: "expert", contact: expert, conversationId: existingConvo });
      setActiveConversationId(existingConvo);
      return;
    }
    startExpertChat(expert);
  }

  const unlockExpertChat = async (expertInput) => {
    const expert = normalizeExpert(expertInput);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setConnectionError("Please sign in to unlock expert chat.");
      return false;
    }
    if (!expert?.id) {
      setConnectionError("Missing expert information.");
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/messages/experts/${expert.id}/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: expert.chatPrice || 0 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to unlock expert chat.");

      if (data?.conversationId) {
        setConversationIds((prev) => ({
          ...prev,
          [expert.id]: data.conversationId,
        }));
        setActiveConversationId(data.conversationId);
      }

      setExperts((prev) =>
        prev.map((item) =>
          String(item.id) === String(expert.id) ? { ...item, locked: false } : item
        )
      );
      setActiveChat((prev) =>
        prev && String(prev.contact?.id) === String(expert.id)
          ? { ...prev, contact: { ...prev.contact, locked: false } }
          : prev
      );
      return true;
    } catch (err) {
      console.error("Unlock expert failed:", err);
      setConnectionError(err?.message || "Failed to unlock expert chat.");
      return false;
    }
  };
  const currentMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];
  const isExpert = activeChat?.type === "expert";
  const expertIntro = isExpert
    ? (() => {
        const contact = activeChat?.contact || {};
        const intro = contact.intro || {};
        const raw = Array.isArray(intro.specialty) && intro.specialty.length > 0
          ? intro.specialty
          : Array.isArray(contact.specialty)
          ? contact.specialty
          : typeof contact.specialization === "string"
          ? contact.specialization.split(",")
          : [];
        const bio = intro.bio || contact.bio || "";
        const rating = Number.isFinite(Number(intro.rating)) ? Number(intro.rating) : 0;
        return {
          bio,
          specialty: raw.map((item) => String(item).trim()).filter(Boolean),
          rating,
        };
      })()
    : null;
  const expertLocation = isExpert
    ? [activeChat?.contact?.village, activeChat?.contact?.city]
        .filter(Boolean)
        .join(", ")
    : "";
  const expertSpecialtiesLabel = expertIntro?.specialty?.length
    ? expertIntro.specialty.join(", ")
    : "No specialties listed";
  const expertLocationLabel = expertLocation || "Location not provided";
  const resolvedExpertAvatar = isExpert
    ? resolveAssetUrl(activeChat?.contact?.avatar)
    : null;
  const expertAvatar = isImageSrc(resolvedExpertAvatar)
    ? resolvedExpertAvatar
    : "https://i.pravatar.cc/240?img=47";
  const isPaymentReady = Boolean(
    paymentInfo.cardNumber &&
      paymentInfo.cardName &&
      paymentInfo.expiryDate &&
      paymentInfo.cvv
  );

  useEffect(() => {
    if (showPayment) {
      setPaymentError("");
    }
  }, [showPayment]);

  useEffect(() => {
    meIsExpertRef.current = meIsExpert;
  }, [meIsExpert]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const controller = new AbortController();
    const loadExperts = async () => {
      try {
        setLoadingExperts(true);
        const res = await fetch(`${API_BASE}/messages/experts`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load experts");

        const mapped = Array.isArray(data)
          ? data.map((item) => normalizeExpert(item))
          : [];
        setExperts(mapped);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Experts load failed:", err.message || err);
        }
      } finally {
        setLoadingExperts(false);
      }
    };

    loadExperts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !meIsExpert) return;

    const controller = new AbortController();
    const loadPaidUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/messages/paid-users`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load paid users");

        const mapped = Array.isArray(data)
          ? data.map((item) => ({
              id: String(item.id),
              name: item.name || "User",
              role: "Paid User",
              avatar:
                item.avatar ||
                (item.name ? item.name[0]?.toUpperCase() : "💬"),
              intro: null,
              locked: false,
            }))
          : [];

        if (mapped.length > 0) {
          setPaidContacts((prev) => {
            const merged = new Map(
              (prev || []).map((item) => [String(item.id), item])
            );
            mapped.forEach((item) => {
              merged.set(String(item.id), { ...(merged.get(String(item.id)) || {}), ...item });
            });
            return Array.from(merged.values());
          });
        }

        const mapping = {};
        (Array.isArray(data) ? data : []).forEach((item) => {
          if (item?.conversationId) {
            mapping[String(item.id)] = item.conversationId;
          }
        });
        if (Object.keys(mapping).length > 0) {
          setConversationIds((prev) => ({ ...prev, ...mapping }));
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Paid users load failed:", err.message || err);
        }
      }
    };

    loadPaidUsers();
    return () => controller.abort();
  }, [meIsExpert]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const controller = new AbortController();
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        const res = await fetch(`${API_BASE}/friends`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load friends");

        const mapped =
          (data.friends || []).map((f) => ({
            id: String(f.id),
            name: f.name || "Friend",
            role: f.email || "Mutual follower",
            avatar: f.avatar || (f.name ? f.name[0]?.toUpperCase() : "👥"),
            intro: null,
            locked: false,
            lastMessage: "",
            time: "",
          })) || [];

        if (mapped.length > 0) {
          setFriends((prev) => {
            const merged = new Map(
              (prev || []).map((item) => [String(item.id), item])
            );
            mapped.forEach((item) => {
              const key = String(item.id);
              merged.set(key, { ...(merged.get(key) || {}), ...item });
            });
            return Array.from(merged.values());
          });
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Friends load failed:", err.message || err);
        }
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!autoStartRef.current && friends.length > 0) {
      autoStartRef.current = true;
      startChat(friends[0].id);
    }
  }, [friends]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setSocketState("no-token");
      return;
    }

    const parsed = safeParseJwt(token);
    const uid = parsed?.id ?? parsed?.userId ?? parsed?.uid;
    if (uid) userIdRef.current = String(uid);

    // Connect to WebSocket when component mounts
    connectWS();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || conversationsLoadedRef.current) return;

    conversationsLoadedRef.current = true;
    const controller = new AbortController();

    const loadConversations = async () => {
      try {
        const res = await fetch(`${API_BASE}/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          console.warn("Load conversations failed:", data?.error || res.statusText);
          return;
        }

        const convos = Array.isArray(data)
          ? data
          : data?.conversations || [];
        const parsed = safeParseJwt(token);
        const me =
          parsed?.id ?? parsed?.userId ?? parsed?.uid ?? getMyId();
        const meStr = me != null ? String(me) : null;
        const resolvedMeIsExpert = Boolean(
          data?.meIsExpert ?? currentUserIsExpert
        );
        setMeIsExpert(resolvedMeIsExpert);

        const newContacts = [];
        const newPaidContacts = [];
        const newMapping = {};

        for (const convo of convos) {
          const convoId = convo?.id ?? convo?.conversation_id ?? convo;
          if (!convoId) continue;

          const msgData = await ensureMessagesForConversation(convoId);
          const participants = Array.isArray(convo?.participants)
            ? convo.participants
            : [];
          const otherParticipant = participants.find((participant) => {
            const participantId =
              participant?.farmer_id ??
              participant?.farmer?.id ??
              participant?.id ??
              null;
            if (!participantId) return false;
            return !meStr || String(participantId) !== meStr;
          });
          const otherMessage =
            (msgData || []).find(
              (m) =>
                meStr && m?.sender_id != null && String(m.sender_id) !== meStr
            ) || (msgData || []).find((m) => m?.sender_id != null);
          const otherId =
            otherMessage?.sender_id ??
            otherParticipant?.farmer_id ??
            otherParticipant?.farmer?.id ??
            null;
          const otherIdStr = otherId != null ? String(otherId) : null;
          const contactId = otherIdStr || `conversation-${convoId}`;
          const contactName =
            otherMessage?.sender_name ||
            otherParticipant?.farmer?.name ||
            (otherId ? "Contact" : "Conversation");
          const avatar =
            otherParticipant?.farmer?.avatar ||
            (contactName && contactName.length > 0
              ? contactName[0].toUpperCase()
              : "dY'?");
          const participantProfile = otherParticipant?.farmer || {};
          const otherIsExpert =
            Boolean(participantProfile?.is_expert || participantProfile?.expert_verified) ||
            (otherIdStr &&
              experts.some((item) => String(item.id) === otherIdStr));
          const contactBio = participantProfile?.bio || "";
          const contactSpecialization = participantProfile?.expert_field || null;
          const role =
            resolvedMeIsExpert && !otherIsExpert
              ? "Paid User"
              : otherIsExpert
              ? "Expert"
              : "Seller";
          const contact = {
            id: contactId,
            name: contactName,
            role,
            avatar,
            intro: null,
            bio: contactBio,
            specialization: contactSpecialization,
            experienceYears: participantProfile?.expert_years ?? null,
            email: participantProfile?.email || null,
            city: participantProfile?.city || null,
            village: participantProfile?.village || null,
            locked: false,
          };
          if (resolvedMeIsExpert && !otherIsExpert) {
            newPaidContacts.push(contact);
          } else {
            newContacts.push(contact);
          }
          newMapping[contactId] = convoId;
        }

        if (Object.keys(newMapping).length > 0) {
          setConversationIds((prev) => ({ ...prev, ...newMapping }));
        }

        if (newContacts.length > 0) {
          setFriends((prev) => {
            const seen = new Set(prev.map((f) => String(f.id)));
            const additions = newContacts.filter(
              (c) => !seen.has(String(c.id))
            );
            if (additions.length === 0) return prev;
            return [...prev, ...additions];
          });
        }
        if (newPaidContacts.length > 0) {
          setPaidContacts((prev) => {
            const seen = new Set(prev.map((c) => String(c.id)));
            const additions = newPaidContacts.filter(
              (c) => !seen.has(String(c.id))
            );
            if (additions.length === 0) return prev;
            return [...prev, ...additions];
          });
        }

        if (!activeConversationId && convos.length > 0) {
          const firstConvoId =
            convos[0]?.id ?? convos[0]?.conversation_id ?? convos[0];
          const combinedContacts = resolvedMeIsExpert
            ? [...newContacts, ...newPaidContacts]
            : newContacts;
          const firstContact = combinedContacts.find(
            (c) => newMapping[c.id] === firstConvoId
          );
          setActiveConversationId(firstConvoId);
          setActiveChat((prev) =>
            prev ||
            (firstContact
              ? {
                  type: "friend",
                  contact: firstContact,
                  conversationId: firstConvoId,
                }
              : { type: "friend", contact: null, conversationId: firstConvoId })
          );
        }

        connectWS();
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Load conversations failed:", err);
      }
    };

    loadConversations();
    return () => controller.abort();
  }, []);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft.trim());
    setDraft("");
  };

  const paidContactIds = new Set(paidContacts.map((c) => String(c.id)));
  const visibleFriends = meIsExpert
    ? friends.filter((c) => !paidContactIds.has(String(c.id)))
    : friends;

  return (
    <>
      <Header />

      <style>{`
        .chat-wrapper {
          min-height: calc(100vh - 80px);
          background: linear-gradient(145deg, ${BLOOM.cream}, #ffffff);
          padding: 0 24px 24px 24px;
          margin-top: -4px;
        }

        .chat-shell {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-radius: 28px;
          padding: 24px;
          display: grid;
          grid-template-columns: 300px 1fr ${isExpert ? "300px" : ""};
          gap: 22px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.12);
          height: calc(100vh - 160px);
          overflow: hidden;
        }

        .left-column { 
          overflow-y: auto; 
          padding-right: 6px; 
        }

        .sidebar-section { margin-bottom: 25px; }

        .section-title {
          font-size: 15px;
          color: ${BLOOM.olive};
          font-weight: 700;
          margin-bottom: 10px;
        }

        .chat-item {
          display: flex;
          gap: 12px;
          background: #ffffff;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(46,139,87,0.12);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          cursor: pointer;
          transition: 0.2s;
        }

        .avatar-img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .chat-item:hover { background: ${BLOOM.sage}; transform: translateY(-2px); }
        .chat-item.active {
          background: linear-gradient(135deg, ${BLOOM.sage}, #ffffff);
          border: 1px solid ${BLOOM.forest};
          box-shadow: 0 6px 20px rgba(46,139,87,0.25);
        }

        /* CHAT AREA */
        .chat-area {
          background: #ffffff;
          border-radius: 22px;
          padding: 20px;
          position: relative;

          display: flex;
          flex-direction: column;
          justify-content: space-between;

          overflow: hidden;
          box-shadow: 0 12px 25px rgba(0,0,0,0.08);
        }

        /* SCRATCHED BACKGROUND WHEN LOCKED */
        .locked-chat {
          background: repeating-linear-gradient(
              45deg,
              rgba(46,139,87,0.05),
              rgba(46,139,87,0.05) 6px,
              rgba(0,0,0,0.02) 6px,
              rgba(0,0,0,0.02) 12px
            ) !important;
          filter: grayscale(0.2);
        }

        .chat-messages {
          flex-grow: 1;
          flex-shrink: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 6px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .connection-banner {
          background: #fff7e6;
          color: #8a6d3b;
          border: 1px solid #ffe3b3;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .connection-banner.error {
          background: #fdecea;
          color: #a12c2c;
          border-color: #f5c2c7;
        }

        .msg {
          position: relative;
          display: inline-block;
          padding: 10px 14px;
          max-width: 75%;
          width: fit-content;
          border-radius: 16px;
          line-height: 1.5;
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .msg.me {
          align-self: flex-end;
          background: #2e8b57;
          color: white;
        }

        .msg.them {
          align-self: flex-start;
          background: #e8f3e8;
          color: #1b4332;
        }

        .msg-text {
          display: block;
        }

        .msg-time {
          display: block;
          font-size: 10px;
          opacity: 0.7;
          margin-top: 4px;
          text-align: right;
        }

        .pending {
          display: block;
          font-size: 10px;
          color: orange;
          margin-top: 2px;
          text-align: right;
        }

        /* LOCK OVERLAY (GLASS UI) */
        .chat-locked-overlay {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          backdrop-filter: blur(10px);
          background: rgba(250,249,246,0.75);
          border-radius: 22px;
          z-index: 10;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .locked-card {
          background: rgba(255, 255, 255, 0.9);
          padding: 32px 26px;
          border-radius: 24px;
          backdrop-filter: blur(14px);
          width: 85%;
          max-width: 380px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(27,67,50,0.18);
          border: 1px solid rgba(46,139,87,0.15);
          animation: fadeCard 0.35s ease-out;
        }

        @keyframes fadeCard {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .locked-icon-wrap {
          width: 88px;
          height: 88px;
          background: linear-gradient(135deg, #ffffff, ${BLOOM.sage});
          border-radius: 50%;
          margin: 0 auto 18px auto;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 12px 22px rgba(0,0,0,0.12);
          animation: floatLock 3s infinite ease-in-out;
        }

        @keyframes floatLock {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        .locked-icon { font-size: 46px; color: ${BLOOM.olive}; }

        .locked-title {
          font-size: 20px;
          font-weight: 700;
          color: ${BLOOM.olive};
          margin-bottom: 6px;
        }
        .locked-subtitle {
          font-size: 14px;
          color: ${BLOOM.sub};
          margin-bottom: 20px;
        }

        .locked-unlock-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, ${BLOOM.forest}, ${BLOOM.leaf});
          color: #ffffff;
          border: none;
          border-radius: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(46,139,87,0.25);
          transition: 0.25s ease;
        }

        .locked-unlock-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 30px rgba(46,139,87,0.30);
        }

        .locked-note {
          font-size: 12px;
          color: ${BLOOM.sub};
          margin-top: 14px;
          opacity: 0.75;
        }

        /* INPUT AREA */
        .chat-input {
          display: flex;
          gap: 12px;
          width: 100%;
          margin-top: 16px;
          align-items: center;
        }

        textarea {
          flex: 1;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.12);
          font-size: 14px;
          resize: none;
          color: ${BLOOM.text};
        }

        textarea::placeholder {
          color: rgba(79,111,82,0.6);
        }

        .send-btn {
          background: linear-gradient(135deg, ${BLOOM.forest}, ${BLOOM.leaf});
          padding: 12px 16px;
          border-radius: 14px;
          color: #ffffff;
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(0,0,0,0.18);
        }

        /* ===========================
           PREMIUM EXPERT PANEL
        =========================== */

        .expert-panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,249,246,0.96));
          border-radius: 24px;
          overflow-y: auto;
          height: 100%;
          border: 1px solid rgba(27,67,50,0.08);
          box-shadow: 0 24px 60px rgba(27,67,50,0.16);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* TOP curved header */
        .expert-top {
          background: radial-gradient(circle at 20% 20%, ${BLOOM.leaf}, ${BLOOM.forest});
          height: 140px;
          width: 100%;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          position: relative;
        }

        .expert-top::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
        }

        /* Floating avatar */
        .expert-avatar-wrap {
          width: 116px;
          height: 116px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow:
            0 16px 36px rgba(27,67,50,0.2),
            0 0 0 6px rgba(255,255,255,0.6);
          padding: 6px;
          position: absolute;
          bottom: -58px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
        }

        .expert-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        /* Content */
        .expert-content {
          margin-top: 64px;
          padding: 20px 26px 26px;
        }

        .expert-name {
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          color: ${BLOOM.olive};
          letter-spacing: 0.2px;
        }

        .expert-role {
          text-align: center;
          font-size: 14px;
          color: ${BLOOM.sub};
          margin-top: 4px;
        }

        .expert-location {
          margin: 10px auto 0;
          background: rgba(111,207,151,0.14);
          padding: 8px 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: ${BLOOM.olive};
          font-size: 13px;
          max-width: 90%;
          text-align: center;
          line-height: 1.35;
          border: 1px solid rgba(27,67,50,0.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }

        .expert-social {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin: 12px 0;
        }

        .social-icon {
          width: 40px;
          height: 40px;
          background: ${BLOOM.sage};
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 12px;
          font-size: 18px;
          cursor: pointer;
          transition: 0.25s ease;
          color: ${BLOOM.olive};
        }

        .social-icon.whatsapp {
          background: ${BLOOM.leaf};
          color: #ffffff;
        }

        .social-icon.email {
          background: ${BLOOM.yellow};
          color: ${BLOOM.olive};
        }

        .social-icon.facebook {
          background: ${BLOOM.forest};
          color: #ffffff;
        }

        .social-icon:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 18px rgba(0,0,0,0.15);
        }

        .expert-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(27,67,50,0.18), transparent);
          margin: 18px 0;
        }

        .expert-info .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 13px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(27,67,50,0.08);
          border-radius: 12px;
          padding: 8px 10px;
          box-shadow: 0 6px 14px rgba(27,67,50,0.06);
        }

        .info-label {
          font-weight: 600;
          color: ${BLOOM.olive};
        }

        .info-value {
          color: ${BLOOM.sub};
          text-align: right;
        }

        .expert-section-title {
          font-size: 12px;
          color: ${BLOOM.sub};
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .expert-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .expert-tag {
          background: rgba(232,243,232,0.9);
          padding: 8px 12px;
          border-radius: 14px;
          color: ${BLOOM.olive};
          font-size: 13px;
          border: 1px solid rgba(27,67,50,0.08);
        }

        .expert-rating {
          text-align: center;
          margin: 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: ${BLOOM.olive};
        }

        .unlock-expert-btn {
          width: 100%;
          padding: 14px 16px;
          background: linear-gradient(135deg, ${BLOOM.forest}, ${BLOOM.leaf});
          color: #ffffff;
          border: none;
          border-radius: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 14px;
          box-shadow: 0 14px 28px rgba(27,67,50,0.2);
          transition: 0.25s;
        }

        .unlock-expert-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 34px rgba(0,0,0,0.18);
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: ${BLOOM.text};
          margin-bottom: 6px;
        }

        .form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid rgba(27,67,50,0.25);
          border-radius: 8px;
          font-size: 14px;
          color: ${BLOOM.text};
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: ${BLOOM.forest};
          box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
        }

        .credit-card-form {
          display: grid;
          gap: 15px;
          margin-bottom: 16px;
        }

        .card-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 15px;
        }

        .payment-error {
          background: #ffecec;
          color: #c0392b;
          padding: 10px 12px;
          border-radius: 10px;
          margin-bottom: 12px;
          border: 1px solid rgba(231, 76, 60, 0.3);
          font-size: 13px;
          font-weight: 600;
        }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${BLOOM.leaf}; border-radius: 8px; }
        ::-webkit-scrollbar-track { background: ${BLOOM.sage}; }
      `}</style>

      {/* MAIN CHAT LAYOUT */}
      <div className="chat-wrapper">
        <div className="chat-shell">
          {/* LEFT SIDEBAR */}
          <div className="left-column">
            <div className="sidebar-section">
              <div className="section-title">Friends</div>
              {loadingFriends && (
                <div style={{ fontSize: 13, color: BLOOM.sub }}>Loading friends…</div>
              )}
              {!loadingFriends && visibleFriends.length === 0 && (
                <div style={{ fontSize: 13, color: BLOOM.sub }}>
                  No mutual followers yet.
                </div>
              )}
              {!loadingFriends &&
                visibleFriends.map((c) => (
                  <div
                    key={c.id}
                    className={`chat-item ${
                      activeChat?.contact?.id === c.id ? "active" : ""
                    }`}
                    // 🔥 SECTION 5 — Trigger chat when clicking a friend
                    onClick={() => startChat(c.id)}
                  >
                    {renderAvatar(c)}
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: BLOOM.sub }}>
                        {c.role || "Mutual follower"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {meIsExpert && (
              <div className="sidebar-section">
                <div className="section-title">Subscribers</div>
                {paidContacts.length === 0 && (
                  <div style={{ fontSize: 13, color: BLOOM.sub }}>
                    No Subscribers yet.
                  </div>
                )}
                {paidContacts.map((c) => (
                  <div
                    key={c.id}
                    className={`chat-item ${
                      activeChat?.contact?.id === c.id ? "active" : ""
                    }`}
                    onClick={() => startChat(c)}
                  >
                    {renderAvatar(c)}
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: BLOOM.sub }}>
                        {c.role || "Paid User"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EXPERTS */}
            <div className="sidebar-section">
              <div className="section-title">Experts</div>
              {loadingExperts && (
                <div style={{ fontSize: 13, color: BLOOM.sub }}>Loading experts...</div>
              )}
              {!loadingExperts && experts.length === 0 && (
                <div style={{ fontSize: 13, color: BLOOM.sub }}>No experts available.</div>
              )}
              {!loadingExperts && experts.map((c) => (
                <div
                  key={c.id}
                  className={`chat-item ${
                    activeChat?.contact?.id === c.id ? "active" : ""
                  }`}
                  onClick={() => handleExpertSelect(c)}
                >
                  {renderAvatar(c)}
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {c.name}
                      {/* Fixed: Removed the stray quote character */}
                      {c.locked && <span>🔒</span>}
                    </div>
                    <div style={{ fontSize: 12, color: BLOOM.sub }}>
                      {c.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MIDDLE CHAT */}
          <div
            className={`chat-area ${
              activeChat?.contact?.locked ? "locked-chat" : ""
            }`}
          >
            <h3 style={{ color: BLOOM.olive }}>
              {activeChat?.contact?.name || "Select a chat"}
            </h3>

            {socketState !== "connected" && socketState !== "idle" && (
              <div
                className={`connection-banner ${
                  socketState === "error" ? "error" : ""
                }`}
              >
                {socketState === "no-token"
                  ? "Sign in to enable real-time chat."
                  : socketState === "connecting"
                  ? "Connecting to chat server..."
                  : socketState === "disconnected"
                  ? "Chat disconnected. Messages will stay local until it reconnects."
                  : connectionError || "Chat connection issue."}
              </div>
            )}

            {/* LOCK OVERLAY */}
            {activeChat?.contact?.locked && (
              <div className="chat-locked-overlay">
                <div className="locked-card">
                  <div className="locked-icon-wrap">
                    <div className="locked-icon">🔒</div>
                  </div>

                  <div className="locked-title">Expert Chat Locked</div>

                  <div className="locked-subtitle">
                    Unlock private guidance with{" "}
                    <strong>{activeChat?.contact?.name}</strong>
                  </div>

                  <button
                    className="locked-unlock-btn"
                    onClick={() => setShowPayment(true)}
                  >
                    {`Unlock for ₪${formatPrice(activeChat?.contact?.chatPrice ?? 0)}`}
                  </button>

                  <div className="locked-note">
                    Secure • Instant access • Priority expert reply
                  </div>
                </div>
              </div>
            )}

            <div className="chat-messages">
              {!activeChat?.contact?.locked &&
                currentMessages.map((msg, index) => (
                  <div
                    key={msg.id || msg.createdAt || index}
                    className={`msg ${msg.from === "me" ? "me" : "them"}`}
                  >
                    <span className="msg-text">{msg.text}</span>

                    {/* timestamp */}
                    <span className="msg-time">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>

                    {/* pending flag */}
                    {msg.pending && (
                      <span className="pending">saving…</span>
                    )}
                  </div>
                ))}
            </div>

            {/* INPUT */}
            <div className="chat-input">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  activeChat?.contact?.locked
                    ? "This chat is locked…"
                    : "Write a message..."
                }
                disabled={activeChat?.contact?.locked}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (activeChat?.contact?.locked) {
                      setShowPayment(true);
                      return;
                    }
                    handleSend();
                  }
                }}
              />

              <button
                className="send-btn"
                onClick={() => {
                  if (activeChat?.contact?.locked) {
                    setShowPayment(true);
                    return;
                  }
                  handleSend();
                }}
              >
                <FiSend size={18} />
              </button>
            </div>
          </div>

          {/* RIGHT PANEL – EXPERT PROFILE */}
          {isExpert && activeChat?.contact && (
            <div className="expert-panel">
              {/* TOP CURVED BACKGROUND + FLOATING AVATAR */}
              <div className="expert-top">
                <div className="expert-avatar-wrap">
                  {/* you can replace with real expert image later */}
                  <img
                    src={expertAvatar}
                    alt="Expert Avatar"
                    className="expert-avatar"
                  />
                </div>
              </div>

              {/* CARD CONTENT */}
              <div className="expert-content">
                <h2 className="expert-name">{activeChat.contact.name}</h2>

                <div className="expert-location">{expertSpecialtiesLabel}</div>

                <div className="expert-divider"></div>

                <div className="expert-info">
                  <div className="info-row">
                    <span className="info-label">E-mail:</span>
                    <span className="info-value">
                      {activeChat.contact.email || "Not provided"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Experience:</span>
                    <span className="info-value">
                      {activeChat.contact.experienceYears
                        ? `${activeChat.contact.experienceYears}+ years`
                        : "Not listed"}
                    </span>
                  </div>
                </div>

                <div className="expert-divider"></div>

                <p className="expert-section-title">Bio</p>
                <p style={{ color: BLOOM.sub, fontSize: 13, lineHeight: 1.4 }}>
                  {expertIntro?.bio || "No bio available."}
                </p>

                <div className="expert-divider"></div>

                <p className="expert-section-title">Location</p>
                <div className="expert-tags">
                  {[expertLocationLabel].map((s, i) => (
                    <span key={i} className="expert-tag">
                      {s}
                    </span>
                  ))}
                </div>

                {activeChat.contact.locked && (
                  <button
                    className="unlock-expert-btn"
                    onClick={() => setShowPayment(true)}
                  >
                    {`Unlock Expert Chat - ₪${formatPrice(activeChat?.contact?.chatPrice ?? 0)}`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPayment && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backdropFilter: "blur(5px)",
            background: "rgba(0,0,0,0.38)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              padding: "30px",
              width: "380px",
              boxShadow: "0 14px 35px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: BLOOM.olive }}>Unlock Expert Chat</h2>
            <p style={{ fontSize: 14, color: BLOOM.sub }}>
              Get full access to chat with{" "}
              <strong>{activeChat?.contact?.name || "Expert"}</strong>.
            </p>

            <div
              style={{
                fontSize: 32,
                margin: "20px 0",
                color: BLOOM.forest,
              }}
            >
              {`₪${formatPrice(activeChat?.contact?.chatPrice ?? 0)}`}
            </div>

            <div
              style={{
                fontSize: 13,
                color: BLOOM.sub,
                marginBottom: "12px",
              }}
            >
              {`App revenue 10%: ₪${formatPrice(
                (activeChat?.contact?.chatPrice ?? 0) * 0.1
              )}`}
            </div>

            <div className="credit-card-form" style={{ textAlign: "left" }}>
              <div className="form-group">
                <label className="form-label">Card Number *</label>
                <input
                  type="text"
                  name="cardNumber"
                  className="form-input"
                  placeholder="1234 5678 9012 3456"
                  value={paymentInfo.cardNumber}
                  onChange={handlePaymentChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cardholder Name *</label>
                <input
                  type="text"
                  name="cardName"
                  className="form-input"
                  placeholder="John Doe"
                  value={paymentInfo.cardName}
                  onChange={handlePaymentChange}
                />
              </div>

              <div className="card-row">
                <div className="form-group">
                  <label className="form-label">Expiry Date *</label>
                  <input
                    type="text"
                    name="expiryDate"
                    className="form-input"
                    placeholder="MM/YY"
                    value={paymentInfo.expiryDate}
                    onChange={handlePaymentChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CVV *</label>
                  <input
                    type="text"
                    name="cvv"
                    className="form-input"
                    placeholder="123"
                    value={paymentInfo.cvv}
                    onChange={handlePaymentChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name="saveCard"
                    checked={paymentInfo.saveCard}
                    onChange={handlePaymentChange}
                  />
                  Save card for future payments
                </label>
              </div>
            </div>

            {paymentError && (
              <div className="payment-error">{paymentError}</div>
            )}

            <button
              style={{
                background: `linear-gradient(135deg, ${BLOOM.forest}, ${BLOOM.leaf})`,
                padding: "12px 22px",
                borderRadius: "12px",
                color: "white",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                width: "100%",
                opacity: isPaymentReady ? 1 : 0.7,
              }}
              disabled={!isPaymentReady}
              onClick={async () => {
                if (!isPaymentReady) {
                  setPaymentError("Please fill in all card details.");
                  return;
                }
                if (activeChat?.contact) {
                  const unlocked = await unlockExpertChat(activeChat.contact);
                  setShowPayment(false);
                  if (unlocked) {
                    startExpertChat({ ...activeChat.contact, locked: false });
                    setPaymentInfo(EMPTY_PAYMENT_INFO);
                    setPaymentError("");
                  }
                  return;
                }
                setShowPayment(false);
              }}
            >
              Pay & Unlock
            </button>

            <button
              style={{
                marginTop: 12,
                padding: "10px",
                width: "100%",
                borderRadius: "10px",
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
              onClick={() => setShowPayment(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
