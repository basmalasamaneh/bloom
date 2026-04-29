// src/components/Header.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaLeaf, FaUserCircle } from "react-icons/fa";
import { FiLogOut, FiBell } from "react-icons/fi";
import UserProfile from "../pages/UserProfile";
import { createPortal } from "react-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const AUTH_BASE = `${API_BASE}/auth`;
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "http://localhost:5000";
  }
})();

const COMMUNITY_FOCUS_KEY = "bloom:communityFocusPost";
const COMMUNITY_FOCUS_EVENT = "bloom:focusPost";

const resolveAvatar = (avatar) => {
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  if (avatar.startsWith("/")) return `${API_ORIGIN}${avatar}`;
  return `${API_ORIGIN}/${avatar.replace(/^\/+/, "")}`;
};

export default function Header() {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotiMenu, setShowNotiMenu] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const clickTimerRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${API_BASE}/community/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications((data.notifications || []).filter((n) => !n.is_read));
    } catch (err) {
      console.error("Header notifications load failed:", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  const unreadCount = notifications.length;
  const markNotificationAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        await fetch(`${API_BASE}/community/notifications/${notificationId}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        loadNotifications();
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    },
    [loadNotifications]
  );

  const dismissNotification = (notificationId) => {
    markNotificationAsRead(notificationId);
    setShowNotiMenu(false);
  };

  const handleNotificationClick = (notification) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      dismissNotification(notification.id);
      return;
    }
    clickTimerRef.current = window.setTimeout(async () => {
      clickTimerRef.current = null;
      const messageChat = notification.metadata?.conversation_id;
      if (messageChat) {
        if (typeof window !== "undefined") {
          const query = new URLSearchParams({ chat: String(messageChat) });
          navigate(`/messages?${query.toString()}`);
        } else {
          navigate("/messages");
        }
        await markNotificationAsRead(notification.id);
        setShowNotiMenu(false);
        return;
      }
      const postId = notification.metadata?.post_id;
      if (postId) {
        if (typeof window !== "undefined") {
          localStorage.setItem(COMMUNITY_FOCUS_KEY, String(postId));
          window.dispatchEvent(
            new CustomEvent(COMMUNITY_FOCUS_EVENT, { detail: { postId } })
          );
          if (window.location.pathname !== "/community") {
            navigate("/community");
          }
        } else {
          navigate("/community");
        }
        await markNotificationAsRead(notification.id);
      }
      setShowNotiMenu(false);
    }, 220);
  };

  const [user, setUser] = useState({
    id: null,
    name: "Loading...",
    avatar: "",
    city: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${AUTH_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        const farmer = data?.farmer || data;

        setUser({
          id: farmer.id,
          name: farmer.name,
          avatar: farmer.avatar || farmer.name?.charAt(0),
          city: farmer.city,
        });
      } catch (err) {}
    };

    fetchUser();
  }, []);

  useEffect(() => {
    loadNotifications();
    const handler = () => loadNotifications();
    window.addEventListener("bloom:notifications-refresh", handler);
    return () => {
      window.removeEventListener("bloom:notifications-refresh", handler);
    };
  }, [loadNotifications]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  return (
    
    <div className="header">
      {/* Logo */}
      <div className="logo">
        <FaLeaf className="logo-icon" /> Bloom
      </div>

      {/* RIGHT SIDE: Notifications + User */}
      <div className="header-right">
        
        {/* NOTIFICATION ICON */}
        <div className="header-notif-wrapper">
          <FiBell
            className="header-notif-icon"
            onClick={() => {
              setShowNotiMenu(!showNotiMenu);
              setShowUserMenu(false);
            }}
          />

          {unreadCount > 0 && (
            <span className="header-notif-badge">{unreadCount}</span>
          )}

          {/* Notification Dropdown */}
          <div className={`header-dropdown ${showNotiMenu ? "active" : ""}`} style={{ right: "70px" }}>
            {loadingNotifications ? (
              <div className="header-dropdown-item">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="header-dropdown-item">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="header-dropdown-item"
                  style={{ cursor: n.metadata?.post_id ? "pointer" : "default" }}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div>{n.message || n.text || "New activity"}</div>
                  {n.metadata?.post_id && (
                    <div className="notification-hint">Open post</div>
                  )}
                  {n.metadata?.conversation_id && (
                    <div className="notification-hint">Open chat</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* USER INFO */}
        <div
          className="header-user-info"
          onClick={() => {
            setShowProfilePanel(true);
            setShowUserMenu(false);
            setShowNotiMenu(false);
          }}
          style={{ cursor: "pointer" }}
        >
          <div className="header-avatar">
            {resolveAvatar(user.avatar) ? (
              <img
                src={resolveAvatar(user.avatar)}
                alt={user.name}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <span>{user.name?.charAt(0) || "?"}</span>
            )}
          </div>

          <span className="header-username">{user.name}</span>
        </div>

        {/* USER DROPDOWN */}
        <div className={`header-dropdown ${showUserMenu ? "active" : ""}`}>
          <div
            className="header-dropdown-item"
            onClick={() => {
              setShowProfilePanel(true);
              setShowUserMenu(false);
            }}
          >
            <FaUserCircle /> Profile
          </div>

          

          <div
            className="header-dropdown-item"
            onClick={() => {
              localStorage.removeItem("token");
              if (window && window.location) {
                window.location.assign("/signin");
              }
            }}
          >
            <FiLogOut /> Logout
          </div>
        </div>
      </div>

      {/* Header styles */}
      <style>
        {`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0rem;
          padding: 1.5rem 2rem;
          background: #1B4332;
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.15);
          border: 1px solid rgba(46, 139, 87, 0.2);
          animation: slideDown 0.5s ease-out;
          position: relative;
          z-index: 20;
          overflow: visible;
        }

        @keyframes slideDown {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .logo {
          display: flex;
          align-items: center;
          font-size: 2.5rem;
          font-weight: 800;
          color: #FFFFFF;
          position: relative;
        }

        .logo::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 0;
          height: 3px;
          background: linear-gradient(90deg, #2E8B57, #6FCF97);
          animation: expandWidth 2s ease-out forwards;
        }

        @keyframes expandWidth {
          to { width: 100%; }
        }

        .logo-icon {
          margin-right: 0.75rem;
          font-size: 2.8rem;
          color: #F2C94C;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          position: relative;
        }

        /* Avatar */
        .header-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          overflow: hidden;
          background: #2e8b57;
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 10px rgba(46, 139, 87, 0.3);
        }

        .header-avatar::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: rotate(45deg);
          animation: shine 3s infinite;
        }

        @keyframes shine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }

        .header-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        /* Notification */
        .header-notif-wrapper { position: relative; }
        .header-notif-icon {
          color: white;
          font-size: 1.6rem;
          cursor: pointer;
          animation: ring 0.7s infinite;
        }

        .header-notif-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #f2c94c;
          color: #1b4332;
          padding: 2px 6px;
          border-radius: 50%;
          font-size: 0.7rem;
          font-weight: bold;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }

        /* Isolated dropdown */
        .header-dropdown {
          position: absolute;
          top: 60px;
          right: 0;
          background: white;
          width: 240px;
          border-radius: 15px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          transition: 0.25s;
          z-index: 9999;
        }

        .header-dropdown.active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        /* Items (isolated style NOT shared with other UI) */
        .header-dropdown-item {
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1rem;
          color: #333;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          cursor: pointer;
          transition: background 0.2s;
        }

        .header-dropdown-item:hover {
          background: rgba(46, 139, 87, 0.08);
        }

        .notification-hint {
          font-size: 0.75rem;
          color: #4f6f52;
          margin-top: 4px;
        }

        .header-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          transition: all 0.3s ease;
        }

        .header-user-info:hover {
          background: rgba(46, 139, 87, 0.15);
        }

        .header-username {
          color: white;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }
        }

        @keyframes ring {
          0% { transform: rotate(0); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(10deg); }
          100% { transform: rotate(0); }
        }
        .profile-modal {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .profile-container {
          width: min(90vw, 840px);
          max-height: 90vh;
          overflow-y: auto;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
          padding: 1rem;
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(46, 139, 87, 0.2);
          padding-bottom: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          margin: 0;
          color: #1b4332;
        }

        .close-btn {
          background: rgba(46, 139, 87, 0.15);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          cursor: pointer;
          color: #1b4332;
        }

        .modal-content {
          min-height: 200px;
        }
        `}
      </style>

      {showProfilePanel &&
        createPortal(
          <div className="profile-modal" onClick={() => setShowProfilePanel(false)}>
            <div
              className="profile-container"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="modal-header">
                <h2>{user.name}'s Profile</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowProfilePanel(false)}
                  aria-label="Close profile panel"
                >
                  ×
                </button>
              </div>
              <div className="modal-content">
                <UserProfile
                  isOwner
                  userId={user.id}
                  userName={user.name}
                  userAvatar={user.avatar}
                  onBack={() => setShowProfilePanel(false)}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
