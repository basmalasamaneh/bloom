import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";

import authRoutes from "./routes/authRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import cropsRoutes from "./routes/crops.js";
import notificationsRoutes from "./routes/notificationsRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import messagesRoutes from "./routes/messagesRoutes.js";
import friendsRoutes from "./routes/friendsRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ROUTES
app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/crops", cropsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/messages", messagesRoutes); 
app.use("/api/friends", friendsRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/admin", adminRoutes);
// Create HTTP server for WebSocket
const server = http.createServer(app);

// =======================
// 🌿 WebSocket Server
// =======================
const wss = new WebSocketServer({ noServer: true });

const clients = new Map(); // userId → ws client

// Broadcast helper
globalThis.broadcastMessage = (payload) => {
  const json = JSON.stringify(payload);

  clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(json);
    }
  });
};

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/ws/chat") {
    socket.destroy();
    return;
  }

  const token = url.searchParams.get("token");
  if (!token) {
    socket.destroy();
    return;
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    socket.destroy();
    return;
  }

  req.user = user;

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws, req) => {
  const userId = req.user.id;
  clients.set(userId, ws);

  ws.send(JSON.stringify({ type: "connected", userId }));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "ping") return;

      if (data.type === "send_message") {
        // Payload is forwarded to global handler
        globalThis.broadcastMessage({
          type: "new_message",
          ...data,
        });
      }
    } catch (e) {
      console.error("WS parse error:", e);
    }
  });

  ws.on("close", () => {
    clients.delete(userId);
  });
});

// HEALTH
app.get("/", (req, res) => {
  res.send("🌿 Backend with WebSocket running!");
});

server.listen(PORT, () =>
  console.log(`🌿 HTTP + WebSocket server running at http://localhost:${PORT}`)
);
