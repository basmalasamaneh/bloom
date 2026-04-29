import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  FiSend,
  FiUser,
  FiCopy,
  FiThumbsUp,
  FiThumbsDown,
  FiRefreshCw,
  FiClock
} from "react-icons/fi";
import { FaRobot, FaSeedling } from "react-icons/fa";
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
  messageBg: "#FFFFFF",
};

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "🌿 Hello Farmer! I'm Bloom AI — How can I help you today?",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // 🔥 SEND MESSAGE to Backend (Ollama)
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Backend request
      const res = await axios.post("http://localhost:5000/api/ai/chat", {
        message: userMessage.text,
      });

      const aiReply = {
        id: Date.now() + 1,
        sender: "ai",
        text: res.data.reply || "No response received.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 2,
        sender: "ai",
        text: "❌ AI server error. Please check backend or Ollama.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsTyping(false);
  };

  const copyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: "ai",
        text: "🌿 Hello Farmer! I'm Bloom AI — How can I assist you?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: `
          radial-gradient(circle at top left, rgba(111,207,151,0.09), transparent),
          radial-gradient(circle at top right, rgba(242,201,76,0.06), transparent),
          ${BLOOM.cream}
        `,
      }}
    >
      <Header />


      {/* CHAT AREA */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "14px 18px",
                borderRadius: 20,
                background: msg.sender === "user" ? BLOOM.leaf : BLOOM.messageBg,
                color: msg.sender === "user" ? "white" : BLOOM.text,
                whiteSpace: "pre-wrap",
                boxShadow:
                  msg.sender === "user"
                    ? "0 6px 16px rgba(111,207,151,0.4)"
                    : "0 6px 20px rgba(27,67,50,0.1)",
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                {msg.sender === "ai" ? (
                  <FaRobot color={BLOOM.forest} size={18} />
                ) : (
                  <FiUser color={msg.sender === "user" ? "white" : BLOOM.sub} size={18} />
                )}

                <strong>{msg.sender === "ai" ? "Bloom AI" : "You"}</strong>

                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: msg.sender === "user" ? "rgba(255,255,255,0.7)" : BLOOM.sub,
                  }}
                >
                  <FiClock size={12} />
                  {formatTime(msg.timestamp)}
                </div>
              </div>

              {msg.text}

              {msg.sender === "ai" && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 10,
                    borderTop: `1px solid rgba(79,111,82,0.15)`,
                    paddingTop: 8,
                  }}
                >
                  <button
                    onClick={() => copyMessage(msg.text, msg.id)}
                    style={{ fontSize: 12, border: "none", background: "none", cursor: "pointer" }}
                  >
                    {copiedMessageId === msg.id ? "Copied!" : <><FiCopy size={13} /> Copy</>}
                  </button>

                  <button style={{ fontSize: 12, border: "none", background: "none" }}>
                    <FiThumbsUp size={13} />
                  </button>

                  <button style={{ fontSize: 12, border: "none", background: "none" }}>
                    <FiThumbsDown size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "14px 18px",
                background: BLOOM.messageBg,
                borderRadius: 20,
                display: "flex",
                gap: 8,
                alignItems: "center",
                boxShadow: "0 6px 20px rgba(27,67,50,0.1)",
              }}
            >
              <FaRobot color={BLOOM.forest} size={18} />
              <strong>Bloom AI</strong>
              <div style={{ display: "flex", gap: 4, marginLeft: 10 }}>
                <div className="dot"></div>
                <div className="dot" style={{ animationDelay: "0.2s" }}></div>
                <div className="dot" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <div
        style={{
          padding: "18px 32px",
          background: BLOOM.cream,
          borderTop: "1px solid rgba(79,111,82,0.2)",
          display: "flex",
          gap: 12,
        }}
      >
        <input
          style={{
            flex: 1,
            padding: "14px 18px",
            borderRadius: 18,
            border: "1px solid rgba(79,111,82,0.25)",
            background: "white",
            fontSize: 15,
            outline: "none",
            color: BLOOM.text,
          }}
          placeholder="Ask Bloom AI anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: input.trim() ? BLOOM.yellow : "rgba(242,201,76,0.5)",
            border: "none",
            cursor: input.trim() ? "pointer" : "not-allowed",
          }}
        >
          <FiSend size={22} color={BLOOM.olive} />
        </button>
      </div>

      <style>{`
        .dot {
          width: 7px;
          height: 7px;
          background: ${BLOOM.sub};
          border-radius: 50%;
          animation: pulse 1.4s infinite ease-in-out both;
        }
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.4; transform: scale(0.7); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
