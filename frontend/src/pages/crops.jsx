// CropsPage.jsx
import React, { useState, useEffect } from "react";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiDroplet,
  FiCalendar,
  FiFilter,
  FiGrid,
  FiList,
  FiSun,
  FiWind,
  FiThermometer,
  FiActivity,
  FiInfo,
  FiTrendingUp,
  FiAlertCircle,
  FiPackage,
  FiImage,
  FiMapPin,
  FiGlobe, 
} from "react-icons/fi";
import CropDetails from "./CropDetails";
import Header from "../components/Header";

const BLOOM_COLORS = {
  forest: "#2E8B57",
  leaf: "#6FCF97",
  yellow: "#F2C94C",
  cream: "#FAF9F6",
  sage: "#E8F3E8",
  olive: "#1B4332",
  text: "#333333",
  sub: "#4F6F52",
  ORANGE: "#FF6E00",
};

const AUTH_BASE = "http://localhost:5000/api/auth";
const CROPS_BASE = "http://localhost:5000/api/crops";
const AI_CHAT_BASE = "http://localhost:5000/api/ai/chat";
const API_ORIGIN = (() => {
  try {
    return new URL(AUTH_BASE).origin;
  } catch {
    return "";
  }
})();

const resolveMediaUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return url;
};

const mockCrops = [
  {
    id: 1,
    name: "Tomato",
    stage: "Vegetative Growth",
    progress: 60,
    waterIn: "2 days",
    fertIn: "5 days",
    location: "North Field",
    containerType: "Field",
    soilType: "Loamy",
    plantingLocation: "Outdoor Field",
    image: null,
    date: "2023-05-15",
    health: "Good",
    humidity: "65%",
    lastUpdated: "2 hours ago",
    dateAdded: new Date("2023-05-15"),
  },
  {
    id: 2,
    name: "Wheat",
    stage: "Flowering",
    progress: 80,
    waterIn: "1 day",
    fertIn: "7 days",
    location: "East Field",
    containerType: "Field",
    soilType: "Clay",
    plantingLocation: "Outdoor Field",
    image: null,
    date: "2023-04-10",
    health: "Excellent",
    humidity: "70%",
    lastUpdated: "1 hour ago",
    dateAdded: new Date("2023-04-10"),
  },
  {
    id: 3,
    name: "Cucumber",
    stage: "Harvesting Soon",
    progress: 92,
    waterIn: "Today",
    fertIn: "3 days",
    location: "Greenhouse A",
    containerType: "Greenhouse",
    soilType: "Potting Mix",
    plantingLocation: "Greenhouse Bed",
    image: null,
    date: "2023-06-01",
    health: "Good",
    humidity: "75%",
    lastUpdated: "3 hours ago",
    dateAdded: new Date("2023-06-01"),
  },
  {
    id: 4,
    name: "Mint",
    stage: "Healthy",
    progress: 40,
    waterIn: "3 days",
    fertIn: "6 days",
    location: "Herb Garden",
    containerType: "Garden",
    soilType: "Sandy",
    plantingLocation: "Raised Bed",
    image: null,
    date: "2023-05-20",
    health: "Excellent",
    humidity: "60%",
    lastUpdated: "5 hours ago",
    dateAdded: new Date("2023-05-20"),
  },
  // Added more crops for better visualization
  {
    id: 5,
    name: "Lettuce",
    stage: "Seedling",
    progress: 15,
    waterIn: "Today",
    fertIn: "10 days",
    location: "Greenhouse B",
    containerType: "Greenhouse",
    soilType: "Potting Mix",
    plantingLocation: "Container",
    image: null,
    date: "2023-06-10",
    health: "Good",
    humidity: "70%",
    lastUpdated: "1 hour ago",
    dateAdded: new Date("2023-06-10"),
  },
  {
    id: 6,
    name: "Carrots",
    stage: "Seed",
    progress: 5,
    waterIn: "Today",
    fertIn: "14 days",
    location: "West Field",
    containerType: "Field",
    soilType: "Sandy Loam",
    plantingLocation: "Outdoor Field",
    image: null,
    date: "2023-06-12",
    health: "Excellent",
    humidity: "55%",
    lastUpdated: "30 minutes ago",
    dateAdded: new Date("2023-06-12"),
  },
  {
    id: 7,
    name: "Peppers",
    stage: "Fruiting",
    progress: 75,
    waterIn: "2 days",
    fertIn: "4 days",
    location: "South Field",
    containerType: "Field",
    soilType: "Loamy",
    plantingLocation: "Outdoor Field",
    image: null,
    date: "2023-04-25",
    health: "Good",
    humidity: "68%",
    lastUpdated: "4 hours ago",
    dateAdded: new Date("2023-04-25"),
  },
  {
    id: 8,
    name: "Basil",
    stage: "Seedling",
    progress: 20,
    waterIn: "Today",
    fertIn: "8 days",
    location: "Herb Garden",
    containerType: "Garden",
    soilType: "Potting Mix",
    plantingLocation: "Pot",
    image: null,
    date: "2023-06-08",
    health: "Excellent",
    humidity: "72%",
    lastUpdated: "2 hours ago",
    dateAdded: new Date("2023-06-08"),
  },
];

const aiTips = [
  {
    id: 1,
    title: "Optimize Tomato Growth",
    description: "Your tomatoes are in vegetative stage. Consider increasing nitrogen fertilizer by 15% to boost leaf development.",
    icon: <FiTrendingUp />,
    priority: "high",
    cropId: 1,
  },
  {
    id: 2,
    title: "Wheat Harvest Preparation",
    description: "Wheat is 80% mature. Start reducing irrigation frequency to prepare for harvest in approximately 10 days.",
    icon: <FiInfo />,
    priority: "medium",
    cropId: 2,
  },
  {
    id: 3,
    title: "Cucumber Pest Alert",
    description: "High humidity in Greenhouse A increases risk of powdery mildew. Consider improving air circulation or applying preventive treatment.",
    icon: <FiAlertCircle />,
    priority: "high",
    cropId: 3,
  },
];

const inputStyle = {
  marginTop: 4,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(79,111,82,0.25)",
  outline: "none",
  fontSize: 14,
  background: "linear-gradient(145deg,#FFFFFF,#F8FCF8)",
  color: BLOOM_COLORS.text,
};

const LOCATION_OPTIONS_BY_ENV = {
  Indoor: ["Greenhouse", "Container", "Pot", "Grow Room"],
  Outdoor: ["Field", "Garden", "Raised Bed", "Orchard"],
};

const mapCropFromBackend = (row) => {
  if (!row) return null;

  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  const plantingDate = row.planting_date || row.plantingDate || null;

  return {
    id: row.id,
    name: row.name,
    stage: row.stage || "Germination",
    progress: typeof row.progress === "number" ? row.progress : 0,
    waterIn: row.water_in || "2 days",
    fertIn: row.fert_in || "7 days",
    location: row.plant_location || "",
    containerType: row.plant_location || "",
    soilType: row.soil_type || "",
    plantLocation: row.plant_location || "",
    plantingLocation: row.plant_location || "",
    image: row.image_url ? resolveMediaUrl(row.image_url) : null,
    date: plantingDate || "",
    plantingDate: plantingDate || "",
    health: row.health || "Good",
    humidity: row.humidity || "",
    lastUpdated: createdAt.toLocaleDateString(),
    dateAdded: createdAt,
  };
};

// Extracted Crop Card Component
const CropCard = ({ crop, handleDelete, getHealthColor, getStageColor, getContainerColor, onCardClick }) => (
  <div
    style={{
      position: "relative",
      padding: "16px 16px 14px",
      borderRadius: 20,
      background: "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(232,243,232,0.98))",
      boxShadow: "0 14px 34px rgba(46,139,87,0.12)",
      border: "1px solid rgba(255,255,255,0.9)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      cursor: "pointer",
      transition: "all 0.25s ease",
      overflow: "hidden",
    }}
    className="crop-card"
    onClick={() => onCardClick(crop)}
  >
    {/* floating glow */}
    <div
      style={{
        position: "absolute",
        top: -18,
        right: -18,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(111,207,151,0.25), transparent)",
        pointerEvents: "none",
      }}
    />

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 14,
            background: crop.image 
              ? `url(${crop.image}) center/cover` 
              : "linear-gradient(145deg,#6FCF97,#F2C94C)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            overflow: "hidden",
          }}
        >
          {!crop.image && "🌱"}
        </div>
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: BLOOM_COLORS.text,
            }}
          >
            {crop.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: BLOOM_COLORS.sub,
            }}
          >
            {crop.location}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 14,
          color: BLOOM_COLORS.forest,
          fontWeight: 600,
        }}
      >
        {crop.progress}%
      </div>
    </div>

    {/* Stage Badge */}
    <div
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: getStageColor(crop.stage),
        color: "#fff",
        fontSize: 11,
        fontWeight: 500,
        alignSelf: "flex-start",
      }}
    >
      {crop.stage}
    </div>

    {/* progress bar */}
    <div
      style={{
        marginTop: 4,
        width: "100%",
        height: 8,
        borderRadius: 999,
        background: "rgba(232,243,232,0.9)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${crop.progress}%`,
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(90deg,#6FCF97,#2E8B57)",
          transition: "width 0.4s ease-out",
        }}
      />
    </div>

    {/* details */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 4,
        fontSize: 11,
        color: BLOOM_COLORS.sub,
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <FiDroplet size={13} />
        <span>Water in {crop.waterIn}</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <FiCalendar size={13} />
        <span>Fert in {crop.fertIn}</span>
      </div>
    </div>

    {/* health and container indicator */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 4,
        fontSize: 11,
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <FiActivity size={13} color={getHealthColor(crop.health)} />
        <span style={{ color: getHealthColor(crop.health) }}>{crop.health}</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <FiPackage size={13} color={getContainerColor(crop.containerType)} />
        <span style={{ color: getContainerColor(crop.containerType) }}>{crop.containerType}</span>
      </div>
    </div>

    {/* Additional info */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 4,
        fontSize: 10,
        color: BLOOM_COLORS.sub,
        gap: 6,
      }}
    >
      <span>🌍 {crop.soilType}</span>
      <span>📍 {crop.plantingLocation}</span>
      <span>📅 {crop.date}</span>
    </div>

    {/* actions */}
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 8,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => handleDelete(crop.id)}
        style={{
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: "#8B5E3C",
          cursor: "pointer",
        }}
      >
        <FiTrash2 size={13} /> Delete
      </button>
    </div>
  </div>
);

// Extracted Crop List Item Component
const CropListItem = ({ crop, handleDelete, getHealthColor, getStageColor, getContainerColor, onCardClick }) => (
  <div
    style={{
      padding: "14px 18px",
      borderRadius: 16,
      background: "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(232,243,232,0.98))",
      boxShadow: "0 8px 20px rgba(46,139,87,0.08)",
      border: "1px solid rgba(255,255,255,0.9)",
      display: "flex",
      gap: 16,
      cursor: "pointer",
      transition: "all 0.25s ease",
    }}
    className="crop-list-item"
    onClick={() => onCardClick(crop)}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        background: crop.image 
          ? `url(${crop.image}) center/cover` 
          : "linear-gradient(145deg,#6FCF97,#F2C94C)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {!crop.image && "🌱"}
    </div>
    
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: BLOOM_COLORS.text,
          }}
        >
          {crop.name}
        </div>
        <div
          style={{
            fontSize: 14,
            color: BLOOM_COLORS.forest,
            fontWeight: 600,
          }}
        >
          {crop.progress}%
        </div>
      </div>
      
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            background: getStageColor(crop.stage),
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {crop.stage}
        </div>
        
        <div
          style={{
            fontSize: 11,
            color: BLOOM_COLORS.sub,
          }}
        >
          {crop.location}
        </div>
        
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: BLOOM_COLORS.sub,
          }}
        >
          <FiActivity size={13} color={getHealthColor(crop.health)} />
          <span style={{ color: getHealthColor(crop.health) }}>{crop.health}</span>
        </div>
        
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: BLOOM_COLORS.sub,
          }}
        >
          <FiPackage size={13} color={getContainerColor(crop.containerType)} />
          <span style={{ color: getContainerColor(crop.containerType) }}>{crop.containerType}</span>
        </div>
      </div>
      
      <div
        style={{
          width: "100%",
          height: 6,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 999,
            background: "rgba(232,243,232,0.9)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${crop.progress}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg,#6FCF97,#2E8B57)",
              transition: "width 0.4s ease-out",
            }}
          />
        </div>
      </div>
      
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: BLOOM_COLORS.sub,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <FiDroplet size={13} />
          <span>Water in {crop.waterIn}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <FiCalendar size={13} />
          <span>Fert in {crop.fertIn}</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: BLOOM_COLORS.sub,
          }}
        >
          Added {crop.dateAdded.toLocaleDateString()}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 10,
          color: BLOOM_COLORS.sub,
          marginTop: 2,
        }}
      >
        <span>🌍 {crop.soilType}</span>
        <span>📍 {crop.plantingLocation}</span>
        <span>📅 {crop.date}</span>
      </div>
    </div>
    
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        style={{
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: BLOOM_COLORS.forest,
          cursor: "pointer",
        }}
      >
        <FiEdit2 size={13} /> Edit
      </button>
      <button
        onClick={() => handleDelete(crop.id)}
        style={{
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: "#8B5E3C",
          cursor: "pointer",
        }}
      >
        <FiTrash2 size={13} /> Delete
      </button>
    </div>
  </div>
);

const WidgetStat = ({ label, value }) => (
  <div
    style={{
      padding: 10,
      borderRadius: 14,
      background: "linear-gradient(145deg,#FAF9F6,#E8F3E8)",
      border: "1px solid rgba(255,255,255,0.9)",
      boxShadow: "0 6px 14px rgba(27,67,50,0.12)",
      display: "flex",
      flexDirection: "column",
      gap: 2,
    }}
  >
    <span
      style={{
        fontSize: 12,
        color: BLOOM_COLORS.sub,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 18,
        fontWeight: 600,
        color: BLOOM_COLORS.forest,
      }}
    >
      {value}
    </span>
  </div>
);

const CropsPage = () => {
  const [crops, setCrops] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [sortBy, setSortBy] = useState("name"); // name, progress, date
  const [filterStage, setFilterStage] = useState("all");
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState(null);
  const [aiWarning, setAiWarning] = useState(null);
  const [aiPreview, setAiPreview] = useState(null);
  const [newCrop, setNewCrop] = useState({
    plantName: "",
    plantingDate: "",
    environment: "",
    plantLocation: "",
    soilType: "",
    image: null, 
  });

  const dashboardTemperature =
    weather?.temperature_c != null
      ? `${Math.round(weather.temperature_c * 10) / 10}°C`
      : "—";
  const dashboardHumidity =
    weather?.humidity != null ? `${weather.humidity}%` : "—";
  const dashboardWind =
    weather?.wind_speed_kmh != null
      ? `${Math.round(weather.wind_speed_kmh)} km/h`
      : "—";
  const dashboardCondition = weather?.conditions || "Stable skies";
  const dashboardLocation = weather?.location || "Location unavailable";

  const closeAddModal = () => {
    setShowModal(false);
    setAiWarning(null);
    setAiPreview(null);
  };

  useEffect(() => {
    let isMounted = true;

    const loadFarmerAndCrops = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const authHeaders = {};
        if (token) authHeaders.Authorization = `Bearer ${token}`;

        let farmerData = null;
        try {
          const meRes = await fetch(`${AUTH_BASE}/me`, { headers: authHeaders });
          if (meRes.ok) {
            const meJson = await meRes.json();
            farmerData = meJson.farmer || null;
          }
        } catch {
          farmerData = null;
        }

        if (!isMounted) return;

        if (!farmerData) {
          setCrops(mockCrops);
          return;
        }

        setFarmer(farmerData);

        const cropsRes = await fetch(`${CROPS_BASE}/farmer/${farmerData.id}`);
        const text = await cropsRes.text();
        const data = text ? JSON.parse(text) : [];
        if (!cropsRes.ok) {
          throw new Error(data.error || "Failed to load crops");
        }

        const mapped = Array.isArray(data)
          ? data.map(mapCropFromBackend).filter(Boolean)
          : [];

        if (!isMounted) return;
        setCrops(mapped);

        // Load dashboard weather from the first crop, if available
        if (mapped.length > 0) {
          try {
            const detailRes = await fetch(`${CROPS_BASE}/${mapped[0].id}`);
            const detailText = await detailRes.text();
            const detailData = detailText ? JSON.parse(detailText) : {};
            if (detailRes.ok && detailData.weather) {
              setWeather(detailData.weather);
            }
          } catch (wErr) {
            console.error("Failed to load dashboard weather:", wErr);
          }
        }
      } catch (e) {
        console.error("Failed to load crops:", e);
        if (isMounted) {
          setError("Failed to load crops from server. Showing demo data.");
          setCrops(mockCrops);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFarmerAndCrops();

    return () => {
      isMounted = false;
    };
  }, []);

    const filtered = crops
      .filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
      .filter((c) => filterStage === "all" || c.stage === filterStage)
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "progress") return b.progress - a.progress;
      if (sortBy === "date") return b.dateAdded - a.dateAdded; // Sort by date (newest first)
        return 0;
      });

    const suggestNameFromAI = async () => {
      try {
        const prompt = `
You are an agriculture assistant. Suggest a concise crop name (1-3 words) using the details below.
- Soil type: ${newCrop.soilType || "unknown"}
- Environment: ${newCrop.environment || "unknown"}
- Location: ${newCrop.plantLocation || "unknown"}
- Planting date: ${newCrop.plantingDate || "unknown"}
- Image (base64 preview): ${(newCrop.image || "").slice(0, 800)}

Respond with only the crop name, no punctuation or extra text.`;

        const res = await fetch(AI_CHAT_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt }),
        });

        if (!res.ok) throw new Error("AI name request failed");
        const data = await res.json();
        return (data.reply || "").split("\n")[0].trim();
      } catch (err) {
        console.error("AI name suggestion failed:", err);
        return "";
      }
    };

    const previewCropAdvice = async (resolvedName, headers) => {
      const res = await fetch(`${CROPS_BASE}/preview`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          farmer_id: farmer.id,
          name: resolvedName,
          planting_date: newCrop.plantingDate,
          soil_type: newCrop.soilType,
          plant_location: newCrop.plantLocation,
          environment: newCrop.environment,
          image_url: newCrop.image,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to preview crop");
      }

      return data;
    };

    const submitAddCrop = async ({ forceAdd = false } = {}) => {
      let resolvedName = (newCrop.plantName || "").trim();

      if (!resolvedName && newCrop.image) {
        resolvedName = await suggestNameFromAI();
      }

      if (!resolvedName) {
        resolvedName = "My Crop";
      }

      if (!farmer) {
        const created = {
          id: Date.now(),
          plantName: resolvedName,
          plantingDate: newCrop.plantingDate,
          plantLocation: newCrop.plantLocation,
          soilType: newCrop.soilType,
          image: newCrop.image,
          name: resolvedName,
          stage: "Seed",
          progress: 10,
          waterIn: "2 days",
          fertIn: "7 days",
          health: "Good",
          humidity: "65%",
          lastUpdated: "Just now",
          dateAdded: new Date(),
          location: newCrop.plantLocation,
          containerType: newCrop.plantLocation,
          plantingLocation: newCrop.plantLocation,
          date: newCrop.plantingDate,
        };

        setCrops([created, ...crops]);
        setNewCrop({
          plantName: "",
          plantingDate: "",
          environment: "",
          plantLocation: "",
          soilType: "",
          image: null,
        });
        closeAddModal();
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        let previewData = aiPreview;

        if (!forceAdd) {
          const preview = await previewCropAdvice(resolvedName, headers);
          previewData = preview.ai || null;
          setAiPreview(previewData);

          if (previewData?.suitable_for_selected_environment === false) {
            setAiWarning({
              notes: previewData.suitability_notes || "Not recommended for the selected environment.",
              recommended_environment: previewData.recommended_environment,
              recommended_location: previewData.recommended_location,
              recommended_soil_type: previewData.recommended_soil_type,
            });
            return;
          }
        } else {
          setAiWarning(null);
        }

        const res = await fetch(`${CROPS_BASE}/add`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            farmer_id: farmer.id,
            name: resolvedName,
            planting_date: newCrop.plantingDate,
            soil_type: newCrop.soilType,
            plant_location: newCrop.plantLocation,
            environment: newCrop.environment,
            image_url: newCrop.image,
            ai_preview: previewData,
          }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to add crop");
        }

        const backendCrop = mapCropFromBackend(data.crop);
        if (backendCrop) {
          const enrichedCrop = { ...backendCrop, ai: data.ai, weather: data.weather || null };
          setCrops((prev) => [enrichedCrop, ...prev]);
        }

        setNewCrop({
          plantName: "",
          plantingDate: "",
          environment: "",
          plantLocation: "",
          soilType: "",
          image: null,
        });
        closeAddModal();
      } catch (err) {
        console.error("Failed to add crop:", err);
        setError(err.message || "Failed to add crop");
      } finally {
        setLoading(false);
      }
    };

    const handleAddCrop = (e) => {
      e.preventDefault();
      submitAddCrop();
    };

  const handleDelete = async (id) => {
    if (!id) return;

    if (!farmer) {
      setCrops(crops.filter((c) => c.id !== id));
      if (selectedCrop?.id === id) setSelectedCrop(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${CROPS_BASE}/${id}`, {
        method: "DELETE",
        headers,
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete crop");
      }

      setCrops((prev) => prev.filter((c) => c.id !== id));
      if (selectedCrop?.id === id) {
        setSelectedCrop(null);
      }
    } catch (err) {
      console.error("Failed to delete crop:", err);
      setError(err.message || "Failed to delete crop");
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (crop) => {
    setSelectedCrop(crop);

    if (!crop?.id) return;

    try {
      const res = await fetch(`${CROPS_BASE}/${crop.id}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok || !data.crop) return;

      const backendCrop = mapCropFromBackend(data.crop);
      const enrichedCrop = backendCrop
        ? { ...backendCrop, ai: data.ai, weather: data.weather || null }
        : { ...crop, ai: data.ai, weather: data.weather || null };

      setSelectedCrop(enrichedCrop);
      if (backendCrop) {
        setCrops((prev) =>
          prev.map((c) => (c.id === backendCrop.id ? enrichedCrop : c))
        );
      }
    } catch (err) {
      console.error("Failed to load crop details:", err);
    }
  };

  const getHealthColor = (health) => {
    if (health === "Excellent") return BLOOM_COLORS.yellow;
    if (health === "Good") return BLOOM_COLORS.yellow;
    return BLOOM_COLORS.sub;
  };

  const getStageColor = (stage) => {
    if (stage.includes("Harvest")) return BLOOM_COLORS.ORANGE; // lowercase orange if defined
    if (stage.includes("Flowering")) return BLOOM_COLORS.yellow;
    if (stage.includes("Healthy")) return BLOOM_COLORS.yellow;
    if (stage.includes("Vegetative")) return BLOOM_COLORS.yellow;
    return BLOOM_COLORS.yellow; // default color now yellow
  };

  const getPriorityColor = (priority) => {
    if (priority === "high") return "#E74C3C";
    if (priority === "medium") return BLOOM_COLORS.yellow;
    return BLOOM_COLORS.leaf;
  };

  const getContainerColor = (type) => {
    if (type === "Greenhouse") return BLOOM_COLORS.leaf;
    if (type === "Garden") return BLOOM_COLORS.leaf;
    return BLOOM_COLORS.forest;
  };

  // Calculate growth stage distribution
  const getGrowthStageDistribution = () => {
    const stageCategories = {
      "Seed": ["Seed", "Seeding", "Germination"],
      "Sprout": ["Sprout", "Seedling"],
      "Veg": ["Vegetative", "Vegetative Growth"],
      "Bloom": ["Flowering", "Bloom", "Flowering"],
      "Fruit": ["Fruiting", "Fruit", "Fruiting"],
      "Harvest": ["Harvesting", "Harvesting Soon", "Ready", "Harvest"]
    };
    
    const stageCounts = {};
    Object.keys(stageCategories).forEach(category => {
      stageCounts[category] = 0;
    });
    
    crops.forEach(crop => {
      for (const [category, keywords] of Object.entries(stageCategories)) {
        if (keywords.some(keyword => crop.stage.toLowerCase().includes(keyword.toLowerCase()))) {
          stageCounts[category]++;
          break;
        }
      }
    });
    
    const totalCrops = crops.length || 1;
    return Object.entries(stageCounts).map(([label, count]) => ({
      label,
      value: Math.round((count / totalCrops) * 100),
      count
    }));
  };

  // Get bar colors based on stage
  const getBarColor = (index) => {
    const colors = [
      "#8BC34A", // Seed - light green
      "#9CCC65", // Sprout - lighter green
      "#689F38", // Veg - medium green
      "#FFC107", // Bloom - yellow
      "#FF9800", // Fruit - orange
      "#FF5722"  // Harvest - red-orange
    ];
    return colors[index] || "#689F38";
  };

  // Get stage icon
  const getStageIcon = (stage) => {
    switch(stage) {
      case "Seed": return "🌰";
      case "Sprout": return "🌱";
      case "Veg": return "🌿";
      case "Bloom": return "🌸";
      case "Fruit": return "🍎";
      case "Harvest": return "🌾";
      default: return "🌱";
    }
  };

    return (
      <div
        className="bloom-page"
        style={{
          background: `radial-gradient(circle at top left, rgba(111,207,151,0.09), transparent),
                     radial-gradient(circle at top right, rgba(242,201,76,0.06), transparent),
                     ${BLOOM_COLORS.cream}`,
        padding: "0",
        height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Header />

      {/* MAIN CONTENT */}
      
      <main
        style={{
          flex: 1,
          padding: "24px 32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(260px, 1.2fr)",
            gap: 24,
          }}
        >
          {/* Crops Grid/List */}
          <section
            style={{
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            {/* Search and Add Bar - MOVED HERE */}
            <div
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(232,243,232,0.98))",
                borderRadius: 20,
                padding: "16px 20px",
                marginBottom: 24,
                boxShadow: "0 8px 24px rgba(46,139,87,0.1)",
                border: "1px solid rgba(255,255,255,0.9)",
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  flex: 1,
                  position: "relative",
                }}
              >
                <FiSearch
                  size={20}
                  style={{
                    position: "absolute",
                    left: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(79,111,82,0.7)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search crops, stages, locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px 12px 48px",
                    borderRadius: 12,
                    border: "1px solid rgba(79,111,82,0.2)",
                    outline: "none",
                    background: "rgba(255,255,255,0.9)",
                    fontSize: 16,
                    color: BLOOM_COLORS.text,
                    transition: "all 0.25s ease",
                  }}
                />
              </div>
              
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 12,
                  padding: "12px 20px",
                  border: "none",
                  cursor: "pointer",
                  background: BLOOM_COLORS.yellow,
                  color: BLOOM_COLORS.olive,
                  fontWeight: 600,
                  fontSize: 16,
                  boxShadow: "0 8px 20px rgba(242,201,76,0.3)",
                  transition: "all 0.25s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <FiPlus size={20} />
                <span>Add Crop</span>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    color: BLOOM_COLORS.text,
                    fontWeight: 600,
                  }}
                >
                  Your Crops
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: BLOOM_COLORS.sub,
                  }}
                >
                  Click on any crop to view detailed information
                </p>
              </div>
              
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(79,111,82,0.25)",
                    background: "rgba(255,255,255,0.8)",
                    fontSize: 14,
                    color: BLOOM_COLORS.text,
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Stages</option>
                  <option value="Vegetative Growth">Vegetative</option>
                  <option value="Flowering">Flowering</option>
                  <option value="Harvesting Soon">Harvesting</option>
                  <option value="Healthy">Healthy</option>
                  <option value="Seedling">Seedling</option>
                  <option value="Seed">Seed</option>
                  <option value="Fruiting">Fruiting</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(79,111,82,0.25)",
                    background: "rgba(255,255,255,0.8)",
                    fontSize: 14,
                    color: BLOOM_COLORS.text,
                    cursor: "pointer",
                  }}
                >
                  <option value="name">Sort by Name</option>
                  <option value="progress">Sort by Stage</option>
                  <option value="date">Sort by Date</option>
                </select>
                
                <div
                  style={{
                    display: "flex",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid rgba(79,111,82,0.25)",
                  }}
                >
                  <button
                    onClick={() => setViewMode("grid")}
                    style={{
                      padding: "8px 12px",
                      border: "none",
                      background: viewMode === "grid" ? BLOOM_COLORS.leaf : "rgba(255,255,255,0.8)",
                      color: viewMode === "grid" ? "#fff" : BLOOM_COLORS.text,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <FiGrid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    style={{
                      padding: "8px 12px",
                      border: "none",
                      background: viewMode === "list" ? BLOOM_COLORS.leaf : "rgba(255,255,255,0.8)",
                      color: viewMode === "list" ? "#fff" : BLOOM_COLORS.text,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <FiList size={16} />
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                {filtered.map((crop) => (
                  <CropCard
                    key={crop.id}
                    crop={crop}
                    handleDelete={handleDelete}
                    getHealthColor={getHealthColor}
                    getStageColor={getStageColor}
                    getContainerColor={getContainerColor}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {filtered.map((crop) => (
                  <CropListItem
                    key={crop.id}
                    crop={crop}
                    handleDelete={handleDelete}
                    getHealthColor={getHealthColor}
                    getStageColor={getStageColor}
                    getContainerColor={getContainerColor}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <div
                style={{
                  padding: 20,
                  borderRadius: 22,
                  background: "linear-gradient(145deg,#E8F3E8,#FAF9F6)",
                  border: "1px dashed rgba(46,139,87,0.4)",
                  textAlign: "center",
                  color: BLOOM_COLORS.sub,
                  fontSize: 14,
                }}
              >
                🌱 No crops match this search.
                <br />
                Try another name or{" "}
                <span
                  style={{
                    color: BLOOM_COLORS.forest,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => setShowModal(true)}
                >
                  add a new crop.
                </span>
              </div>
            )}
          </section>

          {/* Right side widgets */}
          <aside
            style={{
              padding: "32px 16px", 
              borderRadius: 24,
              background: "linear-gradient(180deg,rgba(255,255,255,0.98),rgba(232,243,232,0.96))",
              boxShadow: "0 14px 40px rgba(27,67,50,0.16)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                color: BLOOM_COLORS.text,
                fontWeight: 600,
              }}
            >
              Crop Overview
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: BLOOM_COLORS.sub,
              }}
            >
               Overview of your crops and their status.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 8,
                fontSize: 14,
              }}
            >
              <WidgetStat label="Total Crops" value={crops.length} />
              <WidgetStat
                label="Ready Soon"
                value={crops.filter((c) => c.progress >= 80).length}
              />
              <WidgetStat
                label="Need Water Today"
                value={crops.filter(
                  (c) => c.waterIn.toLowerCase() === "today"
                ).length}
              />
              <WidgetStat
                label="Early Stage"
                value={crops.filter((c) => c.progress < 40).length}
              />
            </div>

            {/* Weather Widget */}
            <div
              style={{
                marginTop: 4,
                padding: 10,
                borderRadius: 18,
                background: "radial-gradient(circle at top,#6FCF9718,#FAF9F6)",
                border: "1px solid rgba(232,243,232,0.9)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: BLOOM_COLORS.sub,
                }}
              >
                Live weather · {dashboardLocation}
              </span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <FiSun size={18} color={BLOOM_COLORS.yellow} />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    {dashboardTemperature}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <FiWind size={16} color={BLOOM_COLORS.sub} />
                  <span style={{ fontSize: 14 }}>{dashboardWind}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <FiDroplet size={16} color={BLOOM_COLORS.sub} />
                  <span style={{ fontSize: 14 }}>{dashboardHumidity}</span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: BLOOM_COLORS.sub,
                  opacity: 0.9,
                }}
              >
                {dashboardCondition}
              </span>
            </div>

           {/* Growth Stage Bar Chart */}
<div
  style={{
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    background: "radial-gradient(circle at top,#E8F3E8,#FAF9F6)",
    border: "1px solid rgba(232,243,232,0.9)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <span
      style={{
        fontSize: 14,
        color: BLOOM_COLORS.sub,
        fontWeight: 600,
      }}
    >
      🌱 Growth Stage Distribution
    </span>
    <span
      style={{
        fontSize: 12,
        color: BLOOM_COLORS.sub,
        opacity: 0.8,
      }}
    >
      Total: {crops.length} crops
    </span>
  </div>

  {/* Chart container with proper axes */}
  <div
    style={{
      position: "relative",
      height: 140,
      display: "flex",
      flexDirection: "column",
    }}
  >
    {/* Y-axis labels */}
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        height: "100%",
        width: 25,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingRight: 4,
      }}
    >
      <span style={{ fontSize: 10, color: BLOOM_COLORS.sub }}>100%</span>
      <span style={{ fontSize: 10, color: BLOOM_COLORS.sub }}>75%</span>
      <span style={{ fontSize: 10, color: BLOOM_COLORS.sub }}>50%</span>
      <span style={{ fontSize: 10, color: BLOOM_COLORS.sub }}>25%</span>
      <span style={{ fontSize: 10, color: BLOOM_COLORS.sub }}>0%</span>
    </div>

    {/* Chart area */}
    <div
      style={{
        marginLeft: 30,
        flex: 1,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 8,
        position: "relative",
        height: "100%",
      }}
    >
      {/* Horizontal grid lines */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {[0, 25, 50, 75, 100].map((percent) => (
          <div
            key={percent}
            style={{
              position: "absolute",
              top: `${percent}%`,
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(79,111,82,0.1)",
            }}
          />
        ))}
      </div>

      {/* Bars */}
      {getGrowthStageDistribution().map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            height: "100%",
            justifyContent: "flex-end",
          }}
        >
          {/* Bar with gradient and shadow */}
          <div
            style={{
              width: "80%",
              height: `${item.value}%`,
              borderRadius: "6px 6px 0 0",
              background: `linear-gradient(180deg, ${getBarColor(i)}CC, ${getBarColor(i)})`,
              boxShadow: `0 0 12px ${getBarColor(i)}40`,
              transition: "all 0.3s ease",
              position: "relative",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = `0 6px 16px ${getBarColor(i)}60`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = `0 0 12px ${getBarColor(i)}40`;
            }}
          >
            {/* Value label on top of bar */}
            <div
              style={{
                position: "absolute",
                top: -20,
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: BLOOM_COLORS.text,
              }}
            >
              {item.value}%
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* X-axis labels with icons */}
  <div
    style={{
      marginLeft: 30,
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
    }}
  >
    {getGrowthStageDistribution().map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 14,
            marginBottom: 2,
          }}
        >
          {getStageIcon(item.label)}
        </div>
        <span
          style={{
            fontSize: 10,
            color: BLOOM_COLORS.text,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {item.label}
        </span>
        <span
          style={{
            fontSize: 9,
            color: BLOOM_COLORS.sub,
          }}
        >
          ({item.count})
        </span>
      </div>
    ))}
  </div>

  <span
    style={{
      fontSize: 12,
      color: BLOOM_COLORS.sub,
      textAlign: "center",
      marginTop: 4,
    }}
  >
    Distribution of crops across growth stages 🌾
  </span>
</div>

            {/* Recent actions */}
            <div
              style={{
                marginTop: 2,
                paddingTop: 4,
                borderTop: "1px solid rgba(232,243,232,1)",
                fontSize: 12,
                color: BLOOM_COLORS.sub,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: BLOOM_COLORS.text,
                }}
              >
                Recent activity
              </span>
              <span>✅ Updated Tomato stage to Vegetative Growth.</span>
              <span>💧 Scheduled irrigation for Wheat in 1 day.</span>
              <span>🌿 Added Cucumber field near East Block.</span>
            </div>
          </aside>
        </div>

        {/* AI Tips Section */}
        <section
          style={{
            padding: "20px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                color: BLOOM_COLORS.text,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
               AI Advice

            </h2>
            <span
              style={{
                fontSize: 14,
                color: BLOOM_COLORS.sub,
              }}
            >
              
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {aiTips.map((tip) => (
              <div
                key={tip.id}
                style={{
                  padding: "16px",
                  borderRadius: 16,
                  background: "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(232,243,232,0.98))",
                  boxShadow: "0 8px 20px rgba(46,139,87,0.08)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  display: "flex",
                  gap: 12,
                  transition: "all 0.25s ease",
                  cursor: "pointer",
                }}
                className="ai-tip-card"
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "linear-gradient(145deg,#6FCF97,#2E8B57)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {tip.icon}
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 600,
                        color: BLOOM_COLORS.text,
                      }}
                    >
                      {tip.title}
                    </h3>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: getPriorityColor(tip.priority),
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: "uppercase",
                      }}
                    >
                      {tip.priority}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: BLOOM_COLORS.sub,
                      lineHeight: 1.4,
                    }}
                  >
                    {tip.description}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 4,
                    }}
                  >
                    <button
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: BLOOM_COLORS.leaf,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Apply Tip
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ADD CROP MODAL */}
      {showModal && (
        <div
          onClick={closeAddModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(600px, 92vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              borderRadius: 26,
              background: "linear-gradient(160deg,#FFFFFF,#E8F3E8)",
              boxShadow: "0 24px 60px rgba(27,67,50,0.38)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 20,
                color: BLOOM_COLORS.text,
              }}
            >
              Add New Crop
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: BLOOM_COLORS.sub,
              }}
            >
              Define your new field and start tracking growth instantly.
            </p>

           <form
  onSubmit={handleAddCrop}
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 14,
  }}
>
  {/* Image Upload */}
  <label className="bloom-label">
    Crop Image (Optional)
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 12,
          border: "2px dashed rgba(79,111,82,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          background: newCrop.image ? `url(${newCrop.image}) center/cover` : "rgba(232,243,232,0.5)",
          transition: "all 0.3s ease",
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                setNewCrop({ ...newCrop, image: e.target.result });
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
        }}
      >
        {!newCrop.image && <FiImage size={24} color={BLOOM_COLORS.sub} />}
      </div>
      <div
        style={{
          fontSize: 12,
          color: BLOOM_COLORS.sub,
        }}
      >
        Click to upload an image of your crop
      </div>
    </div>
  </label>

  {/* Plant Name + Planting Date */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
    }}
    >
      <label className="bloom-label">
        Plant Name
        <input
          type="text"
          value={newCrop.plantName}
          onChange={(e) =>
            setNewCrop({
              ...newCrop,
              plantName: e.target.value,
            })
          }
          placeholder="Optional if you upload an image"
          style={inputStyle}
        />
      </label>

    <label className="bloom-label">
      <FiCalendar size={14} style={{ marginRight: 4 }} />
      Planting Date
      <input
        type="date"
        value={newCrop.plantingDate}
        onChange={(e) =>
          setNewCrop({
            ...newCrop,
            plantingDate: e.target.value,
          })
        }
        required
        style={inputStyle}
      />
    </label>
  </div>

  {/* Environment */}
  <label className="bloom-label">
    Environment
    <select
      value={newCrop.environment}
      onChange={(e) => {
        const nextEnvironment = e.target.value;
        setNewCrop({
          ...newCrop,
          environment: nextEnvironment,
          plantLocation: "",
        });
      }}
      required
      style={inputStyle}
    >
      <option value="">Select environment...</option>
      <option value="Indoor">Indoor</option>
      <option value="Outdoor">Outdoor</option>
    </select>
  </label>

  {/* Plant Location + Soil Type */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
    }}
  >
    <label className="bloom-label">
      Plant Location
      <select
        value={newCrop.plantLocation}
        onChange={(e) =>
          setNewCrop({
            ...newCrop,
            plantLocation: e.target.value,
          })
        }
        required
        disabled={!newCrop.environment}
        style={inputStyle}
      >
        <option value="">
          {newCrop.environment
            ? "Select location..."
            : "Select environment first..."}
        </option>
        {(LOCATION_OPTIONS_BY_ENV[newCrop.environment] || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>

    <label className="bloom-label">
      Soil Type
      <select
        value={newCrop.soilType}
        onChange={(e) =>
          setNewCrop({
            ...newCrop,
            soilType: e.target.value,
          })
        }
        required
        style={inputStyle}
      >
        <option value="">Select soil...</option>
        <option value="Loamy">Loamy</option>
        <option value="Clay">Clay</option>
        <option value="Sandy">Sandy</option>
        <option value="Silty">Silty</option>
        <option value="Peaty">Peaty</option>
        <option value="Chalky">Chalky</option>
        <option value="Potting Mix">Potting Mix</option>
      </select>
    </label>
  </div>

  {aiWarning && (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(231, 76, 60, 0.35)",
        background: "rgba(231, 76, 60, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 600, color: "#8B1E1E" }}>
        ⚠️ Not recommended for the selected environment
      </div>
      <div style={{ fontSize: 13, color: BLOOM_COLORS.text }}>
        {aiWarning.notes}
      </div>
      <div style={{ fontSize: 12, color: BLOOM_COLORS.sub }}>
        Recommended environment: {aiWarning.recommended_environment || "N/A"} • Location: {aiWarning.recommended_location || "N/A"} • Soil: {aiWarning.recommended_soil_type || "N/A"}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            setAiWarning(null);
            setAiPreview(null);
          }}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(231, 76, 60, 0.35)",
            background: "transparent",
            fontSize: 13,
            color: "#8B1E1E",
            cursor: "pointer",
          }}
        >
          Edit Details
        </button>
        <button
          type="button"
          onClick={() => submitAddCrop({ forceAdd: true })}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(90deg,#E74C3C,#C0392B)",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Add Anyway
        </button>
      </div>
    </div>
  )}

  {/* Buttons */}
  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 8,
    }}
  >
    <button
      type="button"
      onClick={closeAddModal}
      style={{
        padding: "10px 16px",
        borderRadius: 999,
        border: "1px solid rgba(79,111,82,0.25)",
        background: "transparent",
        fontSize: 14,
        color: BLOOM_COLORS.sub,
        cursor: "pointer",
      }}
    >
      Cancel
    </button>
    <button
      type="submit"
      style={{
        padding: "10px 18px",
        borderRadius: 999,
        border: "none",
        background: "linear-gradient(90deg,#6FCF97,#2E8B57)",
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 12px 26px rgba(46,139,87,0.45)",
      }}
    >
      Save Crop
    </button>
  </div>
</form>
          </div>
        </div>
      )}

      {/* CROP DETAIL MODAL */}
      {selectedCrop && (
        <CropDetails
          crop={selectedCrop}
          onClose={() => setSelectedCrop(null)}
        />
      )}
    </div>
  );
};

export default CropsPage;
