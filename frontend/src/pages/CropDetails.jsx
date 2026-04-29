import React, { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiUpload,
  FiCheckCircle,
  FiDroplet,
  FiSun,
  FiThermometer,
  FiWind,
  FiActivity,
  FiClock,
  FiTrendingUp,
  FiMapPin,
  FiInfo,
  FiBarChart2,
  FiTarget,
} from "react-icons/fi";

/* 🌿 BLOOM COLORS */
const BLOOM = {
  forest: "#2E8B57",
  leaf: "#6FCF97",
  yellow: "#F2C94C",
  cream: "#FAF9F6",
  sage: "#E8F3E8",
  olive: "#1B4332",
  text: "#333",
  sub: "#4F6F52",
  ORANGE: "#FF6E00",
  purple: "#8B5CF6",
  blue: "#3B82F6",
};

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const AI_HEALTH_ENDPOINT = `${API_BASE}/ai/health`;

export default function CropDetailsModal({ crop, onClose }) {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [healthAnalysis, setHealthAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePhase, setActivePhase] = useState(null);

  const aiData = crop.ai || {};
  const healthPredictions = healthAnalysis?.predictions || [];
  const topPrediction = healthPredictions[0] || null;
  const analysisDescription = healthAnalysis?.analysis_description || "";
  const stageInfo = healthAnalysis?.stage_analysis;
  const diseaseInfo = healthAnalysis?.disease_analysis || [];
  const finalDisease =
    healthAnalysis?.final_disease || topPrediction?.label || "Unknown";
  const mismatchWarning = healthAnalysis?.is_crop_mismatch;
  const healthWarning = healthAnalysis?.warning;
  const geminiVision = healthAnalysis?.gemini_vision || {};
  const geminiSymptoms = Array.isArray(geminiVision?.symptoms)
    ? geminiVision.symptoms
    : [];
  const [analysisMode, setAnalysisMode] = useState("disease");

  const formatDate = (value) => {
    if (!value) return "TBD";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "TBD";
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  /* LIFE CYCLE PHASES */
  const stagePresets = [
    {
      key: "germin",
      emoji: "🌱",
      color: BLOOM.leaf,
      description: "Seed sprouting and initial root development",
    },
    {
      key: "seedling",
      emoji: "🌿",
      color: BLOOM.yellow,
      description: "First leaves appear and stem strengthens",
    },
    {
      key: "vegetative",
      emoji: "🍃",
      color: BLOOM.forest,
      description: "Rapid growth of foliage and root system",
    },
    {
      key: "flower",
      emoji: "🌸",
      color: BLOOM.ORANGE,
      description: "Buds form and flowers bloom",
    },
    {
      key: "fruit",
      emoji: "🍎",
      color: BLOOM.olive,
      description: "Pollination and fruit development",
    },
    {
      key: "harvest",
      emoji: "🌾",
      color: BLOOM.leaf,
      description: "Mature crops ready for collection",
    },
  ];

  const getStageStyle = (label) => {
    const key = (label || "").toLowerCase();
    const matched = stagePresets.find((preset) => key.includes(preset.key));
    if (matched) return matched;
    return {
      emoji: "🌱",
      color: BLOOM.leaf,
      description: "Lifecycle stage.",
    };
  };

  const timelineItems = Array.isArray(aiData.timeline_items)
    ? aiData.timeline_items
    : Array.isArray(aiData.timeline)
    ? aiData.timeline
    : [];

  const defaultPhases = [
    {
      label: "Germination",
      emoji: "🌱",
      startDate: formatDate(aiData.germination_start),
      endDate: formatDate(aiData.germination_end),
      color: BLOOM.leaf,
      description: "Seed sprouting and initial root development",
    },
    {
      label: "Seedling",
      emoji: "🌿",
      startDate: formatDate(aiData.seedling_start),
      endDate: formatDate(aiData.seedling_end),
      color: BLOOM.yellow,
      description: "First leaves appear and stem strengthens",
    },
    {
      label: "Vegetative",
      emoji: "🍃",
      startDate: formatDate(aiData.vegetative_start),
      endDate: formatDate(aiData.vegetative_end),
      color: BLOOM.forest,
      description: "Rapid growth of foliage and root system",
    },
    {
      label: "Flowering",
      emoji: "🌸",
      startDate: formatDate(aiData.flowering_start),
      endDate: formatDate(aiData.flowering_end),
      color: BLOOM.ORANGE,
      description: "Buds form and flowers bloom",
    },
    {
      label: "Fruiting",
      emoji: "🍎",
      startDate: formatDate(aiData.fruiting_start),
      endDate: formatDate(aiData.fruiting_end),
      color: BLOOM.olive,
      description: "Pollination and fruit development",
    },
    {
      label: "Harvest",
      emoji: "🌾",
      startDate: formatDate(aiData.harvest_start),
      endDate: formatDate(aiData.harvest_end),
      color: BLOOM.leaf,
      description: "Mature crops ready for collection",
    },
  ];

  const phases =
    timelineItems.length > 0
      ? timelineItems.map((item) => {
          const label = item.stage || "Stage";
          const style = getStageStyle(label);
          return {
            label,
            emoji: style.emoji,
            startDate: formatDate(item.start_date || item.startDate),
            endDate: formatDate(item.end_date || item.endDate),
            color: style.color,
            description: style.description,
          };
        })
      : defaultPhases;

  const activeStageName = (crop.stage || aiData.current_stage || "").toLowerCase();
  const isCurrentStage = (label) =>
    activeStageName && activeStageName.includes(label.toLowerCase());

  // Find the current phase based on crop stage
  const currentPhase = phases.find(phase => isCurrentStage(phase.label)) || phases[0];

  const weather = crop.weather || (crop.ai && crop.ai.weather) || null;
  const weatherLocation = (weather && weather.location) || crop.plantLocation || crop.location || "";
  const weatherTemp = weather && typeof weather.temperature_c === "number" ? weather.temperature_c : null;
  const weatherHumidity = weather && typeof weather.humidity === "number" ? weather.humidity : null;
  const weatherConditions = (weather && weather.conditions) || "";

  const irrigationAdvice = aiData.irrigation || crop.waterIn || "N/A";
  const fertilizerAdvice = aiData.fertilizer || crop.fertIn || "N/A";
  const careNotes =
    aiData.care_tips ||
    [
      aiData.care?.watering,
      aiData.care?.fertilizer,
      aiData.care?.sunlight,
      aiData.care?.soil,
      aiData.care?.pests,
    ]
      .filter(Boolean)
      .join(" ") || "Follow the recommended care plan.";
  const progressDisplay =
    typeof crop.progress === "number" ? `${crop.progress}%` : "N/A";
  const temperatureText =
    weatherTemp != null ? `${Math.round(weatherTemp * 10) / 10}°C` : "N/A";
  const weatherDetailText = weatherConditions
    ? `${weatherConditions}`
    : "Stable skies";

  /* Upload image handler */
  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target.result);
        setHealthAnalysis(null);
        setAnalysisError("");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  useEffect(() => {
    setUploadedImage(null);
    setHealthAnalysis(null);
    setAnalysisError("");
    setIsAnalyzing(false);
  }, [crop?.id]);

  const analyzePlantHealth = async () => {
    if (!uploadedImage) return;
    setIsAnalyzing(true);
    setAnalysisError("");
    try {
      const res = await fetch(AI_HEALTH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: uploadedImage,
          plantName: crop?.name,
          environment: crop?.environment,
          plantLocation: crop?.plantLocation || crop?.location,
          description: crop?.description || aiData?.recommendation_reason || "",
          analysis_mode: analysisMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI health analysis failed");
      }
      setHealthAnalysis(data.analysis || null);
    } catch (err) {
      setHealthAnalysis(null);
      setAnalysisError(err.message || "AI health analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(111,207,151,0.2) 0%, rgba(111,207,151,0) 70%)",
          top: "-100px",
          right: "-100px",
          animation: "float 15s infinite ease-in-out",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(242,201,76,0.2) 0%, rgba(242,201,76,0) 70%)",
          bottom: "-80px",
          left: "-80px",
          animation: "float 20s infinite ease-in-out reverse",
        }}
      />

      <div
        style={{
          width: "95%",
          maxWidth: 1000,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(20px)",
          padding: 35,
          borderRadius: 30,
          boxShadow: "0px 25px 60px rgba(27,67,50,0.3)",
          border: "1px solid rgba(255,255,255,0.5)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 25,
          }}
        >
          <div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(46,139,87,0.1)",
                border: "none",
                color: BLOOM.forest,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 15px",
                borderRadius: 12,
                fontWeight: 600,
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.background = BLOOM.forest;
                e.target.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "rgba(46,139,87,0.1)";
                e.target.style.color = BLOOM.forest;
              }}
            >
              <FiArrowLeft size={18} /> Back to Crops
            </button>

            <h1
              style={{
                marginTop: 15,
                fontSize: 32,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${BLOOM.forest}, ${BLOOM.leaf})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {crop.name} – Life Cycle 
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: BLOOM.leaf,
                  animation: "pulse 2s infinite",
                }}
              />
              <p style={{ color: BLOOM.sub, margin: 0 }}>
                Current Stage:{" "}
                <b style={{ color: BLOOM.forest }}>{crop.stage}</b>
              </p>
            </div>
          </div>

          <div
            style={{
              background: `linear-gradient(135deg, ${currentPhase.color}, ${BLOOM.sage})`,
              width: 80,
              height: 80,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              boxShadow: `0 10px 25px ${currentPhase.color}40`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Animated background for the icon */}
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                transform: "scale(0)",
                animation: "pulse 2s infinite",
              }}
            />
            {currentPhase.emoji}
          </div>
        </div>

        {/* 🔥 CIRCULAR LIFE CYCLE TIMELINE */}
        <div style={{ marginTop: 30, marginBottom: 40 }}>
          <h3
            style={{
              textAlign: "center",
              fontSize: 24,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${BLOOM.forest}, ${BLOOM.leaf})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 30,
            }}
          >
              Estimated Life Cycle Timeline
          </h3>

          {/* Circular Timeline Container */}
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 400,
            }}
          >
            {/* Center circle with crop name */}
            <div
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 2,
                boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                border: `2px solid ${BLOOM.forest}30`,
              }}
            >
              <div style={{ fontSize: 32 }}>{currentPhase.emoji}</div>
              <div style={{ 
                fontSize: 14, 
                fontWeight: 700, 
                color: BLOOM.forest,
                textAlign: "center"
              }}>
                {crop.name}
              </div>
            </div>

            {/* Circular Path */}
            <svg
              width="340"
              height="340"
              style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            >
              {/* Gradient definition for the circular path */}
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={BLOOM.leaf} />
                  <stop offset="20%" stopColor={BLOOM.yellow} />
                  <stop offset="40%" stopColor={BLOOM.forest} />
                  <stop offset="60%" stopColor={BLOOM.ORANGE} />
                  <stop offset="80%" stopColor={BLOOM.olive} />
                  <stop offset="100%" stopColor={BLOOM.leaf} />
                </linearGradient>
              </defs>
              
              {/* Circular path */}
              <circle
                cx="170"
                cy="170"
                r="150"
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth="4"
                strokeDasharray="5,5"
              />
            </svg>

            {/* Phase nodes positioned in a circle */}
            {phases.map((p, index) => {
              // Calculate position on circle
              const angle = (index * 360 / phases.length) - 90; // Start from top
              const radian = (angle * Math.PI) / 180;
              const radius = 150;
              const x = radius * Math.cos(radian);
              const y = radius * Math.sin(radian);
              
              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    zIndex: 3,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: isCurrentStage(p.label)
                        ? "white"
                        : "rgba(255,255,255,0.8)",
                      border: isCurrentStage(p.label)
                        ? `4px solid ${p.color}`
                        : `3px solid ${p.color}`,
                      boxShadow: isCurrentStage(p.label)
                        ? `0 0 15px ${p.color}`
                        : "0 4px 8px rgba(0,0,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      marginBottom: 8,
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                    onClick={() => setActivePhase(activePhase === index ? null : index)}
                  >
                    {p.emoji}
                  </div>

                  <div
                    style={{
                      background: isCurrentStage(p.label)
                        ? p.color
                        : "rgba(255,255,255,0.9)",
                      color: isCurrentStage(p.label) ? "white" : BLOOM.text,
                      padding: "6px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      textAlign: "center",
                      minWidth: 80,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {p.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phase details panel */}
          {activePhase !== null && (
            <div
              style={{
                background: "rgba(255,255,255,0.9)",
                borderRadius: 16,
                padding: 20,
                marginTop: 20,
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                border: `1px solid ${phases[activePhase].color}`,
                animation: "slideIn 0.3s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: phases[activePhase].color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  {phases[activePhase].emoji}
                </div>

                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      color: phases[activePhase].color,
                    }}
                  >
                    {phases[activePhase].label}
                  </h4>
                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 14,
                      color: BLOOM.sub,
                    }}
                  >
                    {phases[activePhase].description}
                  </p>
                </div>

                {/* Modified date display - same row */}
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 13,
                    color: BLOOM.sub,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "rgba(46,139,87,0.05)",
                    borderRadius: 8,
                  }}
                >
                  <FiClock size={14} />
                  <span>{phases[activePhase].startDate}</span>
                  <span style={{ color: phases[activePhase].color }}>→</span>
                  <span>{phases[activePhase].endDate}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DETAILS + IRRIGATION - REDESIGNED */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 25,
            marginBottom: 30,
          }}
        >
          {/* Plant Details Card - REDESIGNED */}
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(10px)",
              borderRadius: 20,
              padding: 25,
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              border: "1px solid rgba(255,255,255,0.7)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Header with gradient accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: 5,
                background: "linear-gradient(90deg, #6FCF97, #2E8B57)",
              }}
            />
            
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 25 }}>
              <div
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #6FCF97, #2E8B57)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 20,
                }}
              >
                <FiActivity />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: BLOOM.text,
                  }}
                >
                  Plant Details
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: BLOOM.sub }}>
                  Basic information about your crop
                </p>
              </div>
            </div>

            {/* Details grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 15,
              }}
            >
              {/* Planting Date Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(111,207,151,0.1), rgba(46,139,87,0.05))",
                  borderRadius: 16,
                  padding: 15,
                  border: "1px solid rgba(111,207,151,0.2)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 15px rgba(46,139,87,0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(111,207,151,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: BLOOM.forest,
                    }}
                  >
                    <FiCalendar size={20} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: BLOOM.sub }}>
                      Planting Date
                    </p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: BLOOM.forest }}>
                      {crop.plantingDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Soil Type Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(242,201,76,0.1), rgba(255,110,0,0.05))",
                  borderRadius: 16,
                  padding: 15,
                  border: "1px solid rgba(242,201,76,0.2)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 15px rgba(242,201,76,0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(242,201,76,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: BLOOM.ORANGE,
                    }}
                  >
                    <FiSun size={20} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: BLOOM.sub }}>
                      Soil Type
                    </p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: BLOOM.ORANGE }}>
                      {crop.soilType}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.05))",
                  borderRadius: 16,
                  padding: 15,
                  border: "1px solid rgba(59,130,246,0.2)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 15px rgba(59,130,246,0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(59,130,246,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: BLOOM.blue,
                    }}
                  >
                    <FiMapPin size={20} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: BLOOM.sub }}>
                      Location
                    </p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: BLOOM.blue }}>
                      {crop.plantLocation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Irrigation & Growth Card - REDESIGNED */}
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(10px)",
              borderRadius: 20,
              padding: 25,
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              border: "1px solid rgba(255,255,255,0.7)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Header with gradient accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: 5,
                background: "linear-gradient(90deg, #3B82F6, #1B4332)",
              }}
            />
            
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 25 }}>
              <div
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #3B82F6, #1B4332)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 20,
                }}
              >
                <FiTrendingUp />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: BLOOM.text,
                  }}
                >
                  Irrigation & Growth
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: BLOOM.sub }}>
                  Watering, fertilizer and growth progress
                </p>
              </div>
            </div>

            {/* Progress indicator */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(46,139,87,0.05))",
                borderRadius: 16,
                padding: 15,
                marginBottom: 20,
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FiBarChart2 color={BLOOM.blue} size={18} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: BLOOM.text }}>
                    Growth Progress
                  </span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: BLOOM.blue }}>
                  {progressDisplay}
                </span>
              </div>
              
              {/* Progress bar */}
              <div
                style={{
                  height: 8,
                  background: "rgba(59,130,246,0.1)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: progressDisplay === "N/A" ? "0%" : progressDisplay,
                    background: "linear-gradient(90deg, #3B82F6, #6FCF97)",
                    borderRadius: 4,
                    transition: "width 1s ease-in-out",
                  }}
                />
              </div>
            </div>

            {/* Care advice cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 15,
                marginBottom: 20,
              }}
            >
              {/* Watering Plan Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(111,207,151,0.1), rgba(46,139,87,0.05))",
                  borderRadius: 16,
                  padding: 15,
                  border: "1px solid rgba(111,207,151,0.2)",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(111,207,151,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: BLOOM.forest,
                    }}
                  >
                    <FiDroplet size={16} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: BLOOM.forest }}>
                    Watering Plan
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: BLOOM.sub, lineHeight: 1.4 }}>
                  {irrigationAdvice}
                </p>
              </div>

              {/* Fertilizer Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(242,201,76,0.1), rgba(255,110,0,0.05))",
                  borderRadius: 16,
                  padding: 15,
                  border: "1px solid rgba(242,201,76,0.2)",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(242,201,76,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: BLOOM.ORANGE,
                    }}
                  >
                    <FiSun size={16} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: BLOOM.ORANGE }}>
                    Fertilizer
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: BLOOM.sub, lineHeight: 1.4 }}>
                  {fertilizerAdvice}
                </p>
              </div>
            </div>

            {/* AI Care Notes Card */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.05))",
                borderRadius: 16,
                padding: 15,
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(139,92,246,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: BLOOM.purple,
                  }}
                >
                  <FiInfo size={16} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: BLOOM.purple }}>
                  AI Care Tips
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: BLOOM.sub, lineHeight: 1.4 }}>
                {careNotes}
              </p>
            </div>
          </div>
        </div>

        {/* ENVIRONMENT - MODIFIED TO 3 MAIN CARDS */}
        <ModernCard
          title="🌡️ Environmental Conditions"
          icon={<FiThermometer />}
          gradient="linear-gradient(135deg, #F2C94C, #FF6E00)"
          style={{ marginBottom: 30 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            <MainEnvCard 
              icon={<FiSun />} 
              label="Light" 
              value={weatherLocation ? `${weatherLocation}` : "Full Sun"} 
              detail={weatherLocation ? `Location: ${weatherLocation}` : "6-8 hours daily"}
              color={BLOOM.yellow}
            />
            <MainEnvCard 
              icon={<FiDroplet />} 
              label="Humidity" 
              value={weatherHumidity != null ? `${weatherHumidity}%` : (crop.humidity || "65%")} 
              detail={weatherLocation ? "Live humidity near your field" : "Optimal range"}
              color={BLOOM.blue}
            />
            <MainEnvCard 
              icon={<FiThermometer />} 
              label="Temperature" 
              value={temperatureText} 
              detail={weatherDetailText}
              color={BLOOM.ORANGE}
            />
          </div>
        </ModernCard>

        {/* AI HEALTH CHECK */}
        <ModernCard
          title="🤖 AI Health Analysis"
          icon={<FiCheckCircle />}
          gradient="linear-gradient(135deg, #8B5CF6, #FF6E00)"
        >
          {!uploadedImage ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: 20,
                border: "2px dashed rgba(139, 92, 246, 0.3)",
                borderRadius: 16,
                background: "rgba(139, 92, 246, 0.05)",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(139, 92, 246, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  marginBottom: 15,
                }}
              >
                📷
              </div>

              <p style={{ color: BLOOM.sub, marginBottom: 15, textAlign: "center" }}>
                Upload an image of your plant to get AI-powered health analysis
              </p>

              <button
                onClick={handleUpload}
                style={{
                  padding: "12px 25px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                  color: "white",
                  fontWeight: 600,
                  boxShadow: "0 8px 20px rgba(139, 92, 246, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = "0 12px 25px rgba(139, 92, 246, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 8px 20px rgba(139, 92, 246, 0.3)";
                }}
              >
                <FiUpload /> Upload Plant Image
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={uploadedImage}
                  alt="Plant"
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    borderRadius: 16,
                    marginBottom: 20,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                  }}
                />
                <button
                  onClick={() => setUploadedImage(null)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.9)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  ✕
                </button>
              </div>

               <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                {[
                  { mode: "disease", label: "Disease focus" },
                  { mode: "stage", label: "Stage focus" },
                ].map((option) => (
                  <button
                    key={option.mode}
                    onClick={() => setAnalysisMode(option.mode)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 12,
                      border:
                        analysisMode === option.mode
                          ? `2px solid ${BLOOM.forest}`
                          : "1px solid rgba(0,0,0,0.1)",
                      background:
                        analysisMode === option.mode
                          ? "rgba(46,139,87,0.15)"
                          : "rgba(255,255,255,0.8)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: BLOOM.forest,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
               <button
                style={{
                  padding: "12px 25px",
                  background: "linear-gradient(135deg, #6FCF97, #2E8B57)",
                  color: "white",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  marginInline: "auto",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 20px rgba(46, 139, 87, 0.3)",
                  transition: "all 0.3s ease",
                }}
                disabled={isAnalyzing}
                onClick={analyzePlantHealth}
                onMouseOver={(e) => {
                  if (isAnalyzing) return;
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = "0 12px 25px rgba(46, 139, 87, 0.4)";
                }}
                onMouseOut={(e) => {
                  if (isAnalyzing) return;
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 8px 20px rgba(46, 139, 87, 0.3)";
                }}
              >
                <FiCheckCircle /> {isAnalyzing ? "Analyzing plant..." : "Analyze Plant Health"}
              </button>
              {analysisError && (
                <p
                  style={{
                    marginTop: 12,
                    color: "#EF4444",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  {analysisError}
                </p>
              )}
              {healthAnalysis ? (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px dashed rgba(255,255,255,0.2)",
                  }}
                >
                  {analysisMode !== "stage" ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: BLOOM.olive,
                          }}
                        >
                          {topPrediction?.label || "Awaiting result"}
                        </span>
                        {topPrediction?.confidence != null && (
                          <span
                            style={{
                              fontSize: 12,
                              color: BLOOM.sub,
                            }}
                          >
                            {(topPrediction.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {healthPredictions.slice(0, 3).map((prediction, index) => (
                          <div
                            key={`{prediction.label}-{index}`}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: 12,
                              color: BLOOM.text,
                            }}
                          >
                            <span>{prediction.label}</span>
                            <span style={{ fontWeight: 600 }}>
                              {prediction.confidence != null
                                ? `${(prediction.confidence * 100).toFixed(1)}%`
                                : "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: BLOOM.sub,
                          marginTop: 12,
                        }}
                      >
                        Powered by PlantVillage-trained classifiers (
                        {healthAnalysis.model || "model"}).
                      </p>
                      {analysisDescription && (
                        <p
                          style={{
                            fontSize: 11,
                            color: BLOOM.sub,
                            marginTop: 8,
                          }}
                        >
                          {analysisDescription}
                        </p>
                      )}
                    </>
                  ) : (
                    <p
                      style={{
                        fontSize: 12,
                        color: BLOOM.sub,
                        marginBottom: 12,
                      }}
                    >
                      Stage focus only runs Gemini Vision to infer the crop's growth stage.
                    </p>
                  )}
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(59,130,246,0.05)",
                      border: "1px solid rgba(59,130,246,0.2)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        color: BLOOM.blue,
                      }}
                    >
                      {analysisMode === "stage" ? "Inferred stage" : "Final disease"}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 14,
                        fontWeight: 700,
                        color: BLOOM.forest,
                      }}
                    >
                      {finalDisease}
                    </p>
                    {mismatchWarning && (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 11,
                          color: "#D97706",
                        }}
                      >
                        {healthWarning ||
                          "PlantVillage models only cover a few crop leaves."}
                      </p>
                    )}
                    {geminiVision?.plant && (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 11,
                          color: BLOOM.text,
                        }}
                      >
                        Gemini plant: {geminiVision.plant} - {geminiVision.disease || "Unknown disease"}
                      </p>
                    )}
                    {geminiSymptoms.length > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: "6px 8px",
                          borderRadius: 12,
                          background: "rgba(255,255,255,0.6)",
                          border: "1px solid rgba(59,130,246,0.2)",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            fontWeight: 600,
                            color: BLOOM.text,
                          }}
                        >
                          Gemini symptoms
                        </p>
                        <ul
                          style={{
                            margin: "4px 0 0",
                            paddingLeft: 18,
                            fontSize: 11,
                            color: BLOOM.text,
                          }}
                        >
                          {geminiSymptoms.map((symptom, index) => (
                            <li key={`{symptom}-{index}`}>{symptom}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {stageInfo?.name && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.4)",
                        border: `1px solid ${BLOOM.forest}50`,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 600,
                          color: BLOOM.forest,
                        }}
                      >
                        Stage: {stageInfo.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: BLOOM.text,
                        }}
                      >
                        {stageInfo.notes}
                      </p>
                    </div>
                  )}
                  {diseaseInfo.length > 0 && analysisMode !== "stage" && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(111,207,151,0.1)",
                        border: `1px solid rgba(111,207,151,0.5)`,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 600,
                          color: BLOOM.leaf,
                        }}
                      >
                        Disease clues
                      </p>
                      <ul
                        style={{
                          margin: "6px 0 0",
                          paddingLeft: 16,
                          fontSize: 11,
                          color: BLOOM.text,
                        }}
                      >
                        {diseaseInfo.map((entry) => (
                          <li key={entry.name}>{entry.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: BLOOM.sub,
                    textAlign: "center",
                  }}
                >
                  Upload a plant image to run the PlantVillage-trained health check.
                </p>
              )}
            </div>
          )}
        </ModernCard>
      </div>

      {/* Animation styles */}
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }

          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}

/* 🌿 Modern Card Component */
function ModernCard({ title, icon, gradient, children, style }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(10px)",
        borderRadius: 20,
        padding: 25,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        border: "1px solid rgba(255,255,255,0.7)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 5,
          background: gradient,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: BLOOM.text,
          }}
        >
          {title}
        </h3>
      </div>

      {children}
    </div>
  );
}

/* 🌿 Main Environment Card Component - NO HOVER EFFECTS */
function MainEnvCard({ icon, label, value, detail, color }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
        padding: 20,
        borderRadius: 16,
        textAlign: "center",
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        border: `2px solid ${color}20`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Colored accent circle */}
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: `${color}15`,
        }}
      />

      <div 
        style={{ 
          fontSize: 32, 
          color: color, 
          marginBottom: 12,
          position: "relative",
          zIndex: 1
        }}
      >
        {icon}
      </div>
      <div 
        style={{ 
          fontSize: 16, 
          fontWeight: 700, 
          color: BLOOM.forest, 
          marginBottom: 6,
          position: "relative",
          zIndex: 1
        }}
      >
        {label}
      </div>
      <div 
        style={{ 
          fontSize: 20, 
          fontWeight: 800, 
          color: color, 
          marginBottom: 4,
          position: "relative",
          zIndex: 1
        }}
      >
        {value}
      </div>
      <div 
        style={{ 
          fontSize: 12, 
          color: BLOOM.sub,
          position: "relative",
          zIndex: 1
        }}
      >
        {detail}
      </div>
    </div>
  );
}
