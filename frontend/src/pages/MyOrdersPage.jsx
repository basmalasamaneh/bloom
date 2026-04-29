import React, { useEffect, useState } from "react";
import {
  FiPackage,
  FiTruck,
  FiClock,
  FiMapPin,
  FiCheck,
  FiUser,
  FiFilter,
  FiShoppingBag,
  FiShoppingCart,
  FiRefreshCw,
  FiArrowLeft,
  FiHome,
  FiBox,
  FiActivity,
  FiArchive,
} from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const STORE_BASE = `${API_BASE}/store`;

const BLOOM = {
  forest: "#2E8B57",
  leaf: "#6FCF97",
  yellow: "#F2C94C",
  cream: "#FAF9F6",
  sage: "#E8F3E8",
  text: "#333",
  sub: "#4F6F52",
  returned: "#C0392B",
  archived: "#9CA3AF",
};

const STATUS_STEPS = [
  { 
    key: "pending", 
    label: "Order Placed", 
    icon: FiShoppingCart,
    color: BLOOM.sub,
    gradient: `linear-gradient(135deg, ${BLOOM.sub} 0%, ${BLOOM.forest} 100%)`
  },
  { 
    key: "processing", 
    label: "Processing", 
    icon: FiBox,
    color: BLOOM.forest,
    gradient: `linear-gradient(135deg, ${BLOOM.forest} 0%, ${BLOOM.leaf} 100%)`
  },
  { 
    key: "in-transit", 
    label: "In Transit", 
    icon: FiTruck,
    color: BLOOM.yellow,
    gradient: `linear-gradient(135deg, ${BLOOM.yellow} 0%, #E6B347 100%)`
  },
  { 
    key: "delivered", 
    label: "Delivered", 
    icon: FiHome,
    color: BLOOM.leaf,
    gradient: `linear-gradient(135deg, ${BLOOM.leaf} 0%, ${BLOOM.forest} 100%)`
  },
];
const STEP_KEYS = STATUS_STEPS.map((step) => step.key);

const RETURN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function getLatestTimelineEntry(timeline, status) {
  if (!Array.isArray(timeline)) return null;
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    if (timeline[i]?.status === status) return timeline[i];
  }
  return null;
}

function isOrderArchived(order) {
  if (!order) return false;
  if (typeof order.archived === "boolean") return order.archived;
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const deliveredEntry = getLatestTimelineEntry(timeline, "delivered");
  const hasReturned = timeline.some((t) => t.status === "returned");
  if (!deliveredEntry || hasReturned) return false;
  const deliveredAt = new Date(deliveredEntry.changed_at);
  if (Number.isNaN(deliveredAt.getTime())) return false;
  return Date.now() - deliveredAt.getTime() > RETURN_WINDOW_MS;
}

function canReturnOrder(order) {
  if (!order || order.status !== "delivered") return false;
  if (isOrderArchived(order)) return false;
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const deliveredEntry = getLatestTimelineEntry(timeline, "delivered");
  if (!deliveredEntry) return false;
  const deliveredAt = new Date(deliveredEntry.changed_at);
  if (Number.isNaN(deliveredAt.getTime())) return false;
  return Date.now() - deliveredAt.getTime() <= RETURN_WINDOW_MS;
}

function OrderProgress({ status, createdAt, timeline = [] }) {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const hasTimeline = safeTimeline.length > 0;
  const normalizedStatus = status === "returned" ? "delivered" : status;
  const statusIndex = STATUS_STEPS.findIndex(
    (step) => step.key === normalizedStatus
  );
  const completedStatuses = hasTimeline
    ? safeTimeline
        .map((t) => t.status)
        .filter((value) => STEP_KEYS.includes(value))
    : statusIndex >= 0
      ? STEP_KEYS.slice(0, statusIndex + 1)
      : [];
  const currentStepIndex = hasTimeline
    ? STATUS_STEPS.reduce(
        (acc, step, index) =>
          completedStatuses.includes(step.key) ? index : acc,
        -1
      )
    : statusIndex;
  const progressPercentage =
    currentStepIndex >= 0
      ? ((currentStepIndex + 1) / STATUS_STEPS.length) * 100
      : 0;
  const historyByStatus = new Map(
    safeTimeline.map((entry) => [entry.status, entry.changed_at])
  );

  return (
    <div className="timeline-container">
      {/* Progress bar at the top */}
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="progress-text">
          {progressPercentage.toFixed(0)}% Complete
        </div>
      </div>

      {/* Timeline steps */}
      <div className="timeline-steps">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = completedStatuses.includes(step.key);
          const isCurrent = index === currentStepIndex;
          const dateValue =
            historyByStatus.get(step.key) ||
            (step.key === "pending" ? createdAt : null);
          const Icon = step.icon;

          return (
            <div className="timeline-step" key={step.key}>
              {/* Connection line */}
              {index < STATUS_STEPS.length - 1 && (
                <div className={`timeline-connector ${isCompleted ? 'completed' : ''}`} />
              )}

              {/* Step circle with icon */}
              <div 
                className={`timeline-circle ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                style={{
                  background: isCompleted ? step.gradient : '#F3F4F6',
                  boxShadow: isCurrent ? `0 0 0 3px ${step.color}30` : 'none'
                }}
              >
                <Icon 
                  className={`timeline-icon ${isCompleted ? 'icon-white' : 'icon-gray'}`}
                  size={16}
                />
                {isCurrent && (
                  <div className="pulse-ring" />
                )}
              </div>

              {/* Step content */}
              <div className="timeline-content">
                <div className={`timeline-label ${isCompleted ? 'completed' : ''}`}>
                  {step.label}
                </div>
                <div className="timeline-date">
                  {formatDate(dateValue)}
                </div>
                {isCurrent && (
                  <div className="current-indicator">
                    <FiActivity size={10} />
                    <span>In Progress</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyOrdersPage({ embedded = false }) {
  const [myOrders, setMyOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyerStatusFilter, setBuyerStatusFilter] = useState("all");
  const [sellerStatusFilter, setSellerStatusFilter] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("buyer");

  // Decode user id
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const decodeUserId = () => {
    if (!token)
      return (
        localStorage.getItem("user_id") ||
        localStorage.getItem("id") ||
        null
      );

    try {
      const [, payload] = token.split(".");
      if (!payload) return null;
      const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      const parsed = JSON.parse(json);

      return (
        parsed?.id ??
        parsed?.user_id ??
        parsed?.farmer_id ??
        localStorage.getItem("user_id") ??
        null
      );
    } catch {
      return localStorage.getItem("user_id") || null;
    }
  };

  const userId = decodeUserId();

  // 🔥 Update Order Status API Call
  const updateStatus = async (orderId, newStatus) => {
    setUpdatingStatus(orderId);
    try {
      const res = await fetch(`${STORE_BASE}/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      // Update UI instantly
      setSellerOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId ? { ...o, status: newStatus } : o
        )
      );
    } catch (err) {
      console.error(err);
      alert("Could not update order status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return BLOOM.leaf;
      case "pending":
        return BLOOM.sub;
      case "processing":
        return BLOOM.forest;
      case "in-transit":
        return BLOOM.yellow;
      case "returned":
        return BLOOM.returned;
      case "archived":
        return BLOOM.archived;
      default:
        return "#8B5E3C";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <FiCheck className="status-icon" />;
      case "pending":
        return <FiClock className="status-icon" />;
      case "processing":
        return <FiPackage className="status-icon" />;
      case "in-transit":
        return <FiTruck className="status-icon" />;
      case "returned":
        return <FiArrowLeft className="status-icon" />;
      case "archived":
        return <FiArchive className="status-icon" />;
      default:
        return <FiPackage className="status-icon" />;
    }
  };

  // ==========================
  // LOAD ORDERS
  // ==========================
  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);

      const safeFetch = async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.error(`Request failed ${res.status}: ${url}`);
            return [];
          }
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        } catch (err) {
          console.error(`Order fetch error for ${url}:`, err);
          return [];
        }
      };

      const [data1, data2] = await Promise.all([
        safeFetch(`${STORE_BASE}/orders/user/${userId}`),
        safeFetch(`${STORE_BASE}/orders/seller/${userId}`),
      ]);

      setMyOrders(data1);
      setSellerOrders(data2);

      setLoading(false);
    }

    load();
  }, [userId]);

  const filteredBuyerOrders = myOrders.filter((o) => {
    const archived = isOrderArchived(o);
    if (buyerStatusFilter === "archived") return archived;
    if (buyerStatusFilter === "all") return !archived;
    return !archived && o.status === buyerStatusFilter;
  });

  const filteredSellerOrders = sellerOrders.filter((o) => {
    const archived = isOrderArchived(o);
    if (sellerStatusFilter === "archived") return archived;
    if (sellerStatusFilter === "all") return !archived;
    return !archived && o.status === sellerStatusFilter;
  });

  // Skeleton loader component
  const OrderSkeleton = () => (
    <div className="order-card skeleton">
      <div className="order-header">
        <div>
          <div className="skeleton-text order-num"></div>
          <div className="skeleton-text order-date"></div>
        </div>
        <div className="skeleton-status"></div>
      </div>
      <div className="item-row">
        <div className="skeleton-text item-name"></div>
        <div className="skeleton-text item-price"></div>
      </div>
      <div className="footer">
        <div className="skeleton-text total"></div>
      </div>
    </div>
  );

  return (
    <>
      {/* INLINE STYLES FOR THEME */}
      <style>{`
        body { 
          background: ${BLOOM.cream}; 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        
        .orders-page { 
          max-width: 900px; 
          margin: 0 auto; 
          padding: 20px;
          min-height: 100vh;
        }
        
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, ${BLOOM.sage} 0%, ${BLOOM.cream} 100%);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        
        .title { 
          font-size: 32px; 
          font-weight: 700; 
          color: ${BLOOM.forest}; 
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .tabs-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          margin-bottom: 24px;
          overflow: hidden;
        }
        
        .tabs-header {
          display: flex;
          border-bottom: 2px solid #f0f0f0;
        }
        
        .tab-button {
          flex: 1;
          padding: 18px 24px;
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 600;
          color: ${BLOOM.sub};
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
        }
        
        .tab-button:hover {
          background: ${BLOOM.sage};
        }
        
        .tab-button.active {
          color: ${BLOOM.forest};
          background: ${BLOOM.sage};
        }
        
        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background: ${BLOOM.forest};
        }
        
        .tab-badge {
          background: ${BLOOM.forest};
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 5px;
        }
        
        .tab-content {
          padding: 24px;
        }
        
        .filters { 
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .filter-group { 
          display: flex; 
          align-items: center;
          gap: 10px;
        }
        
        .filter-label {
          font-weight: 500;
          color: ${BLOOM.text};
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .filter-input { 
          padding: 10px 16px; 
          border: 2px solid #eee; 
          border-radius: 10px;
          background: white;
          font-weight: 500;
          color: ${BLOOM.text};
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 150px;
        }
        
        .filter-input:hover {
          border-color: ${BLOOM.sage};
        }
        
        .filter-input:focus {
          outline: none;
          border-color: ${BLOOM.forest};
          box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
        }
        
        .order-card {
          background: white; 
          padding: 24px; 
          margin-bottom: 20px;
          border-radius: 16px; 
          border-left: 5px solid transparent;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .order-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          background: var(--status-color, ${BLOOM.forest});
        }
        
        .order-card:hover { 
          transform: translateY(-5px); 
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        }
        
        .order-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          margin-bottom: 16px;
        }
        
        .order-info {
          display: flex;
          flex-direction: column;
        }
        
        .order-num { 
          font-size: 20px; 
          font-weight: 600; 
          color: ${BLOOM.text};
          margin-bottom: 4px;
        }
        
        .order-date { 
          font-size: 14px; 
          color: ${BLOOM.sub};
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .order-status { 
          padding: 8px 16px; 
          border-radius: 30px; 
          display: flex; 
          align-items: center; 
          gap: 8px;
          color: #333; 
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .status-icon {
          font-size: 16px;
        }
        
        .item-row { 
          background: ${BLOOM.sage}; 
          padding: 16px; 
          border-radius: 12px; 
          margin-top: 16px;
        }

        /* Compact Timeline with Bloom Colors */
        .timeline-container {
          margin-top: 16px;
          padding: 16px;
          background: linear-gradient(135deg, ${BLOOM.sage} 0%, ${BLOOM.cream} 100%);
          border-radius: 12px;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }

        .progress-bar-container {
          margin-bottom: 16px;
        }

        .progress-bar {
          height: 6px;
          background: rgba(46, 139, 87, 0.1);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${BLOOM.leaf} 0%, ${BLOOM.forest} 100%);
          border-radius: 6px;
          transition: width 0.5s ease-out;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        .progress-text {
          text-align: center;
          margin-top: 6px;
          font-size: 11px;
          font-weight: 600;
          color: ${BLOOM.sub};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .timeline-steps {
          display: flex;
          justify-content: space-between;
          position: relative;
          padding: 0 5px;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
          z-index: 2;
        }

        .timeline-connector {
          position: absolute;
          top: 20px;
          left: 50%;
          width: calc(100% - 36px);
          height: 2px;
          background: rgba(46, 139, 87, 0.1);
          z-index: 1;
          transition: all 0.3s ease;
        }

        .timeline-connector.completed {
          background: linear-gradient(90deg, ${BLOOM.leaf} 0%, ${BLOOM.forest} 100%);
        }

        .timeline-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .timeline-circle:hover {
          transform: scale(1.05);
        }

        .timeline-circle.completed {
          box-shadow: 0 2px 8px rgba(46, 139, 87, 0.2);
        }

        .timeline-circle.current {
          animation: pulse 2s infinite;
        }

        .pulse-ring {
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border-radius: 50%;
          border: 2px solid;
          border-color: inherit;
          opacity: 0.3;
          animation: pulse-ring 2s infinite;
        }

        .timeline-icon {
          transition: all 0.3s ease;
        }

        .icon-white {
          color: white;
        }

        .icon-gray {
          color: ${BLOOM.sub};
        }

        .timeline-content {
          margin-top: 8px;
          text-align: center;
          max-width: 100px;
        }

        .timeline-label {
          font-size: 11px;
          font-weight: 600;
          color: ${BLOOM.sub};
          transition: all 0.3s ease;
        }

        .timeline-label.completed {
          color: ${BLOOM.forest};
        }

        .timeline-date {
          font-size: 9px;
          color: ${BLOOM.sub};
          margin-top: 3px;
          opacity: 0.8;
        }

        .current-indicator {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin-top: 4px;
          padding: 1px 6px;
          background: ${BLOOM.forest}20;
          color: ${BLOOM.forest};
          border-radius: 10px;
          font-size: 9px;
          font-weight: 600;
          animation: blink 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 10px; 
          font-size: 15px;
          align-items: center;
        }
        
        .row:last-child {
          margin-bottom: 0;
        }
        
        .footer { 
          margin-top: 20px; 
          padding-top: 16px; 
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .total { 
          font-size: 18px; 
          font-weight: 600;
          color: ${BLOOM.forest};
        }
        
        .status-selector {
          padding: 8px 12px;
          border-radius: 8px;
          border: 2px solid ${BLOOM.sage};
          background: white;
          font-weight: 600;
          color: ${BLOOM.text};
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-selector:hover {
          border-color: ${BLOOM.forest};
        }

        .status-selector:focus {
          outline: none;
          border-color: ${BLOOM.forest};
          box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
        }

        .archived-badge {
          background: ${BLOOM.sage};
          color: ${BLOOM.sub};
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        
        .empty-icon {
          font-size: 64px;
          color: ${BLOOM.sage};
          margin-bottom: 20px;
        }
        
        .empty-title {
          font-size: 22px;
          font-weight: 600;
          color: ${BLOOM.forest};
          margin-bottom: 10px;
        }
        
        .empty-description {
          font-size: 16px;
          color: ${BLOOM.sub};
          max-width: 400px;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .skeleton {
          position: relative;
          overflow: hidden;
        }
        
        .skeleton::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%);
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-text {
          height: 16px;
          background: #eee;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        
        .order-num.skeleton-text {
          width: 120px;
          height: 20px;
        }
        
        .order-date.skeleton-text {
          width: 100px;
          height: 14px;
        }
        
        .skeleton-status {
          width: 100px;
          height: 32px;
          background: #eee;
          border-radius: 16px;
        }
        
        .item-name.skeleton-text {
          width: 150px;
        }
        
        .item-price.skeleton-text {
          width: 60px;
        }
        
        .total.skeleton-text {
          width: 80px;
          height: 18px;
        }
        
        .updating-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: ${BLOOM.forest};
          font-size: 14px;
          font-weight: 500;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .orders-page {
            padding: 15px;
          }
          
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
          
          .title {
            font-size: 24px;
          }
          
          .order-card {
            padding: 16px;
          }
          
          .filters {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .tab-button {
            padding: 14px 16px;
            font-size: 14px;
          }
          
          .timeline-circle {
            width: 36px;
            height: 36px;
          }
          
          .timeline-content {
            max-width: 80px;
          }
          
          .timeline-label {
            font-size: 10px;
          }
          
          .timeline-date {
            font-size: 8px;
          }
        }
      `}</style>

      <div className="orders-page">
        <div className="page-header">
          <h1 className="title">
            <FiShoppingCart /> My Orders
          </h1>
          <div className="order-summary">
            {myOrders.length > 0 && (
              <span style={{ 
                background: BLOOM.leaf, 
                color: 'white', 
                padding: '6px 12px', 
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {myOrders.length} Order{myOrders.length > 1 ? 's' : ''} Placed
              </span>
            )}
            {sellerOrders.length > 0 && (
              <span style={{ 
                background: BLOOM.yellow, 
                color: 'white', 
                padding: '6px 12px', 
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                marginLeft: '10px'
              }}>
                {sellerOrders.length} Order{sellerOrders.length > 1 ? 's' : ''} Received
              </span>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-button ${activeTab === "buyer" ? "active" : ""}`}
              onClick={() => setActiveTab("buyer")}
            >
              <FiShoppingBag />
              Orders I Placed
              {myOrders.length > 0 && (
                <span className="tab-badge">{myOrders.length}</span>
              )}
            </button>
            <button
              className={`tab-button ${activeTab === "seller" ? "active" : ""}`}
              onClick={() => setActiveTab("seller")}
            >
              <FiPackage />
              Orders On My Items
              {sellerOrders.length > 0 && (
                <span className="tab-badge">{sellerOrders.length}</span>
              )}
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "buyer" ? (
              <>
                <div className="filters">
                  <div className="filter-group">
                    <label className="filter-label">
                      <FiFilter /> Status
                    </label>
                    <select
                      className="filter-input"
                      value={buyerStatusFilter}
                      onChange={(e) => setBuyerStatusFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="in-transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="returned">Returned</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="loading-container">
                    {[1, 2, 3].map((i) => (
                      <OrderSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredBuyerOrders.length === 0 ? (
                  <div className="empty-state">
                    <FiShoppingBag className="empty-icon" />
                    <h3 className="empty-title">No orders found</h3>
                    <p className="empty-description">
                      {buyerStatusFilter === "all" 
                        ? "You haven't placed any orders yet." 
                        : `No orders with status "${buyerStatusFilter}" found.`}
                    </p>
                  </div>
                ) : (
                  filteredBuyerOrders.map((order) => {
                    const archived = isOrderArchived(order);
                    const displayStatus = archived ? "archived" : order.status;
                    return (
                    <div
                      key={order.id}
                      className="order-card"
                      style={{ "--status-color": getStatusColor(displayStatus) }}
                    >
                      <div className="order-header">
                        <div className="order-info">
                          <div className="order-num">Order #{order.id}</div>
                          <div className="order-date">
                            <FiClock /> {formatDate(order.created_at)}
                          </div>
                        </div>

                        <div
                          className="order-status"
                          style={{ background: getStatusColor(displayStatus) }}
                        >
                          {getStatusIcon(displayStatus)} {displayStatus}
                        </div>
                      </div>

                      <div className="item-row">
                        {order.store_order_items?.map((item, index) => (
                          <div key={index} className="row">
                            <span>
                              {(item.store_items?.name ||
                                item.item_name ||
                                `Item #${item.item_id}`)}{" "}
                              × {item.quantity}
                            </span>
                            <span>{item.price_each}₪</span>
                          </div>
                        ))}
                      </div>

                      <OrderProgress
                        status={order.status}
                        createdAt={order.created_at}
                        timeline={order.timeline || []}
                      />

                      <div className="footer">
                        <div className="total">Total: {order.total_price}₪</div>
                      </div>
                    </div>
                    );
                  })
                )}
              </>
            ) : (
              <>
                <div className="filters">
                  <div className="filter-group">
                    <label className="filter-label">
                      <FiFilter /> Status
                    </label>
                    <select
                      className="filter-input"
                      value={sellerStatusFilter}
                      onChange={(e) => setSellerStatusFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="in-transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="returned">Returned</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="loading-container">
                    {[1, 2, 3].map((i) => (
                      <OrderSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredSellerOrders.length === 0 ? (
                  <div className="empty-state">
                    <FiPackage className="empty-icon" />
                    <h3 className="empty-title">No orders found</h3>
                    <p className="empty-description">
                      {sellerStatusFilter === "all" 
                        ? "No one has ordered your items yet." 
                        : `No orders with status "${sellerStatusFilter}" found.`}
                    </p>
                  </div>
                ) : (
                  filteredSellerOrders.map((o, index) => {
                    const archived = isOrderArchived(o);
                    const canReturn = canReturnOrder(o);
                    const displayStatus = archived ? "archived" : o.status;
                    return (
                    <div
                      key={index}
                      className="order-card"
                      style={{ "--status-color": getStatusColor(displayStatus) }}
                    >
                      <div className="order-header">
                        <div className="order-info">
                          <div className="order-num">Order #{o.order_id}</div>
                          <div className="order-date">
                            <FiClock /> {formatDate(o.created_at)}
                          </div>
                        </div>

                        {/* 🔥 Status Selector for Seller */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {archived && (
                            <span className="archived-badge">Archived</span>
                          )}
                          {updatingStatus === o.order_id && (
                            <div className="updating-indicator">
                              <FiRefreshCw className="spinner" />
                              Updating...
                            </div>
                          )}
                          <select
                            value={o.status}
                            onChange={(e) => updateStatus(o.order_id, e.target.value)}
                            className="status-selector"
                            disabled={updatingStatus === o.order_id || archived}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="in-transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                            <option
                              value="returned"
                              disabled={!canReturn && o.status !== "returned"}
                            >
                              Returned
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className="item-row">
                        <div className="row">
                          <span>{o.item_name}</span>
                          <span>{o.price_each}₪</span>
                        </div>
                        <div className="row">
                          <span>Qty:</span>
                          <span>{o.quantity}</span>
                        </div>
                      </div>

                      <OrderProgress
                        status={o.status}
                        createdAt={o.created_at}
                        timeline={o.timeline || []}
                      />

                      <div className="footer">
                        <div className="row">
                          <FiUser /> Buyer: {o.buyer_id}
                        </div>
                        <div className="row">
                          <FiMapPin /> {o.location}
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
