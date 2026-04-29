import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import {
  FiPackage,
  FiShoppingBag,
  FiClock,
  FiAlertCircle,
  FiCheck,
  FiArchive,
  FiCalendar,
  FiUser,
  FiFilter,
  FiRefreshCw,
} from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const STORE_BASE = `${API_BASE}/store`;
const FALLBACK_IMAGE = "/img/store/placeholder.png";

const BLOOM = {
  forest: "#2E8B57",
  leaf: "#6FCF97",
  yellow: "#F2C94C",
  cream: "#FAF9F6",
  sage: "#E8F3E8",
  text: "#333",
  sub: "#4F6F52",
  archived: "#9CA3AF",
};

const RENTAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "returned", label: "Returned" },
  { value: "late", label: "Late" },
  { value: "rejected", label: "Rejected" },
];

const RENTAL_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  ...RENTAL_STATUS_OPTIONS,
  { value: "archived", label: "Archived" },
];

const ARCHIVE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function isRentalArchived(rental) {
  if (!rental || rental.status !== "returned") return false;
  const returnedAt = rental.returned_at || rental.returnedAt || rental.end_date;
  const date = new Date(returnedAt);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > ARCHIVE_WINDOW_MS;
}

export default function MyRentalsPage({ embedded = false }) {
  const [rentals, setRentals] = useState([]);
  const [sellerRentals, setSellerRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [buyerStatusFilter, setBuyerStatusFilter] = useState("all");
  const [sellerStatusFilter, setSellerStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("buyer");

  const token = localStorage.getItem("token");

  // Decode user ID
  const decodeUserId = () => {
    if (!token) return null;
    try {
      const [, payload] = token.split(".");
      const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      const parsed = JSON.parse(json);
      return parsed?.id ?? parsed?.user_id ?? parsed?.farmer_id ?? null;
    } catch {
      return null;
    }
  };

  const userId = decodeUserId();

  // ============================================================
  // UI HELPERS (same logic style as MyOrdersPage)
  // ============================================================
  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
      case "active":
        return BLOOM.yellow;
      case "returned":
        return BLOOM.leaf;
      case "archived":
        return BLOOM.archived;
      case "rejected":
        return "#F4D6CC";
      case "late":
        return "#FF6B6B";
      case "pending":
      default:
        return "#A3D8F4";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "returned":
        return <FiCheck className="status-icon" />;
      case "archived":
        return <FiArchive className="status-icon" />;
      case "late":
        return <FiAlertCircle className="status-icon" />;
      case "approved":
      case "active":
      case "pending":
      default:
        return <FiClock className="status-icon" />;
    }
  };

  // ============================================================
  // LOAD RENTALS AS USER
  // ============================================================
  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${STORE_BASE}/rentals/user/${userId}`);
        const data = await res.json();
        setRentals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading rentals:", err);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  // ============================================================
  // LOAD RENTALS AS SELLER
  // ============================================================
  useEffect(() => {
    if (!userId) return;
    async function loadSeller() {
      setLoadingSeller(true);
      try {
        const res = await fetch(`${STORE_BASE}/rentals/seller/${userId}`);
        const data = await res.json();
        setSellerRentals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading seller rentals:", err);
      }
      setLoadingSeller(false);
    }
    loadSeller();
  }, [userId]);

  // ============================================================
  // UPDATE RENTAL STATUS
  // ============================================================
  const updateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`${STORE_BASE}/rentals/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to update.");
        return;
      }
      setSellerRentals((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper to access correct item fields
  const getRentalItem = (r) =>
    r.store_items || r.item || r.storeItem || {};

  const getRentalName = (r) =>
    getRentalItem(r).name || r.item_name || "Rental Item";

  const getRentalImage = (r) =>
    getRentalItem(r).image_url ||
    getRentalItem(r).img ||
    FALLBACK_IMAGE;

  const filteredRentals = rentals.filter((r) => {
    const archived = isRentalArchived(r);
    if (buyerStatusFilter === "archived") return archived;
    if (buyerStatusFilter === "all") return !archived;
    return !archived && r.status === buyerStatusFilter;
  });

  const filteredSellerRentals = sellerRentals.filter((r) => {
    const archived = isRentalArchived(r);
    if (sellerStatusFilter === "archived") return archived;
    if (sellerStatusFilter === "all") return !archived;
    return !archived && r.status === sellerStatusFilter;
  });

  const activeRentalsCount = rentals.filter((r) => !isRentalArchived(r)).length;
  const activeSellerRentalsCount = sellerRentals.filter(
    (r) => !isRentalArchived(r)
  ).length;

  const RentalSkeleton = () => (
    <div className="rental-card skeleton">
      <div className="rental-header">
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
      {!embedded && <Header />}

      <style>{`
        body { 
          background: ${BLOOM.cream}; 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .rentals-page { 
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

        .rental-card {
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

        .rental-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          background: var(--status-color, ${BLOOM.forest});
        }

        .rental-card:hover { 
          transform: translateY(-5px); 
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        }

        .rental-header { 
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

        .rental-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .item-thumb {
          width: 60px;
          height: 60px;
          border-radius: 10px;
          object-fit: cover;
        }

        .item-details {
          flex: 1;
        }

        .item-name {
          font-weight: 600;
          color: ${BLOOM.text};
        }

        .item-meta {
          font-size: 12px;
          color: ${BLOOM.sub};
        }

        .item-price {
          font-weight: 600;
          color: ${BLOOM.forest};
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
          color: ${BLOOM.sub};
          font-weight: 600;
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

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .rentals-page {
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

          .rental-card {
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

          .rental-item {
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="rentals-page">
        <div className="page-header">
          <h1 className="title">
            <FiCalendar /> My Rentals
          </h1>
          <div className="order-summary">
            {activeRentalsCount > 0 && (
              <span
                style={{
                  background: BLOOM.leaf,
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                {activeRentalsCount} Rental
                {activeRentalsCount > 1 ? "s" : ""} Requested
              </span>
            )}
            {activeSellerRentalsCount > 0 && (
              <span
                style={{
                  background: BLOOM.yellow,
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginLeft: "10px",
                }}
              >
                {activeSellerRentalsCount} Rental
                {activeSellerRentalsCount > 1 ? "s" : ""} Received
              </span>
            )}
          </div>
        </div>

        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-button ${activeTab === "buyer" ? "active" : ""}`}
              onClick={() => setActiveTab("buyer")}
            >
              <FiShoppingBag />
              Rentals I Requested
              {activeRentalsCount > 0 && (
                <span className="tab-badge">{activeRentalsCount}</span>
              )}
            </button>
            <button
              className={`tab-button ${activeTab === "seller" ? "active" : ""}`}
              onClick={() => setActiveTab("seller")}
            >
              <FiPackage />
              Rentals On My Items
              {activeSellerRentalsCount > 0 && (
                <span className="tab-badge">{activeSellerRentalsCount}</span>
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
                      {RENTAL_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="loading-container">
                    {[1, 2, 3].map((i) => (
                      <RentalSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredRentals.length === 0 ? (
                  <div className="empty-state">
                    <FiShoppingBag className="empty-icon" />
                    <h3 className="empty-title">No rentals found</h3>
                    <p className="empty-description">
                      {buyerStatusFilter === "all"
                        ? "You haven't requested any rentals yet."
                        : `No rentals with status "${buyerStatusFilter}" found.`}
                    </p>
                  </div>
                ) : (
                  filteredRentals.map((r) => {
                    const archived = isRentalArchived(r);
                    const displayStatus = archived ? "archived" : r.status;
                    return (
                      <div
                        key={r.id}
                        className="rental-card"
                        style={{ "--status-color": getStatusColor(displayStatus) }}
                      >
                        <div className="rental-header">
                          <div className="order-info">
                            <div className="order-num">Rental #{r.id}</div>
                            <div className="order-date">
                              <FiClock /> {formatDate(r.created_at)}
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
                        <div className="rental-item">
                          <img
                            src={getRentalImage(r)}
                            alt={getRentalName(r)}
                            className="item-thumb"
                          />
                          <div className="item-details">
                            <div className="item-name">{getRentalName(r)}</div>
                            <div className="item-meta">
                              Item ID: {getRentalItem(r).id || r.item_id}
                            </div>
                          </div>
                          <div className="item-price">₪{r.total_cost}</div>
                        </div>

                        <div className="row">
                          <span>
                            <FiCalendar /> From:
                          </span>
                          <span>{formatDate(r.start_date)}</span>
                        </div>

                        <div className="row">
                          <span>
                            <FiCalendar /> To:
                          </span>
                          <span>{formatDate(r.end_date)}</span>
                        </div>
                      </div>

                      <div className="footer">
                        <div className="total">Total: ₪{r.total_cost}</div>
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
                      {RENTAL_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingSeller ? (
                  <div className="loading-container">
                    {[1, 2, 3].map((i) => (
                      <RentalSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredSellerRentals.length === 0 ? (
                  <div className="empty-state">
                    <FiPackage className="empty-icon" />
                    <h3 className="empty-title">No rentals found</h3>
                    <p className="empty-description">
                      {sellerStatusFilter === "all"
                        ? "No one has rented your items yet."
                        : `No rentals with status "${sellerStatusFilter}" found.`}
                    </p>
                  </div>
                ) : (
                  filteredSellerRentals.map((r) => {
                    const archived = isRentalArchived(r);
                    const displayStatus = archived ? "archived" : r.status;
                    return (
                      <div
                        key={r.id}
                        className="rental-card"
                        style={{ "--status-color": getStatusColor(displayStatus) }}
                      >
                        <div className="rental-header">
                          <div className="order-info">
                            <div className="order-num">Rental #{r.id}</div>
                            <div className="order-date">
                              <FiClock /> {formatDate(r.created_at)}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            {archived && (
                              <span className="archived-badge">Archived</span>
                            )}
                            {updatingId === r.id && (
                              <div className="updating-indicator">
                                <FiRefreshCw className="spinner" />
                                Updating...
                              </div>
                            )}
                            <select
                              value={r.status}
                              onChange={(e) => updateStatus(r.id, e.target.value)}
                              className="status-selector"
                              disabled={updatingId === r.id || archived}
                            >
                              {RENTAL_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                      <div className="item-row">
                        <div className="rental-item">
                          <img
                            src={getRentalImage(r)}
                            alt={getRentalName(r)}
                            className="item-thumb"
                          />
                          <div className="item-details">
                            <div className="item-name">{getRentalName(r)}</div>
                            <div className="item-meta">
                              Item ID: {getRentalItem(r).id || r.item_id}
                            </div>
                          </div>
                          <div className="item-price">₪{r.total_cost}</div>
                        </div>

                        <div className="row">
                          <span>
                            <FiUser /> Renter:
                          </span>
                          <span>{r.renter_id}</span>
                        </div>

                        <div className="row">
                          <span>
                            <FiCalendar /> From:
                          </span>
                          <span>{formatDate(r.start_date)}</span>
                        </div>

                        <div className="row">
                          <span>
                            <FiCalendar /> To:
                          </span>
                          <span>{formatDate(r.end_date)}</span>
                        </div>
                      </div>

                      <div className="footer">
                        <div className="total">Total: ₪{r.total_cost}</div>
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
