import React, { useState, useEffect } from "react";
import Avatar from "../components/Avatar";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const AUTH_BASE = `${API_BASE}/auth`;
const USER_BASE = `${AUTH_BASE}/users`;
const COMMUNITY_BASE = `${API_BASE}/community`;
const STORE_BASE = `${API_BASE}/store`;
const DEFAULT_COORDS = { lat: 31.9522, lng: 35.2332 };
const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return ""; }
})();
const resolveUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_BASE.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
};

const MapClickSetter = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
};

export default function UserProfile({
  userId,
  userName,
  userAvatar,
  onBack,
  isOwner,
  onProfileUpdated
}) {
  const [editing, setEditing] = useState(false);
  const [newAvatarDataUrl, setNewAvatarDataUrl] = useState("");
  const [userPosts, setUserPosts] = useState([]);
  const [itemsCount, setItemsCount] = useState(0);
  const [itemsList, setItemsList] = useState([]);
  const [showItemsOnly, setShowItemsOnly] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationCoords, setLocationCoords] = useState(DEFAULT_COORDS);
  const [locationName, setLocationName] = useState("");
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  const [profileInfo, setProfileInfo] = useState({
    name: userName,
    avatar: userAvatar,
    bio: "",
    location: "",
    joinedDate: "",
    followers: 0,
    following: 0,
    isExpert: false
  });

  const [verificationData, setVerificationData] = useState({
    expertise: "",
    yearsOfExperience: "",
    documentType: "degree", // degree, certificate, license
    documentFile: null,
    documentPreview: "",
    documentDataUrl: "",
    otherExpertise: ""
  });

  const [isFollowing, setIsFollowing] = useState(false);
  const [originalProfile, setOriginalProfile] = useState(null);

  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const headers = { ...(options.headers || {}) };
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const fullUrl = url.startsWith("http") ? url : `${AUTH_BASE}${url}`;
    const res = await fetch(fullUrl, { ...options, headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    return json;
  };

  /** Load logged-in user profile */
  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      const data = await authFetch("/me");
      const me = data.farmer;
      const meLocation = me.city || me.village || me.location || "";
      setProfileInfo({
        id: me.id,
        name: me.name,
        avatar: me.avatar,
        bio: me.bio || "",
        location: meLocation,
        joinedDate: new Date(me.created_at).toLocaleString("default", {
          month: "long",
          year: "numeric"
        }),
        followers: me.followers || 0,
        following: me.following || 0,
        isExpert: Boolean(me.expert_verified || me.is_expert)
      });

      // Fetch followers/following counts from the public profile endpoint
      try {
        const counts = await authFetch(`/users/${me.id}`);
        const farmer = counts.farmer || {};
      setProfileInfo((p) => {
        const friendly = farmer.city || farmer.village || farmer.location || p.location || "";
        return {
          ...p,
          followers: farmer.followers || 0,
          following: farmer.following || 0,
          location: friendly,
        };
      });
      setLocationName(farmer.city || farmer.village || farmer.location || profileInfo.location || "");
      const count = await fetchUserItemsCount(me.id);
      setItemsCount(count);
    } catch (err) {
      console.error("Failed to load follower counts:", err);
    }
  })();
}, [isOwner]);

  /** Load viewed user profile */
  useEffect(() => {
    if (isOwner || !userId) return;
    (async () => {
      const data = await authFetch(`/users/${userId}`);
      const u = data.farmer;
      const userLocation = u.city || u.village || u.location || "";
      setProfileInfo({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        bio: u.bio || "",
        location: userLocation,
        joinedDate: new Date(u.created_at).toLocaleString("default", {
          month: "long",
          year: "numeric"
        }),
        followers: u.followers || 0,
        following: u.following || 0,
        isExpert: Boolean(u.expert_verified || u.is_expert)
      });
      setLocationName(userLocation);
      setIsFollowing(u.isFollowing || false);
      const count = await fetchUserItemsCount(userId);
      setItemsCount(count);
    })();
  }, [userId, isOwner]);

  /** Load posts for current profile */
  useEffect(() => {
    const loadPosts = async () => {
      const targetId = isOwner ? profileInfo.id || userId : userId;
      if (!targetId) return;
      const posts = await fetchUserPosts(targetId);
      setUserPosts(posts);
    };
    loadPosts();
  }, [isOwner, profileInfo.id, userId]);

  /** Follow / Unfollow */
  const toggleFollow = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${COMMUNITY_BASE}/users/${userId}/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then((r) => r.json());
    setIsFollowing(res.following);
  };

  const reportUser = async () => {
    const targetId = userId || profileInfo.id;
    if (!targetId) {
      alert("User unavailable.");
      return;
    }
    const reason = window.prompt("Why are you reporting this user?");
    if (!reason || !reason.trim()) return;
    const description = window.prompt("Add details (optional):") || "";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${COMMUNITY_BASE}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetType: "user",
          targetId,
          reason: reason.trim(),
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to submit report.");
      }
      alert("Thanks for the report. Our team will review it.");
    } catch (err) {
      console.error("reportUser error:", err);
      alert(`Failed to submit report: ${err.message}`);
    }
  };

  const requestVerification = () => {
    setShowVerificationForm(true);
  };

  const fetchUserPosts = async (uid) => {
    if (!uid) return [];
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${COMMUNITY_BASE}/users/${uid}/posts`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Posts load failed ${res.status}`);
      const data = await res.json();
      return Array.isArray(data.posts) ? data.posts : [];
    } catch (err) {
      console.error("fetchUserPosts error:", err);
      return [];
    }
  };

  const fetchUserItemsCount = async (uid) => {
    if (!uid) return 0;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${STORE_BASE}/items/user/${uid}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Items load failed ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setItemsList(data);
        return data.length;
      }
      setItemsList([]);
      return 0;
    } catch (err) {
      console.error("fetchUserItemsCount error:", err);
      setItemsList([]);
      return 0;
    }
  };

  const buildFriendlyLocation = (data, coords, fallback = "") => {
    const address = data?.address || {};
    const mainName =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.county;
    const region = address.state || address.region;
    const country = address.country;
    const parts = [mainName, region, country].filter(Boolean);
    if (parts.length) return parts.join(", ");
    if (data?.display_name) return data.display_name;
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
      return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    }
    return fallback;
  };

  const extractHumanLocation = (value = "") => {
    // Try to pick the first text part before/around coordinates or map pins
    const candidates = (value || "")
      .split(/[\n\r]+|📍/)
      .map((p) => p.trim())
      .filter(Boolean);
    const text = candidates.find(
      (p) => /[A-Za-z]/.test(p) && !/^[-\d.,\s]+$/.test(p)
    );
    return text || "";
  };

  const reverseGeocodeLocation = async (coords, fallbackText = "") => {
    const fallback = fallbackText || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    // Try backend reverse geocode first (same endpoint used on the home feed)
    try {
      const res = await fetch(
        `${COMMUNITY_BASE}/geo/reverse?lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lng)}`,
        { headers: { Accept: "application/json", ...authHeaders } }
      );
      if (res.ok) {
        const data = await res.json();
        const friendly = data?.name || buildFriendlyLocation(data, coords, fallback);
        if (friendly) return friendly;
      }
    } catch (err) {
      console.error("Backend reverse geocode failed:", err);
    }

    // Fallback to Nominatim if backend is unavailable
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&zoom=10`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "bloom-app/1.0 (contact: support@bloom)",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return buildFriendlyLocation(data, coords, fallback);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Reverse geocode failed:", err);
      }
    }

    return fallback;
  };

  const parseCoords = (value = "") => {
    const matches = (value || "").match(/-?\d+(\.\d+)?/g);
    if (matches && matches.length >= 2) {
      const lat = parseFloat(matches[0]);
      const lng = parseFloat(matches[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };

  const applyMapSelection = (latlng) => {
    setLocationName("Resolving location...");
    setLocationCoords(latlng);
    setProfileInfo((p) => ({
      ...p,
      location: `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
    }));
    (async () => {
      const friendly = await reverseGeocodeLocation(latlng);
      setLocationName(friendly);
      setProfileInfo((p) => ({
        ...p,
        location: friendly || `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
      }));
    })();
  };

  useEffect(() => {
    const rawLocation = profileInfo.location || "";
    const humanText = extractHumanLocation(rawLocation);
    const coords = parseCoords(rawLocation);
    if (!coords) {
      setLocationName(humanText || rawLocation);
      return;
    }

    // Show any human text immediately while resolving coordinates
    setLocationName(humanText || "Resolving location...");

    let cancelled = false;
    (async () => {
      const friendly = await reverseGeocodeLocation(coords, humanText);
      if (!cancelled) {
        setLocationName(friendly || humanText || rawLocation);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileInfo.location]);

  /** Edit profile */
  const startEditing = () => {
    setOriginalProfile(profileInfo);
    setEditing(true);
  };

  const cancelEditing = () => {
    setProfileInfo(originalProfile);
    setEditing(false);
    setNewAvatarDataUrl("");
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewAvatarDataUrl(reader.result);
      setProfileInfo((p) => ({ ...p, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    const coords = parseCoords(profileInfo.location);
    const coordString = coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "";
    const resolvedName =
      locationName &&
      locationName !== "Resolving location..." &&
      !parseCoords(locationName)
        ? locationName
        : "";
    const humanFromInput = extractHumanLocation(profileInfo.location);

    // Prefer human-friendly name; fall back to raw input; last resort: coords
    let cityToSave = resolvedName || humanFromInput || profileInfo.location || coordString;
    if (!cityToSave && coords) cityToSave = coordString;

    const payload = {
      name: profileInfo.name,
      bio: profileInfo.bio,
      city: cityToSave,
      village: "",
    };
    if (newAvatarDataUrl) payload.avatar = newAvatarDataUrl;

    try {
      const data = await authFetch("/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      const updated = data.farmer || data.user || data;
      const updatedLocation = updated.city || updated.village || updated.location || cityToSave;
      setProfileInfo({
        ...profileInfo,
        name: updated.name,
        avatar: updated.avatar,
        bio: updated.bio,
        location: updatedLocation,
        isExpert: Boolean(updated.expert_verified || updated.is_expert || profileInfo.isExpert)
      });
      setLocationName(updatedLocation);

      onProfileUpdated?.({
        id: updated.id,
        name: updated.name,
        avatar: updated.avatar
      });

      setEditing(false);
      setNewAvatarDataUrl("");
    } catch (err) {
      console.error("saveProfile error:", err);
      alert("Could not update profile. Please try again.");
    }
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsDataURL(file);
    });

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const expertiseField =
      verificationData.expertise === "Other"
        ? (verificationData.otherExpertise || "").trim()
        : verificationData.expertise;

    if (!expertiseField || !verificationData.yearsOfExperience || !verificationData.documentFile) {
      alert("Please fill all required fields and upload a document");
      return;
    }
    
    // Check years of experience is at least 1
    const years = parseInt(verificationData.yearsOfExperience, 10);
    if (!Number.isFinite(years) || years < 1) {
      alert("Years of experience must be at least 1");
      return;
    }
    
    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(verificationData.documentFile.type)) {
      alert("Please upload a PDF, JPG, or PNG file");
      return;
    }

    let documentDataUrl = verificationData.documentDataUrl;
    if (!documentDataUrl) {
      try {
        documentDataUrl = await readFileAsDataUrl(verificationData.documentFile);
      } catch (err) {
        console.error("Document read error:", err);
        alert("Failed to read document. Please try again.");
        return;
      }
    }

    if (typeof documentDataUrl !== "string" || !documentDataUrl.startsWith("data:")) {
      alert("Document data is missing. Please re-upload the file.");
      return;
    }

    const payload = {
      expertise: expertiseField,
      yearsOfExperience: years,
      documentType: verificationData.documentType,
      documentDataUrl,
      documentFileName: verificationData.documentFile.name,
      documentMimeType: verificationData.documentFile.type,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${AUTH_BASE}/verification/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Verification request failed');
      }
      
      alert("Verification request submitted successfully. Our team will review your documents.");
      setShowVerificationForm(false);
      
      // Reset form
      setVerificationData({
        expertise: "",
        yearsOfExperience: "",
        documentType: "degree",
        documentFile: null,
        documentPreview: "",
        documentDataUrl: "",
        otherExpertise: ""
      });
    } catch (error) {
      console.error("Verification request error:", error);
      alert(`Failed to submit verification request: ${error.message}`);
    }
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF, JPG, or PNG file");
      setVerificationData((prev) => ({
        ...prev,
        documentFile: null,
        documentPreview: "",
        documentDataUrl: ""
      }));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setVerificationData((prev) => ({
        ...prev,
        documentFile: file,
        documentPreview: file.type.startsWith('image/') ? result : "",
        documentDataUrl: typeof result === "string" ? result : ""
      }));
    };
    reader.onerror = () => {
      console.error("Document read error:", reader.error);
      alert("Failed to read document. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const displayBio = (profileInfo.bio || "").trim() || "No bio available.";

  return (
     <>
    <div className="profile">
      <style>{`
        /* 🌿 Global Theme Colors */
        :root {
          --primary: #2e8b57;
          --primary-dark: #1b4332;
          --accent: #6fcf97;
          --soft-bg: rgba(255, 255, 255, 0.35);
          --glass-bg: rgba(255, 255, 255, 0.2);
        }

        /* 🎨 Page */
        .profile-page {
          font-family: "Poppins", sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #f4fdf4, #eafaea);
          display: flex;
          flex-direction: column;
        }

        /* 🌈 Header Glass Bar */
        .profile-header {
          backdrop-filter: blur(12px);
          background: linear-gradient(135deg, var(--primary-dark), var(--primary));
          padding: 14px 22px;
          display: flex;
          align-items: center;
          gap: 15px;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.25);
          border-bottom: 1px solid rgba(255,255,255,0.25);
        }

        .profile-header h2 {
          color: #fff;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        /* 🔙 Back Button */
        .back-button {
          background: var(--glass-bg);
          border: 1px solid rgba(255,255,255,0.4);
          padding: 8px 15px;
          border-radius: 30px;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          transition: 0.25s;
        }
        .back-button:hover {
          background: rgba(255,255,255,0.4);
          transform: translateX(-3px);
        }

        /* 📦 Content */
        .profile-content {
          max-width: 1000px;
          margin: auto;
          width: 100%;
          padding: 30px 18px;
        }

        /* 👤 Profile Card */
        .user-header {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(20px);
          border-radius: 26px;
          padding: 35px;
          margin-bottom: 25px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          position: relative;
          animation: fadeIn 0.7s ease;
        }

        /* Avatar */
        .user-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 5px solid #fff;
          box-shadow: 0 12px 35px rgba(46,139,87,0.35);
          transition: 0.3s;
        }
        .user-avatar:hover {
          transform: scale(1.05) rotate(2deg);
        }

        /* Info Layout */
        .user-info {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 28px;
        }

        .user-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Name + Bio */
        .user-name {
          font-size: 30px;
          font-weight: 800;
          color: var(--primary-dark);
        }

        .expert-badge {
          font-size: 12px;
          font-weight: 700;
          color: #1B4332;
          background: rgba(46, 139, 87, 0.15);
          border: 1px solid rgba(46, 139, 87, 0.35);
          padding: 4px 10px;
          border-radius: 999px;
        }

        .user-bio {
          margin-top: 6px;
          font-size: 15px;
          color: #3d6045;
          line-height: 1.5;
        }

        /* ✨ Buttons */
        .follow-button {
          margin-top: 10px;
          background: linear-gradient(135deg, var(--accent), var(--primary));
          color: #fff;
          border: none;
          padding: 10px 22px;
          border-radius: 40px;
          font-size: 14px;
          cursor: pointer;
          letter-spacing: 0.4px;
          transition: 0.25s;
          font-weight: 600;
        }
        .follow-button:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 8px 25px rgba(46, 139, 87, 0.4);
        }

        .follow-button.following {
          background: transparent;
          color: var(--primary);
          border: 2px solid var(--primary);
        }
        .follow-button.following:hover {
          background: rgba(110, 207, 151, 0.15);
        }
        .follow-button.report {
          background: #fff0f0;
          color: #8a1c1c;
          border: 2px solid #f2b5b5;
        }
        .follow-button.report:hover {
          background: #ffe1e1;
          box-shadow: 0 8px 25px rgba(226, 92, 92, 0.25);
        }

        /* 📊 Stats */
        .user-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
          text-align: center;
          gap: 12px;
        }

        .user-stat {
          flex: 1;
          background: #ffffffc0;
          backdrop-filter: blur(12px);
          padding: 14px;
          border-radius: 20px;
          font-size: 14px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.07);
          transition: 0.2s;
        }
        .user-stat:hover {
          transform: scale(1.05);
        }
        .user-stat b {
          font-size: 20px;
          color: var(--primary-dark);
        }

        /* 📝 Facebook-style Posts */
        .profile-posts {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .post-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          overflow: hidden;
        }
        
        .post-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .post-header {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          gap: 12px;
        }
        
        .post-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .post-meta {
          flex: 1;
        }
        
        .post-author {
          font-weight: 600;
          font-size: 15px;
          color: #050505;
          margin: 0;
        }
        
        .post-time {
          font-size: 13px;
          color: #65676b;
          margin: 2px 0 0 0;
        }
        
        .post-content {
          padding: 0 16px 12px;
          font-size: 15px;
          line-height: 1.4;
          color: #050505;
          white-space: pre-wrap;
        }
        .post-location {
          padding: 0 16px 8px;
          font-size: 14px;
          color: #65676b;
        }
        .post-media { padding: 0 16px 12px; }
        .post-media img, .post-media video { width: 100%; border-radius: 8px; }
        
        .post-actions {
          display: flex;
          justify-content: space-around;
          padding: 8px 16px;
          border-top: 1px solid #e4e6eb;
          margin-top: 8px;
        }
        
        /* Store-style items */
        .item-card-profile {
          display: flex;
          gap: 14px;
          padding: 14px;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          transition: 0.2s ease;
        }
        .item-card-profile:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0,0,0,0.08);
        }
        .item-card-img-wrap {
          position: relative;
          min-width: 110px;
          max-width: 110px;
          height: 110px;
          border-radius: 12px;
          overflow: hidden;
          background: #f3f4f6;
        }
        .item-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .item-chip {
          position: absolute;
          top: 8px;
          left: 8px;
          background: #2e8b57;
          color: #fff;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .item-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .item-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }
        .item-card-price {
          font-size: 15px;
          font-weight: 700;
          color: #1f2937;
        }
        .item-meta {
          display: flex;
          gap: 12px;
          font-size: 13px;
          color: #4b5563;
          flex-wrap: wrap;
        }
        .item-card-desc {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.4;
        }
        
        .post-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #65676b;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .post-action-btn:hover {
          background: #f0f2f5;
        }
        
        .post-action-btn svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }

        /* ✨ Animation */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* 📱 Mobile */
        @media (max-width: 768px) {
          .user-info { flex-direction: column; text-align: center; }
          .user-name { font-size: 24px; }
          .user-avatar { width: 90px; height: 90px; }
        }
        
        /* Overlay for modals */
        .profile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          overflow-y: auto;
        }
        
        .profile-panel {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .profile-close {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          transition: background 0.2s;
          z-index: 10;
        }
        
        .profile-close:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        
        /* Verification Form Styles - Standalone */
        .verification-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
          overflow-y: auto;
        }
        
        .verification-form-container {
          background: linear-gradient(135deg, #f8fffe, #f0fdf4);
          border-radius: 20px;
          padding: 0;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
          width: 100%;
          max-width: 600px;
          position: relative;
          animation: verificationSlideIn 0.4s ease;
          overflow: hidden;
        }
        
        @keyframes verificationSlideIn {
          from { 
            opacity: 0; 
            transform: scale(0.9) translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
        
        .verification-header {
          background: linear-gradient(135deg, var(--primary-dark), var(--primary));
          padding: 20px 25px;
          color: white;
          position: relative;
        }
        
        .verification-header h3 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .verification-header p {
          margin: 8px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        
        .verification-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          cursor: pointer;
          transition: all 0.2s;
          color: white;
          border: none;
        }
        
        .verification-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }
        
        .verification-form {
          padding: 30px 25px;
        }
        
        .form-group {
          margin-bottom: 25px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          color: #1a4332;
          font-size: 15px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e0f2e9;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.2s;
          background: white;
          box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: var(--primary);
          outline: none;
          box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
        }
        
        .file-upload {
          position: relative;
          display: inline-block;
          cursor: pointer;
          width: 100%;
        }
        
        .file-upload input[type=file] {
          position: absolute;
          left: -9999px;
        }
        
        .file-upload-label {
          display: block;
          padding: 16px;
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 2px dashed #86efac;
          border-radius: 12px;
          text-align: center;
          transition: all 0.2s;
          font-weight: 500;
          color: #166534;
        }
        
        .file-upload-label:hover {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          border-color: var(--primary);
          transform: translateY(-2px);
        }
        
        .document-preview {
          margin-top: 15px;
          max-height: 200px;
          overflow: hidden;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .document-preview img {
          width: 100%;
          height: auto;
          display: block;
        }
        
        .pdf-preview {
          padding: 25px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          text-align: center;
          border-radius: 12px;
          color: #475569;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .form-actions {
          display: flex;
          gap: 15px;
          margin-top: 30px;
        }
        
        .form-actions button {
          flex: 1;
          padding: 14px 20px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 16px;
        }
        
        .btn-submit {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: white;
          box-shadow: 0 4px 15px rgba(46, 139, 87, 0.3);
        }
        
        .btn-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(46, 139, 87, 0.4);
        }
        
        .btn-cancel {
          background: #f1f5f9;
          color: #475569;
          border: 2px solid #e2e8f0;
        }
        
        .btn-cancel:hover {
          background: #e2e8f0;
          transform: translateY(-2px);
        }
        
        .form-help {
          font-size: 13px;
          color: #64748b;
          margin-top: 8px;
          font-style: italic;
        }
        
        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }
        
        .radio-option {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .radio-option:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        
        .radio-option input {
          margin-right: 12px;
          width: auto;
          cursor: pointer;
        }
        
        .radio-option.selected {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border-color: var(--primary);
        }
        
        .radio-option label {
          margin: 0;
          cursor: pointer;
          font-weight: 500;
        }
      `}</style>
      <div className="profile-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h2 style={{ color: "#fff" }}>Profile</h2>
      </div>

      <div className="profile-content">
        {/* MAIN INFO */}
        <div className="user-header">
          <div className="user-info">
            <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
              <Avatar className="user-avatar" src={profileInfo.avatar} alt={profileInfo.name} />

              {isOwner && editing && (
                <>
                  <input
                    type="file"
                    hidden
                    id="avatarUpload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                  <label
                    htmlFor="avatarUpload"
                    className="follow-button"
                    title="Change profile photo"
                    aria-label="Change profile photo"
                    style={{ cursor: 'pointer' }}
                  >
                    Change Photo
                  </label>
                </>
              )}
            </div>

            <div>
              <div className="user-name-row">
                {editing ? (
                  <input
                    className="user-name"
                    value={profileInfo.name}
                    onChange={(e) => setProfileInfo({ ...profileInfo, name: e.target.value })}
                    aria-label="Display name"
                    placeholder="Your display name"
                  />
                ) : (
                  <h2 className="user-name">{profileInfo.name}</h2>
                )}
                {!editing && profileInfo.isExpert ? (
                  <span className="expert-badge">Expert</span>
                ) : null}
              </div>

              {editing ? (
                <textarea
                  className="user-bio"
                  value={profileInfo.bio}
                  onChange={(e) => setProfileInfo({ ...profileInfo, bio: e.target.value })}
                  aria-label="Bio"
                  placeholder="Tell others about you"
                />
              ) : (
                <p className="user-bio">{displayBio}</p>
              )}

              <div style={{ marginTop: 8, color: "#4b5563", fontSize: 14 }}>
                {editing ? (
                  <input
                    className="user-name"
                    style={{ fontSize: 14 }}
                    value={profileInfo.location}
                    onChange={(e) => {
                      setProfileInfo({ ...profileInfo, location: e.target.value });
                      setLocationName(e.target.value);
                    }}
                    aria-label="Location"
                    placeholder="Your city or village"
                  />
                ) : (
                  <>📍 {locationName || profileInfo.location || "Location not set"}</>
                )}
              {editing && (
                <button
                  className="follow-button"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const parsed = parseCoords(profileInfo.location);
                    setLocationCoords(parsed || DEFAULT_COORDS);
                    setShowLocationPicker(true);
                  }}
                  type="button"
                >
                  Pick on map
                </button>
              )}
            </div>

              {/* ACTION BUTTONS */}
              {!isOwner && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="follow-button" onClick={toggleFollow} type="button">
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button className="follow-button report" onClick={reportUser} type="button">
                    Report
                  </button>
                </div>
              )}

              {isOwner && !editing && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="follow-button" onClick={startEditing} type="button">
                    Edit Profile
                  </button>
                  <button className="follow-button following" onClick={requestVerification} type="button">
                    Verify Account
                  </button>
                </div>
              )}

              {editing && (
                <>
                  <button className="follow-button" onClick={saveProfile}>Save</button>
                  <button className="follow-button following" onClick={cancelEditing}>Cancel</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="user-stats">
          <div className="user-stat"><b>{userPosts.length}</b> Posts</div>
          <div
            className="user-stat"
            style={{ cursor: itemsCount > 0 ? "pointer" : "default" }}
            onClick={() => {
              if (itemsCount > 0) setShowItemsOnly((prev) => !prev);
            }}
            title={itemsCount > 0 ? "Click to view items" : "No items listed"}
          >
            <b>{itemsCount}</b> Items
          </div>
          <div className="user-stat"><b>{profileInfo.followers}</b> Followers</div>
          <div className="user-stat"><b>{profileInfo.following}</b> Following</div>
        </div>

        {/* POSTS & ITEMS GRID */}
        <div className="profile-posts">
          {showItemsOnly && itemsList.length === 0 && <p>No items yet.</p>}
          {!showItemsOnly && userPosts.length === 0 && <p>No posts yet.</p>}

          {!showItemsOnly && userPosts.map((post) => {
            const likesCount = (typeof post.likes_count === 'number') ? post.likes_count : (post.likes || 0);
            const commentsCount = (typeof post.comments_count === 'number') ? post.comments_count : (Array.isArray(post.comments) ? post.comments.length : 0);
            return (
              <div key={post.id} className="post-card">
                <div className="post-header">
                  <Avatar className="post-avatar" src={post.avatar || profileInfo.avatar} alt={post.author || profileInfo.name} />
                  <div className="post-meta">
                    <h3 className="post-author">{post.author || profileInfo.name}</h3>
                    <p className="post-time">{post.timestamp || (post.created_at ? new Date(post.created_at).toLocaleString() : 'Recently')}</p>
                  </div>
                </div>

                <div className="post-content">{post.content}</div>
                {(post.location || post.location_name) && (
                  <div className="post-location">📍 {post.location || post.location_name}</div>
                )}

                {post.media && (
                  <div className="post-media" style={{ padding: '0 16px 12px' }}>
                    {post.media.type === 'photo' ? (
                      <img src={resolveUrl(post.media.url)} alt="Post media" style={{ width: '100%', borderRadius: 8 }} />
                    ) : (
                      <video controls style={{ width: '100%', borderRadius: 8 }}>
                        <source src={resolveUrl(post.media.url)} type="video/mp4" />
                      </video>
                    )}
                  </div>
                )}

                {/* Poll (if any) */}
                {post && post.poll && Array.isArray(post.poll.choices) && (
                  <div className="post-media" aria-label="Post poll">
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>📊 {post.poll.title || 'Poll'}</div>
                    <div>
                      {(post.poll.choices || []).map((c, idx) => {
                        const label = c?.choice_text ?? c?.text ?? (typeof c === 'string' ? c : 'Option');
                        const v = Number((c && (c.votes ?? c.votes_count)) ?? 0) || 0;
                        const total = (post.poll.choices || []).reduce((a, b) => a + (Number((b && (b.votes ?? b.votes_count)) ?? 0) || 0), 0);
                        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                        return (
                          <div key={idx} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                              <span>{label}</span>
                              <span>{pct}% ({v})</span>
                            </div>
                            <div style={{ height: 8, background: '#e4e6eb', borderRadius: 6 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#6ECF97', borderRadius: 6 }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="post-actions">
                  <button className="post-action-btn" aria-label={(post.userLiked ? 'Unlike' : 'Like') + ` post`} title={(post.userLiked ? 'Unlike' : 'Like') + ` post`}>
                    {post.userLiked ? '❤️' : '🤍'} {likesCount}
                  </button>
                  <button className="post-action-btn" aria-label={`Comments`} title={`Comments`}>
                    💬 {commentsCount}
                  </button>
                  <button className="post-action-btn" aria-label={`Share`} title={`Share`}>
                    🔄 Share
                  </button>
                </div>
              </div>
            );
          })}

          {itemsList.map((item) => (
            <div key={item.id} className="item-card-profile">
              <div className="item-card-img-wrap">
                <img
                  src={item.image_url || "/img/store/placeholder.png"}
                  alt={item.name}
                  className="item-card-img"
                />
                <span className="item-chip">{item.tag === "rent" ? "FOR RENT" : "FOR SALE"}</span>
              </div>
              <div className="item-card-body">
                <div className="item-card-title">{item.name}</div>
                <div className="item-card-price">
                  {item.price ? `${item.price}${item.tag === "rent" ? " /day" : ""}` : "—"}
                </div>
                <div className="item-meta">
                  <span>📍 {item.location || "Location not set"}</span>
                  {Number.isFinite(item.stock) && <span>Stock: {item.stock}</span>}
                </div>
                <div className="item-card-desc">
                  {item.description || "No description provided."}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showLocationPicker && (
        <div
          className="profile-overlay"
          onClick={() => setShowLocationPicker(false)}
        >
          <div
            className="profile-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "720px", padding: 0 }}
          >
            <div className="profile-close" onClick={() => setShowLocationPicker(false)}>
              ×
            </div>
            <div style={{ padding: "12px 16px" }}>
              <h3>Pick location</h3>
              <p style={{ color: "#4b5563", fontSize: 14, marginBottom: 8 }}>
                Click anywhere on the map or drag the marker. We'll save the resolved place name (coords are only kept as fallback).
              </p>
              <div style={{ height: "320px" }}>
                <MapContainer
                  center={locationCoords}
                  zoom={12}
                  scrollWheelZoom
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={locationCoords}
                    draggable
                    icon={new L.Icon.Default()}
                    eventHandlers={{
                      dragend: (e) => {
                        const latlng = e.target.getLatLng();
                        applyMapSelection(latlng);
                      },
                    }}
                  />
                  <MapClickSetter
                    onSelect={(latlng) => {
                      applyMapSelection(latlng);
                    }}
                  />
                </MapContainer>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: "#374151" }}>
                Current: {locationCoords.lat.toFixed(6)}, {locationCoords.lng.toFixed(6)}
              </div>
            </div>
          </div>
        </div>
      )}

      {showVerificationForm && (
        <div
          className="verification-overlay"
          onClick={() => setShowVerificationForm(false)}
        >
          <div
            className="verification-form-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="verification-header">
              <h3>
                <span>🔐</span>
                Account Verification
              </h3>
              <p>Verify your expertise to build trust with the community</p>
              <button 
                className="verification-close" 
                onClick={() => setShowVerificationForm(false)}
                aria-label="Close verification form"
              >
                ×
              </button>
            </div>
            
            <form className="verification-form" onSubmit={handleVerificationSubmit}>
              <div className="form-group">
                <label htmlFor="expertise">Expertise Field</label>
                <select 
                  id="expertise" 
                  value={verificationData.expertise}
                  onChange={(e) => setVerificationData({...verificationData, expertise: e.target.value})}
                  required
                >
                  <option value="">Select your expertise</option>
                  <option value="Agronomy">Agronomy</option>
                  <option value="Plant Diseases">Plant Diseases</option>
                  <option value="Irrigation">Irrigation</option>
                  <option value="Soil Science">Soil Science</option>
                  <option value="Organic Farming">Organic Farming</option>
                  <option value="Pest Management">Pest Management</option>
                  <option value="Horticulture">Horticulture</option>
                  <option value="Other">Other</option>
                </select>
                {verificationData.expertise === "Other" && (
                  <input
                    type="text"
                    placeholder="Please specify your expertise"
                    value={verificationData.otherExpertise || ""}
                    onChange={(e) => setVerificationData({...verificationData, otherExpertise: e.target.value})}
                    style={{ marginTop: "10px" }}
                    required
                  />
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="yearsOfExperience">Years of Experience</label>
                <input 
                  type="number" 
                  id="yearsOfExperience" 
                  min="1"
                  value={verificationData.yearsOfExperience}
                  onChange={(e) => setVerificationData({...verificationData, yearsOfExperience: e.target.value})}
                  required
                />
                <div className="form-help">Minimum 1 year of experience required</div>
              </div>
              
              <div className="form-group">
                <label>Verification Document</label>
                <div className="radio-group">
                  <div className={`radio-option ${verificationData.documentType === "degree" ? "selected" : ""}`}>
                    <input 
                      type="radio" 
                      id="degree" 
                      name="documentType" 
                      value="degree"
                      checked={verificationData.documentType === "degree"}
                      onChange={(e) => setVerificationData({...verificationData, documentType: e.target.value})}
                    />
                    <label htmlFor="degree">🎓 University Degree</label>
                  </div>
                  <div className={`radio-option ${verificationData.documentType === "certificate" ? "selected" : ""}`}>
                    <input 
                      type="radio" 
                      id="certificate" 
                      name="documentType" 
                      value="certificate"
                      checked={verificationData.documentType === "certificate"}
                      onChange={(e) => setVerificationData({...verificationData, documentType: e.target.value})}
                    />
                    <label htmlFor="certificate">🧾 Professional Certificate</label>
                  </div>
                  <div className={`radio-option ${verificationData.documentType === "license" ? "selected" : ""}`}>
                    <input 
                      type="radio" 
                      id="license" 
                      name="documentType" 
                      value="license"
                      checked={verificationData.documentType === "license"}
                      onChange={(e) => setVerificationData({...verificationData, documentType: e.target.value})}
                    />
                    <label htmlFor="license">🧪 License / Membership</label>
                  </div>
                </div>
                <div className="form-help">
                  {verificationData.documentType === "degree" && "(Agriculture, Biology, Environmental Science...)"}
                  {verificationData.documentType === "license" && "(Agricultural Engineers Syndicate, official organization)"}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="document">Upload Document</label>
                <div className="file-upload">
                  <input 
                    type="file" 
                    id="document" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentChange}
                    required
                  />
                  <label htmlFor="document" className="file-upload-label">
                    {verificationData.documentFile ? 
                      verificationData.documentFile.name : 
                      "📄 Choose file (PDF, JPG, PNG)"
                    }
                  </label>
                </div>
                <div className="form-help">Accepted formats: PDF / JPG / PNG</div>
                
                {verificationData.documentPreview && (
                  <div className="document-preview">
                    <img src={verificationData.documentPreview} alt="Document preview" />
                  </div>
                )}
                
                {verificationData.documentFile && verificationData.documentFile.type === "application/pdf" && (
                  <div className="pdf-preview">
                    📄 PDF Document: {verificationData.documentFile.name}
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowVerificationForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Submit Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
