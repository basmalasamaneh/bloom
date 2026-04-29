import React, { useEffect, useMemo, useState } from "react";
import AdminHeader from "./AdminHeader";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const ADMIN_BASE = `${API_BASE}/admin`;

const BLOOM = {
  olive: "#1B4332",
  forest: "#2E8B57",
  leaf: "#6FCF97",
  yellow: "#F2C94C",
  cream: "#FAF9F6",
  sage: "#E8F3E8",
  ink: "#333333",
  line: "rgba(27,67,50,0.12)",
  muted: "#4F6F52",
  soft: "rgba(27,67,50,0.08)",
};

const seedOrders = [
  {
    id: 9001,
    order_id: 1101,
    status: "pending",
    created_at: "2026-01-10",
    total_price: 240,
    payment_method: "card",
    quantity: 2,
    price_each: 120,
    item: { id: 501, name: "Drip Irrigation Kit", image_url: "/img/store/placeholder.png" },
    buyer: { id: 21, name: "Hadi Saleh", email: "hadi@example.com" },
    seller: { id: 4, name: "Alaa Qasem", email: "alaa@example.com" },
  },
  {
    id: 9002,
    order_id: 1102,
    status: "shipped",
    created_at: "2026-01-12",
    total_price: 75,
    payment_method: "cash",
    quantity: 3,
    price_each: 25,
    item: { id: 503, name: "Fungicide Spray", image_url: "/img/store/placeholder.png" },
    buyer: { id: 22, name: "Lina Omar", email: "lina@example.com" },
    seller: { id: 5, name: "Hiba Shakhshir", email: "hiba@example.com" },
  },
];

const seedRentals = [
  {
    id: 7001,
    status: "active",
    created_at: "2026-01-09",
    start_date: "2026-01-09",
    end_date: "2026-01-12",
    total_cost: 60,
    item: {
      id: 502,
      name: "Soil pH Meter",
      image_url: "/img/store/placeholder.png",
      rent_price_per_day: 15,
    },
    renter: { id: 18, name: "Sara Nassar", email: "sara@example.com" },
    seller: { id: 7, name: "Omar Masri", email: "omar@example.com" },
  },
  {
    id: 7002,
    status: "late",
    created_at: "2026-01-05",
    start_date: "2026-01-02",
    end_date: "2026-01-05",
    total_cost: 90,
    item: {
      id: 508,
      name: "Mini Cultivator",
      image_url: "/img/store/placeholder.png",
      rent_price_per_day: 30,
    },
    renter: { id: 25, name: "Rami Ziad", email: "rami@example.com" },
    seller: { id: 9, name: "Nora Aziz", email: "nora@example.com" },
  },
];

const STATUS_META = {
  pending: { bg: "rgba(242,201,76,0.2)", fg: "#8a5b00" },
  shipped: { bg: "rgba(46,139,87,0.18)", fg: "#1B4332" },
  delivered: { bg: "rgba(111,207,151,0.2)", fg: "#1B4332" },
  cancelled: { bg: "rgba(217,83,79,0.18)", fg: "#7a1b1b" },
  active: { bg: "rgba(46,139,87,0.18)", fg: "#1B4332" },
  late: { bg: "rgba(217,83,79,0.2)", fg: "#7a1b1b" },
  completed: { bg: "rgba(111,207,151,0.2)", fg: "#1B4332" },
  returned: { bg: "rgba(111,207,151,0.2)", fg: "#1B4332" },
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `$${n.toFixed(2)}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const formatRange = (start, end) => {
  if (!start && !end) return "-";
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const StatusPill = ({ status }) => {
  const key = String(status || "").toLowerCase();
  const meta = STATUS_META[key] || { bg: "rgba(79,111,82,0.15)", fg: BLOOM.muted };
  return (
    <span style={{ ...styles.pill, background: meta.bg, color: meta.fg }}>
      {status || "unknown"}
    </span>
  );
};

function GlassBg() {
  return (
    <>
      <div style={styles.blobA} />
      <div style={styles.blobB} />
      <div style={styles.gridNoise} />
    </>
  );
}

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState(seedOrders);
  const [rentals, setRentals] = useState(seedRentals);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const token = localStorage.getItem("token");
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const [ordersRes, rentalsRes] = await Promise.all([
          fetch(`${ADMIN_BASE}/orders`, { headers: authHeaders, signal: controller.signal }),
          fetch(`${ADMIN_BASE}/rentals`, { headers: authHeaders, signal: controller.signal }),
        ]);

        const ordersData = ordersRes.ok ? await ordersRes.json() : null;
        const rentalsData = rentalsRes.ok ? await rentalsRes.json() : null;

        if (!ordersRes.ok || !rentalsRes.ok) {
          setLoadError("Could not load admin orders or rentals. Showing demo data.");
        }

        if (!cancelled) {
          setOrders(Array.isArray(ordersData) ? ordersData : seedOrders);
          setRentals(Array.isArray(rentalsData) ? rentalsData : seedRentals);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to load orders:", err);
        if (!cancelled) {
          setLoadError("Could not load admin orders or rentals. Showing demo data.");
          setOrders(seedOrders);
          setRentals(seedRentals);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setStatusFilter("all");
  }, [activeTab]);

  const data = activeTab === "orders" ? orders : rentals;

  const statusOptions = useMemo(() => {
    const set = new Set();
    data.forEach((row) => {
      if (row?.status) set.add(row.status);
    });
    return ["all", ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    let rows = Array.isArray(data) ? [...data] : [];

    if (term) {
      rows = rows.filter((row) => {
        const parts = activeTab === "orders"
          ? [
              row.item?.name,
              row.buyer?.name,
              row.buyer?.email,
              row.seller?.name,
              row.seller?.email,
              row.order_id,
              row.id,
            ]
          : [
              row.item?.name,
              row.renter?.name,
              row.renter?.email,
              row.seller?.name,
              row.seller?.email,
              row.id,
            ];
        const hay = parts.filter(Boolean).join(" ").toLowerCase();
        return hay.includes(term);
      });
    }

    if (statusFilter !== "all") {
      rows = rows.filter((row) => String(row.status || "").toLowerCase() === statusFilter.toLowerCase());
    }

    rows.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    return rows;
  }, [data, query, statusFilter, activeTab]);

  const orderStats = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const key = Number(order.order_id || order.id);
      if (Number.isFinite(key) && !map.has(key)) {
        map.set(key, order);
      }
    });
    const uniqueOrders = Array.from(map.values());
    const salesRevenue = uniqueOrders.reduce(
      (sum, order) => sum + (Number(order.total_price) || 0),
      0
    );
    const rentalRevenue = rentals.reduce(
      (sum, rental) => sum + (Number(rental.total_cost) || 0),
      0
    );
    return {
      orderCount: uniqueOrders.length,
      rentalCount: rentals.length,
      salesRevenue,
      rentalRevenue,
    };
  }, [orders, rentals]);

  const tableGrid = {
    ...styles.tableGrid,
    gridTemplateColumns:
      activeTab === "orders"
        ? "minmax(220px, 2fr) minmax(160px, 1.2fr) minmax(160px, 1.2fr) minmax(90px, 0.6fr) minmax(140px, 0.9fr) minmax(120px, 0.8fr) minmax(160px, 1fr)"
        : "minmax(220px, 2fr) minmax(160px, 1.2fr) minmax(160px, 1.2fr) minmax(150px, 1fr) minmax(140px, 0.9fr) minmax(120px, 0.8fr) minmax(160px, 1fr)",
  };

  return (
    <>
      <AdminHeader />
      <div style={styles.page}>
        <GlassBg />
        <div style={styles.container}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>Orders & Rentals</div>
            <div style={styles.subtitle}>
              Track seller, buyer, status, and pricing across sales and rentals.
            </div>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <div style={styles.statTitle}>Total Orders</div>
            <div style={styles.statValue}>{orderStats.orderCount}</div>
            <div style={styles.statHint}>Unique orders</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statTitle}>Total Rentals</div>
            <div style={styles.statValue}>{orderStats.rentalCount}</div>
            <div style={styles.statHint}>Active and closed</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statTitle}>Sales Revenue</div>
            <div style={styles.statValue}>{formatMoney(orderStats.salesRevenue)}</div>
            <div style={styles.statHint}>From orders</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statTitle}>Rental Revenue</div>
            <div style={styles.statValue}>{formatMoney(orderStats.rentalRevenue)}</div>
            <div style={styles.statHint}>From rentals</div>
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.controls}>
            <div style={styles.searchWrap}>
              <span style={styles.searchIcon}>S</span>
              <input
                style={styles.search}
                placeholder={`Search ${activeTab === "orders" ? "orders" : "rentals"}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div style={styles.controlGroup}>
              <div style={styles.segmentWrap}>
                <button
                  style={{
                    ...styles.segmentItem,
                    ...(activeTab === "orders" ? styles.segmentActive : styles.segmentIdle),
                  }}
                  onClick={() => setActiveTab("orders")}
                >
                  Orders
                </button>
                <button
                  style={{
                    ...styles.segmentItem,
                    ...(activeTab === "rentals" ? styles.segmentActive : styles.segmentIdle),
                  }}
                  onClick={() => setActiveTab("rentals")}
                >
                  Rentals
                </button>
              </div>
              <select
                style={styles.select}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadError ? (
            <div style={styles.alert}>{loadError}</div>
          ) : null}

          <div style={styles.tableWrap}>
            <div style={{ ...styles.tableHead, ...tableGrid }}>
              {activeTab === "orders" ? (
                <>
                  <div style={styles.th}>Item</div>
                  <div style={styles.th}>Buyer</div>
                  <div style={styles.th}>Seller</div>
                  <div style={styles.th}>Qty</div>
                  <div style={styles.th}>Price</div>
                  <div style={styles.th}>Status</div>
                  <div style={styles.th}>Order Info</div>
                </>
              ) : (
                <>
                  <div style={styles.th}>Item</div>
                  <div style={styles.th}>Renter</div>
                  <div style={styles.th}>Seller</div>
                  <div style={styles.th}>Period</div>
                  <div style={styles.th}>Price</div>
                  <div style={styles.th}>Status</div>
                  <div style={styles.th}>Rental Info</div>
                </>
              )}
            </div>

            {loading ? (
              <div style={styles.loading}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={styles.empty}>No records match the current filters.</div>
            ) : (
              <div style={styles.tableBody}>
                {filtered.map((row) =>
                  activeTab === "orders" ? (
                    <div key={`${row.order_id}-${row.id}`} style={{ ...styles.row, ...tableGrid }}>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{row.item?.name || "Item"}</div>
                        <div style={styles.cellSub}>Order #{row.order_id}</div>
                      </div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{row.buyer?.name || "Buyer"}</div>
                        <div style={styles.cellSub}>{row.buyer?.email || "-"}</div>
                      </div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{row.seller?.name || "Seller"}</div>
                        <div style={styles.cellSub}>{row.seller?.email || "-"}</div>
                      </div>
                      <div style={styles.cellMain}>{row.quantity || "-"}</div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{formatMoney(row.price_each)}</div>
                        <div style={styles.cellSub}>
                          Line {formatMoney((Number(row.price_each) || 0) * (Number(row.quantity) || 0))}
                        </div>
                      </div>
                      <div style={styles.centerCell}>
                        <StatusPill status={row.status} />
                      </div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{formatMoney(row.total_price)}</div>
                        <div style={styles.cellSub}>{formatDate(row.created_at)}</div>
                      </div>
                    </div>
                  ) : (
                    <div key={row.id} style={{ ...styles.row, ...tableGrid }}>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{row.item?.name || "Item"}</div>
                        <div style={styles.cellSub}>Rental #{row.id}</div>
                      </div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{row.renter?.name || "Renter"}</div>
                        <div style={styles.cellSub}>{row.renter?.email || "-"}</div>
                      </div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{row.seller?.name || "Seller"}</div>
                        <div style={styles.cellSub}>{row.seller?.email || "-"}</div>
                      </div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{formatRange(row.start_date, row.end_date)}</div>
                        <div style={styles.cellSub}>Created {formatDate(row.created_at)}</div>
                      </div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{formatMoney(row.total_cost)}</div>
                        <div style={styles.cellSub}>
                          {row.item?.rent_price_per_day
                            ? `${formatMoney(row.item.rent_price_per_day)} / day`
                            : "-"}
                        </div>
                      </div>
                      <div style={styles.centerCell}>
                        <StatusPill status={row.status} />
                      </div>
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>
                          {row.late ? "Late fee" : "Return"}
                        </div>
                        <div style={styles.cellSub}>
                          {row.late ? formatMoney(row.late_fee) : formatDate(row.returned_at)}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    background: BLOOM.cream,
    overflow: "hidden",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  container: {
    maxWidth: 1360,
    margin: "0 auto",
    padding: "28px 18px 60px",
    position: "relative",
    zIndex: 2,
  },
  blobA: {
    position: "absolute",
    width: 680,
    height: 680,
    left: -220,
    top: -260,
    background: "radial-gradient(circle at 30% 30%, rgba(46,139,87,0.18), transparent 60%)",
    filter: "blur(10px)",
    opacity: 0.4,
    pointerEvents: "none",
  },
  blobB: {
    position: "absolute",
    width: 740,
    height: 740,
    right: -260,
    top: -280,
    background: "radial-gradient(circle at 70% 35%, rgba(242,201,76,0.2), transparent 60%)",
    filter: "blur(10px)",
    opacity: 0.4,
    pointerEvents: "none",
  },
  gridNoise: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(27,67,50,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(27,67,50,0.05) 1px, transparent 1px)",
    backgroundSize: "36px 36px",
    opacity: 0,
    maskImage: "radial-gradient(circle at 50% 15%, black 0%, transparent 70%)",
    pointerEvents: "none",
  },
  top: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  title: { fontSize: 34, fontWeight: 950, letterSpacing: -0.6, color: BLOOM.olive },
  subtitle: { marginTop: 6, fontSize: 13.5, fontWeight: 700, color: BLOOM.muted },
  statsRow: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
  },
  stat: {
    borderRadius: 24,
    padding: 14,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  statTitle: { fontSize: 12, fontWeight: 900, color: BLOOM.muted },
  statValue: { marginTop: 6, fontSize: 26, fontWeight: 950, color: BLOOM.ink, letterSpacing: -0.4 },
  statHint: { marginTop: 4, fontSize: 12.5, fontWeight: 700, color: BLOOM.muted },
  panel: {
    marginTop: 14,
    borderRadius: 28,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  controls: {
    padding: 14,
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "nowrap",
  },
  searchWrap: { position: "relative", minWidth: 240, width: 300, flex: "0 1 300px" },
  searchIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 12,
    color: BLOOM.muted,
    fontWeight: 900,
  },
  search: {
    width: "100%",
    padding: "12px 14px 12px 32px",
    borderRadius: 18,
    border: `1px solid ${BLOOM.sage}`,
    background: "#ffffff",
    outline: "none",
    fontSize: 13,
    fontWeight: 800,
    color: BLOOM.ink,
    boxShadow: "none",
  },
  select: {
    padding: "10px 12px",
    borderRadius: 16,
    border: `1px solid ${BLOOM.sage}`,
    background: "#ffffff",
    outline: "none",
    fontSize: 13,
    fontWeight: 900,
    color: BLOOM.ink,
  },
  controlGroup: { display: "flex", gap: 10, alignItems: "center", flexWrap: "nowrap" },
  segmentWrap: {
    display: "flex",
    borderRadius: 18,
    border: `1px solid ${BLOOM.sage}`,
    background: "#ffffff",
    padding: 4,
    gap: 4,
    boxShadow: "none",
  },
  segmentItem: {
    border: "none",
    cursor: "pointer",
    padding: "10px 12px",
    borderRadius: 14,
    fontSize: 12.5,
    fontWeight: 950,
  },
  segmentActive: {
    background: "white",
    color: BLOOM.ink,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  segmentIdle: {
    background: "transparent",
    color: BLOOM.muted,
  },
  tableWrap: { borderTop: `1px solid ${BLOOM.sage}`, overflowX: "auto" },
  tableGrid: {
    display: "grid",
    alignItems: "center",
    columnGap: 12,
  },
  tableHead: {
    padding: "12px 14px",
    background: BLOOM.sage,
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  th: { fontSize: 12, fontWeight: 950, color: BLOOM.olive, textTransform: "uppercase", letterSpacing: 0.6 },
  tableBody: { display: "grid", gap: 10, padding: 10 },
  row: {
    display: "grid",
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: 22,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  cellStack: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  cellMain: { fontSize: 13, fontWeight: 900, color: BLOOM.ink },
  cellSub: { fontSize: 12, fontWeight: 700, color: BLOOM.muted },
  centerCell: { display: "flex", alignItems: "center" },
  pill: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12 },
  loading: { padding: 22, textAlign: "center", fontWeight: 800, color: BLOOM.muted },
  empty: { padding: 22, textAlign: "center", fontWeight: 800, color: BLOOM.muted },
  alert: { padding: "10px 14px", background: "rgba(242,201,76,0.18)", color: "#8a5b00", fontWeight: 800 },
};
