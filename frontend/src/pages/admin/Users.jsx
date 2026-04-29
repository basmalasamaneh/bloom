// AdminUsersFigma.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

const ROLE_META = {
  farmer: { label: "Farmer", bg: "rgba(111,207,151,0.18)", fg: BLOOM.forest, icon: "🌿" },
  expert: { label: "Expert", bg: "rgba(242,201,76,0.22)", fg: BLOOM.olive, icon: "🧠" },
  admin: { label: "Admin", bg: "rgba(27,67,50,0.12)", fg: BLOOM.olive, icon: "🛡️" },
};

const STATUS_META = {
  active: { label: "Active", dot: BLOOM.leaf, bg: "rgba(111,207,151,0.18)", fg: BLOOM.forest },
  pending: { label: "Pending", dot: BLOOM.yellow, bg: "rgba(242,201,76,0.22)", fg: BLOOM.olive },
  suspended: { label: "Suspended", dot: "#f59e0b", bg: "rgba(245,158,11,0.14)", fg: "#92400e" },
  banned: { label: "Banned", dot: "#ef4444", bg: "rgba(239,68,68,0.12)", fg: "#991b1b" },
};

const seedUsers = [
  {
    id: 101,
    name: "Alaa Qasem",
    email: "alaa.qasem@bloom.ps",
    phone: "+970 59 123 4567",
    role: "farmer",
    status: "active",
    location: "Nablus",
    joinedAt: "2025-10-02",
    lastActiveAt: "2026-01-08",
    stats: { posts: 12, orders: 4, rentals: 1, listings: 3, reports: 0 },
    tags: ["Top Seller"],
  },
  {
    id: 102,
    name: "Dr. Rania Salem",
    email: "rania.salem@bloom.ps",
    phone: "+970 59 222 7811",
    role: "expert",
    status: "pending",
    expertStatus: "pending",
    location: "Jenin",
    joinedAt: "2026-01-03",
    lastActiveAt: "2026-01-09",
    stats: { posts: 0, orders: 0, rentals: 0, listings: 0, reports: 0, subscriptions: 8 },
    tags: ["Verified Expert"],
  },
  {
    id: 103,
    name: "Omar Masri",
    email: "omar.masri@bloom.ps",
    phone: "+970 56 333 4021",
    role: "farmer",
    status: "suspended",
    location: "Tulkarm",
    joinedAt: "2025-08-11",
    lastActiveAt: "2025-12-27",
    stats: { posts: 2, orders: 1, rentals: 0, listings: 1, reports: 2 },
    tags: ["Reported"],
  },
  {
    id: 104,
    name: "Admin Bloom",
    email: "admin@bloom.ps",
    phone: "+970 59 999 0000",
    role: "admin",
    status: "active",
    location: "Nablus",
    joinedAt: "2025-06-01",
    lastActiveAt: "2026-01-11",
    stats: { posts: 0, orders: 0, rentals: 0, listings: 0, reports: 0 },
    tags: [],
  },
  {
    id: 105,
    name: "Hiba Shakhshir",
    email: "hiba@bloom.ps",
    phone: "+970 59 777 1200",
    role: "expert",
    status: "active",
    expertStatus: "approved",
    location: "Ramallah",
    joinedAt: "2025-11-20",
    lastActiveAt: "2026-01-10",
    stats: { posts: 5, orders: 0, rentals: 0, listings: 0, reports: 0, subscriptions: 21 },
    tags: ["Verified Expert"],
  },
  {
    id: 106,
    name: "Ahmad Daraghmeh",
    email: "ahmad.d@bloom.ps",
    phone: "+970 59 441 8801",
    role: "farmer",
    status: "banned",
    location: "Hebron",
    joinedAt: "2025-07-14",
    lastActiveAt: "2025-09-02",
    stats: { posts: 1, orders: 0, rentals: 0, listings: 0, reports: 5 },
    tags: ["Reported"],
  },
];

const cx = (...x) => x.filter(Boolean).join(" ");

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function initials(name = "") {
  const p = name.trim().split(/\s+/);
  const a = (p[0] || "").slice(0, 1).toUpperCase();
  const b = (p[1] || p[0] || "").slice(0, 1).toUpperCase();
  return (a + b) || "U";
}


function GlassBg() {
  // soft blobs (figma vibe)
  return (
    <>
      <div style={styles.blobA} />
      <div style={styles.blobB} />
      <div style={styles.gridNoise} />
    </>
  );
}

function Pill({ children, bg, fg, dot }) {
  return (
    <span style={{ ...styles.pill, background: bg, color: fg }}>
      {dot ? <span style={{ ...styles.dot, background: dot }} /> : null}
      {children}
    </span>
  );
}

function Tag({ tone = "leaf", children, onClick }) {
  const map = {
    leaf: { bg: "rgba(111,207,151,0.16)", fg: BLOOM.forest, ring: "rgba(111,207,151,0.30)" },
    yellow: { bg: "rgba(242,201,76,0.18)", fg: BLOOM.olive, ring: "rgba(242,201,76,0.35)" },
    red: { bg: "rgba(239,68,68,0.10)", fg: "#991b1b", ring: "rgba(239,68,68,0.20)" },
    olive: { bg: "rgba(27,67,50,0.10)", fg: BLOOM.olive, ring: "rgba(27,67,50,0.18)" },
  };
  const t = map[tone] || map.leaf;
  const clickable = typeof onClick === "function";
  return (
    <span
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        ...styles.tag,
        background: t.bg,
        color: t.fg,
        boxShadow: `0 0 0 1px ${t.ring} inset`,
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick }) {
  return (
    <button onClick={onClick} type="button" style={styles.primaryBtn}>
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button onClick={onClick} type="button" style={styles.ghostBtn}>
      {children}
    </button>
  );
}

function SoftButton({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        ...styles.softBtn,
        background: danger ? "rgba(239,68,68,0.10)" : "rgba(46,139,87,0.12)",
        color: danger ? "#991b1b" : BLOOM.olive,
        boxShadow: `0 0 0 1px ${danger ? "rgba(239,68,68,0.18)" : "rgba(46,139,87,0.22)"} inset`,
      }}
    >
      {children}
    </button>
  );
}

function Segmented({ value, onChange, options = [] }) {
  return (
    <div style={styles.segmentWrap}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              ...styles.segmentItem,
              ...(active ? styles.segmentActive : styles.segmentIdle),
            }}
          >
            <span style={{ opacity: active ? 1 : 0.8 }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Menu({ actions = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={styles.iconBtn} aria-label="More">
        ⋯
      </button>
      {open ? (
        <div style={styles.menu}>
          {actions.map((a, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setOpen(false);
                a.onClick?.();
              }}
              style={{
                ...styles.menuItem,
                color: a.danger ? "#991b1b" : BLOOM.ink,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{a.label}</div>
              {a.hint ? <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{a.hint}</div> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------- Drawer UI ------------------------------- */

function Drawer({ open, user, onClose, onUpdate }) {
  if (!open || !user) return null;

  const role = ROLE_META[user.role] || { label: user.role, bg: "rgba(0,0,0,0.06)", fg: BLOOM.ink, icon: "👤" };
  const statusKey = user.role === "expert" && user.expertStatus === "pending" ? "pending" : user.status;
  const st = STATUS_META[statusKey] || { label: statusKey, dot: "#999", bg: "rgba(0,0,0,0.06)", fg: BLOOM.ink };

  const isPendingExpert = user.role === "expert" && user.expertStatus === "pending";

  return (
    <>
      <button type="button" onClick={onClose} style={styles.overlay} aria-label="Close overlay" />
      <aside style={styles.drawer}>
        <div style={styles.drawerHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.drawerTitle}>User Details</div>
            <span style={styles.drawerSub}>Manage account & activity</span>
          </div>

          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={styles.profileCard}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={styles.avatarBig}>{initials(user.name)}</div>

              <div style={{ minWidth: 0 }}>
                <div style={styles.userName}>{user.name}</div>
                <div style={styles.userEmail}>{user.email}</div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <Pill bg={role.bg} fg={role.fg}>
                    {role.icon} {role.label}
                  </Pill>
                  <Pill bg={st.bg} fg={st.fg} dot={st.dot}>
                    {st.label}
                  </Pill>

                  {user.tags?.includes("Verified Expert") ? <Tag tone="yellow">🧠 Verified</Tag> : null}
                  {user.tags?.includes("Top Seller") ? <Tag tone="leaf">🌱 Top Seller</Tag> : null}
                  {user.tags?.includes("Reported") ? <Tag tone="red">⚠ Reported</Tag> : null}
                </div>
              </div>
            </div>

            <div style={styles.metaGrid}>
              <MetaBox label="Location" value={user.location || "—"} />
              <MetaBox label="Phone" value={user.phone || "—"} />
              <MetaBox label="Joined" value={formatDate(user.joinedAt)} />
              <MetaBox label="Last Active" value={formatDate(user.lastActiveAt)} />
              {user.role === "expert" ? (
                <MetaBox label="Expert Verified" value={formatDate(user.expertVerifiedAt)} />
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={styles.sectionTitle}>Activity</div>
            <div style={styles.kpiGrid}>
              <KpiCard label="Posts" value={user.stats?.posts ?? 0} accent="leaf" />
              <KpiCard label="Orders" value={user.stats?.orders ?? 0} accent="yellow" />
              <KpiCard label="Rentals" value={user.stats?.rentals ?? 0} accent="leaf" />
              <KpiCard label="Items" value={user.stats?.listings ?? 0} accent="olive" />
            </div>
          </div>

          {Array.isArray(user.reports) && user.reports.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div style={styles.sectionTitle}>Reports</div>
              <div style={styles.reportList}>
                {user.reports.map((report) => (
                  <div key={report.id} style={styles.reportItem}>
                    <div style={styles.reportReason}>{report.reason || "No reason provided"}</div>
                    {report.description ? <div style={styles.reportDesc}>{report.description}</div> : null}
                    {report.createdAt ? (
                      <div style={styles.reportMeta}>{formatDate(report.createdAt)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 14 }}>
            <div style={styles.sectionTitle}>Actions</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {isPendingExpert ? (
                <>
                  <SoftButton onClick={() => onUpdate(user.id, { expertStatus: "approved" })}>Approve Expert</SoftButton>
                  <SoftButton danger onClick={() => onUpdate(user.id, { expertStatus: "rejected" })}>
                    Reject Expert
                  </SoftButton>
                </>
              ) : null}

              {user.status === "banned" ? (
                <SoftButton onClick={() => onUpdate(user.id, { status: "active" })}>Unban</SoftButton>
              ) : (
                <>
                  <SoftButton
                    danger={user.status !== "suspended"}
                    onClick={() => onUpdate(user.id, { status: user.status === "suspended" ? "active" : "suspended" })}
                  >
                    {user.status === "suspended" ? "Unsuspend" : "Suspend"}
                  </SoftButton>
                  <SoftButton danger onClick={() => onUpdate(user.id, { status: "banned" })}>
                    Ban
                  </SoftButton>
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: "rgba(15,36,27,0.55)" }}>
            Later: connect these actions to Supabase (update user status + insert admin logs).
          </div>
        </div>
      </aside>
    </>
  );
}

function MetaBox({ label, value }) {
  return (
    <div style={styles.metaBox}>
      <div style={styles.metaLabel}>{label}</div>
      <div style={styles.metaValue}>{value}</div>
    </div>
  );
}

function KpiCard({ label, value, accent = "leaf" }) {
  const map = {
    leaf: { bg: "rgba(111,207,151,0.14)", ring: "rgba(111,207,151,0.26)" },
    yellow: { bg: "rgba(242,201,76,0.18)", ring: "rgba(242,201,76,0.30)" },
    olive: { bg: "rgba(27,67,50,0.08)", ring: "rgba(27,67,50,0.16)" },
  };
  const t = map[accent] || map.leaf;
  return (
    <div style={{ ...styles.kpiCard, background: "white", boxShadow: styles.shadow }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={{ height: 10 }} />
      <div style={{ ...styles.kpiBar, background: t.bg, boxShadow: `0 0 0 1px ${t.ring} inset` }} />
    </div>
  );
}

/* ---------------------------------- Page --------------------------------- */

export default function AdminUsersFigma() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const [drawerId, setDrawerId] = useState(null);
  const drawerUser = useMemo(() => users.find((u) => u.id === drawerId) || null, [users, drawerId]);
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(false);
  const [subscriptionsExpert, setSubscriptionsExpert] = useState(null);
  const [subscriptionsList, setSubscriptionsList] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState("");

  const fetchUsers = async (signal) => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${ADMIN_BASE}/users`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        signal,
      });

      if (!res.ok) throw new Error("Failed to load users");

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Admin users fetch error:", err);
      setLoadError("Unable to load users right now.");
      setUsers(seedUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => setPage(1), [query, role, status, sort, flaggedOnly]);

  const stats = useMemo(() => {
    const total = users.length;
    const farmers = users.filter((u) => u.role === "farmer").length;
    const experts = users.filter((u) => u.role === "expert").length;
    const pendingExperts = users.filter((u) => u.role === "expert" && u.expertStatus === "pending").length;
    const flagged = users.filter((u) => (u.stats?.reports ?? 0) > 0).length;
    return { total, farmers, experts, pendingExperts, flagged };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = users.filter((u) => {
      const matchQ =
        !q || [u.name, u.email, u.phone, u.location].some((x) => (x || "").toLowerCase().includes(q));
      const matchRole = role === "all" || u.role === role;
      const matchStatus =
        status === "all" ||
        (status === "pending" ? u.expertStatus === "pending" : u.status === status);
      const matchFlagged = !flaggedOnly || (u.stats?.reports ?? 0) > 0;
      return matchQ && matchRole && matchStatus && matchFlagged;
    });

    list = [...list].sort((a, b) => {
      if (sort === "newest") return new Date(b.joinedAt) - new Date(a.joinedAt);
      if (sort === "oldest") return new Date(a.joinedAt) - new Date(b.joinedAt);
      if (sort === "orders") return (b.stats?.orders ?? 0) - (a.stats?.orders ?? 0);
      if (sort === "reports") return (b.stats?.reports ?? 0) - (a.stats?.reports ?? 0);
      return 0;
    });

    return list;
  }, [users, query, role, status, sort, flaggedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const updateUser = async (id, patch) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;

    try {
      if (patch.expertStatus) {
        if (!target.expertId) {
          throw new Error("Missing expert record");
        }
        const action = patch.expertStatus === "approved" ? "approve" : "reject";
        const res = await fetch(`${ADMIN_BASE}/experts/${target.expertId}/${action}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        });
        if (!res.ok) throw new Error("Expert update failed");
      } else if (patch.status) {
        const res = await fetch(`${ADMIN_BASE}/users/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ status: patch.status }),
        });
        if (!res.ok) throw new Error("Status update failed");
      }

      await fetchUsers();
    } catch (err) {
      console.error("updateUser error:", err);
      alert(err.message || "Failed to update user.");
    }
  };

  const closeSubscriptions = () => {
    setSubscriptionsOpen(false);
    setSubscriptionsExpert(null);
    setSubscriptionsList([]);
    setSubscriptionsLoading(false);
    setSubscriptionsError("");
  };

  const openSubscriptions = async (user) => {
    if (!user || user.role !== "expert") return;
    setSubscriptionsOpen(true);
    setSubscriptionsExpert(user);
    setSubscriptionsLoading(true);
    setSubscriptionsError("");
    setSubscriptionsList([]);
    try {
      const res = await fetch(`${ADMIN_BASE}/experts/${user.id}/subscriptions`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to load subscriptions");
      }
      const data = await res.json();
      setSubscriptionsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load subscriptions error:", err);
      setSubscriptionsError("Unable to load subscriptions right now.");
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const formatSubscriptionDate = (value) => {
    if (!value) return "N/A";
    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const formatSubscriberLocation = (row) => {
    const parts = [row?.city, row?.village].filter(Boolean);
    return parts.join(", ") || "Location not set";
  };

  const isTotalActive = role === "all" && status === "all" && !flaggedOnly;
  const isFarmersActive = role === "farmer" && status === "all" && !flaggedOnly;
  const isExpertsActive = role === "expert" && status === "all" && !flaggedOnly;
  const isPendingActive = role === "expert" && status === "pending";
  const isFlaggedActive = flaggedOnly;

  return (
    <div style={styles.page}>
      <GlassBg />

      <AdminHeader />

      <div style={styles.container}>
        {/* Stats row (Figma cards) */}
        <div style={styles.statsRow}>
          <Stat
            title="Total"
            value={stats.total}
            hint="All roles"
            accent="olive"
            isActive={isTotalActive}
            onClick={() => {
              setRole("all");
              setStatus("all");
              setFlaggedOnly(false);
            }}
          />
          <Stat
            title="Farmers"
            value={stats.farmers}
            hint="Growing & selling"
            accent="leaf"
            isActive={isFarmersActive}
            onClick={() => {
              setRole("farmer");
              setStatus("all");
              setFlaggedOnly(false);
            }}
          />
          <Stat
            title="Experts"
            value={stats.experts}
            hint="Consultations"
            accent="yellow"
            isActive={isExpertsActive}
            onClick={() => {
              setRole("expert");
              setStatus("all");
              setFlaggedOnly(false);
            }}
          />
          <Stat
            title="Pending Experts"
            value={stats.pendingExperts}
            hint="Needs approval"
            accent="yellow"
            isActive={isPendingActive}
            onClick={() => {
              setRole("expert");
              setStatus("pending");
              setFlaggedOnly(false);
            }}
          />
          <Stat
            title="Flagged"
            value={stats.flagged}
            hint="Has reports"
            accent="red"
            isActive={isFlaggedActive}
            onClick={() => {
              setRole("all");
              setStatus("all");
              setFlaggedOnly((prev) => !prev);
            }}
          />
        </div>

        {/* Controls */}
        <div style={styles.panel}>
          <div style={styles.controls}>
            <div style={styles.searchWrap}>
              <span style={styles.searchIcon}>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone, location…"
                style={styles.search}
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Segmented
                value={role}
                onChange={setRole}
                options={[
                  { value: "all", label: "All" },
                  { value: "farmer", label: "Farmers" },
                  { value: "expert", label: "Experts" },
                ]}
              />

              <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>

              <select value={sort} onChange={(e) => setSort(e.target.value)} style={styles.select}>
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="orders">Sort: Most Orders</option>
                <option value="reports">Sort: Most Reports</option>
              </select>

              <GhostButton
                onClick={() => {
                  setQuery("");
                  setRole("all");
                  setStatus("all");
                  setSort("newest");
                  setFlaggedOnly(false);
                }}
              >
                Reset
              </GhostButton>
            </div>
          </div>

          {loadError ? (
            <div style={{ marginTop: 10, color: "#991b1b", fontWeight: 700, fontSize: 13 }}>{loadError}</div>
          ) : null}
          {loading ? (
            <div style={{ marginTop: 6, color: BLOOM.muted, fontWeight: 700, fontSize: 13 }}>Loading users...</div>
          ) : null}

          {/* Table */}
          <div style={styles.tableWrap}>
            <div style={{ ...styles.tableHead, ...styles.tableGrid }}>
              <div style={styles.th}>User</div>
              <div style={styles.th}>Role</div>
              <div style={styles.th}>Status</div>
              <div style={styles.th}>Location</div>
              <div style={styles.th}>Joined</div>
              <div style={styles.th}>Activity</div>
              <div style={{ ...styles.th, textAlign: "right" }}>Actions</div>
            </div>

            <div style={styles.tableBody}>
              {paged.length === 0 ? (
                <EmptyState />
              ) : (
                paged.map((u) => {
                  const r = ROLE_META[u.role] || { label: u.role, bg: "rgba(0,0,0,0.06)", fg: BLOOM.ink, icon: "👤" };
                  const statusKey = u.role === "expert" && u.expertStatus === "pending" ? "pending" : u.status;
                  const s = STATUS_META[statusKey] || { label: statusKey, dot: "#999", bg: "rgba(0,0,0,0.06)", fg: BLOOM.ink };

                  return (
                    <div key={u.id} style={{ ...styles.row, ...styles.tableGrid }}>
                      {/* User */}
                      <button type="button" onClick={() => setDrawerId(u.id)} style={styles.userCell}>
                        <div style={styles.avatar}>{initials(u.name)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.nameLine}>
                            <span style={styles.name}>{u.name}</span>
                            {(u.tags || []).includes("Verified Expert") ? <Tag tone="yellow">Verified</Tag> : null}
                            {(u.tags || []).includes("Top Seller") ? <Tag tone="leaf">Top Seller</Tag> : null}
                            {(u.tags || []).includes("Reported") ? <Tag tone="red">Reported</Tag> : null}
                          </div>
                          <div style={styles.email}>{u.email}</div>
                        </div>
                      </button>

                      {/* Role */}
                      <div style={styles.centerCell}>
                        <Pill bg={r.bg} fg={r.fg}>
                          {r.icon} {r.label}
                        </Pill>
                      </div>

                      {/* Status */}
                      <div style={styles.centerCell}>
                        <Pill bg={s.bg} fg={s.fg} dot={s.dot}>
                          {s.label}
                        </Pill>
                      </div>

                      {/* Location */}
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{u.location || "—"}</div>
                      </div>

                      {/* Joined */}
                      <div style={styles.cellStack}>
                        <div style={styles.cellMain}>{formatDate(u.joinedAt)}</div>
                        <div style={styles.cellSub}>ID #{u.id}</div>
                        {u.role === "expert" && u.expertVerifiedAt ? (
                          <div style={styles.cellSub}>
                            Verified {formatDate(u.expertVerifiedAt)}
                          </div>
                        ) : null}
                      </div>

                      {/* Activity */}
                      <div style={styles.activityGrid}>
                        <Tag tone="leaf">Posts {u.stats?.posts ?? 0}</Tag>
                        <Tag tone="yellow">Orders {u.stats?.orders ?? 0}</Tag>
                        <Tag tone="olive">Rentals {u.stats?.rentals ?? 0}</Tag>
                        <Tag tone="leaf">For Sale {u.stats?.listings ?? 0}</Tag>
                        {u.role === "expert" ? (
                          <Tag tone="yellow" onClick={() => openSubscriptions(u)}>
                            Subscriptions {u.stats?.subscriptions ?? 0}
                          </Tag>
                        ) : null}
                        <Tag tone="red">Reports {u.stats?.reports ?? 0}</Tag>
                      </div>

                      {/* Actions */}
                      <div style={styles.actionsCell}>
                        <SoftButton onClick={() => setDrawerId(u.id)}>Details</SoftButton>
                        <Menu
                          actions={[
                            ...(u.role === "expert" && u.expertStatus === "pending"
                              ? [
                                  { label: "Approve Expert", hint: "Approve verification", onClick: () => updateUser(u.id, { expertStatus: "approved" }) },
                                  { label: "Reject Expert", hint: "Reject verification", danger: true, onClick: () => updateUser(u.id, { expertStatus: "rejected" }) },
                                ]
                              : []),
                            {
                              label: u.status === "suspended" ? "Unsuspend" : "Suspend",
                              hint: "Temporarily disable account",
                              danger: u.status !== "suspended",
                              onClick: () => updateUser(u.id, { status: u.status === "suspended" ? "active" : "suspended" }),
                            },
                            {
                              label: u.status === "banned" ? "Unban" : "Ban",
                              hint: u.status === "banned" ? "Restore access" : "Block access permanently",
                              danger: u.status !== "banned",
                              onClick: () => updateUser(u.id, { status: u.status === "banned" ? "active" : "banned" }),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div style={styles.pagination}>
              <div style={{ fontSize: 13, color: BLOOM.muted, fontWeight: 700 }}>
                Showing <span style={{ color: BLOOM.ink, fontWeight: 900 }}>{paged.length}</span> of{" "}
                <span style={{ color: BLOOM.ink, fontWeight: 900 }}>{filtered.length}</span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <GhostButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Prev
                </GhostButton>
                <div style={styles.pagePill}>
                  {page} / {totalPages}
                </div>
                <GhostButton onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </GhostButton>
              </div>
            </div>
          </div>
        </div> 

       
      </div>

      <Drawer
        open={!!drawerId}
        user={drawerUser}
        onClose={() => setDrawerId(null)}
        onUpdate={updateUser}
      />

      {subscriptionsOpen && (
        <>
          <button
            type="button"
            onClick={closeSubscriptions}
            style={styles.overlay}
            aria-label="Close subscriptions list"
          />
          <div style={styles.subsPanel}>
            <div style={styles.drawerHeader}>
              <div>
                <div style={styles.drawerTitle}>Subscriptions</div>
                <div style={styles.drawerSub}>{subscriptionsExpert?.name || "Expert"}</div>
              </div>
              <button type="button" onClick={closeSubscriptions} style={styles.closeBtn}>
                X
              </button>
            </div>

            <div style={styles.subsBody}>
              {subscriptionsLoading ? (
                <div style={styles.subsEmpty}>Loading subscriptions...</div>
              ) : subscriptionsError ? (
                <div style={styles.subsEmpty}>{subscriptionsError}</div>
              ) : subscriptionsList.length === 0 ? (
                <div style={styles.subsEmpty}>No subscriptions yet.</div>
              ) : (
                subscriptionsList.map((row) => (
                  <div key={row.id} style={styles.subsRow}>
                    <div style={styles.subsAvatar}>{initials(row.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.subsName}>{row.name}</div>
                      <div style={styles.subsMeta}>
                        {row.email || "Email not set"} · {formatSubscriberLocation(row)}
                      </div>
                    </div>
                    <div style={styles.subsDates}>
                      <div style={styles.subsDateLabel}>Paid</div>
                      <div style={styles.subsDateValue}>{formatSubscriptionDate(row.paid_at)}</div>
                      <div style={styles.subsDateLabel}>Expires</div>
                      <div style={styles.subsDateValue}>{formatSubscriptionDate(row.expires_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------- Stats Card ------------------------------ */

function Stat({ title, value, hint, accent = "leaf", onClick, isActive }) {
  const map = {
    leaf: { bg: "rgba(111,207,151,0.12)", ring: "rgba(111,207,151,0.22)", chip: "rgba(111,207,151,0.18)" },
    yellow: { bg: "rgba(242,201,76,0.16)", ring: "rgba(242,201,76,0.26)", chip: "rgba(242,201,76,0.20)" },
    olive: { bg: "rgba(27,67,50,0.08)", ring: "rgba(27,67,50,0.16)", chip: "rgba(27,67,50,0.10)" },
    red: { bg: "rgba(239,68,68,0.08)", ring: "rgba(239,68,68,0.16)", chip: "rgba(239,68,68,0.10)" },
  };
  const t = map[accent] || map.leaf;
  const clickable = typeof onClick === "function";

  return (
    <div
      style={{
        ...styles.stat,
        boxShadow: isActive ? `0 0 0 2px rgba(46,139,87,0.25), ${styles.shadow}` : styles.shadow,
        outline: isActive ? `2px solid ${BLOOM.forest}` : "none",
        outlineOffset: 2,
        cursor: clickable ? "pointer" : "default",
      }}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? !!isActive : undefined}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={styles.statTitle}>{title}</div>
          <div style={styles.statValue}>{value}</div>
          <div style={styles.statHint}>{hint}</div>
        </div>
        <div style={{ ...styles.statIcon, background: t.bg, boxShadow: `0 0 0 1px ${t.ring} inset` }}>👥</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 32 }}>🌱</div>
      <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, color: BLOOM.ink }}>No results</div>
      <div style={{ marginTop: 6, fontSize: 13, color: BLOOM.muted, fontWeight: 700 }}>
        Try different filters or a shorter keyword.
      </div>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <Tag tone="olive">Tip: search by email</Tag>
      </div>
    </div>
  );
}

/* --------------------------------- Styles -------------------------------- */

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    background: BLOOM.cream,
    overflow: "hidden",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  container: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "28px 18px 60px",
    position: "relative",
    zIndex: 2,
  },

  // blobs
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

  // header
  top: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  breadcrumb: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 999,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    fontSize: 12,
    fontWeight: 800,
    color: BLOOM.olive,
  },
  breadcrumbDot: { width: 8, height: 8, borderRadius: 999, background: BLOOM.yellow, boxShadow: "0 0 0 3px rgba(242,201,76,0.20)" },

  h1: { marginTop: 12, fontSize: 34, fontWeight: 950, letterSpacing: -0.6, color: BLOOM.olive },
  subtitle: { marginTop: 6, fontSize: 13.5, fontWeight: 700, color: BLOOM.muted },

  // stats
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
  statIcon: { width: 44, height: 44, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  miniChip: { fontSize: 11, fontWeight: 900, color: BLOOM.olive, padding: "6px 10px", borderRadius: 999, border: `1px solid ${BLOOM.sage}` },

  // panel
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
    flexWrap: "wrap",
  },
  searchWrap: { position: "relative", minWidth: 280, flex: "1 1 360px" },
  searchIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 14,
    color: BLOOM.muted,
    fontWeight: 900,
  },
  search: {
    width: "100%",
    padding: "12px 14px 12px 38px",
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

  // table
  tableWrap: { borderTop: `1px solid ${BLOOM.sage}`, overflowX: "auto" },
  tableGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 1.5fr) 120px 140px 150px 140px 320px 120px",
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
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },

  userCell: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    minWidth: 0,
    width: "100%",
  },
  centerCell: { display: "flex", alignItems: "center" },
  cellStack: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  activityGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 },
  actionsCell: { display: "flex", justifyContent: "flex-end", gap: 8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    color: BLOOM.olive,
    background: "rgba(46,139,87,0.10)",
    boxShadow: "0 0 0 1px rgba(46,139,87,0.20) inset",
    flex: "0 0 auto",
  },
  nameLine: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  name: { fontSize: 13.5, fontWeight: 950, color: BLOOM.ink, letterSpacing: -0.2 },
  email: { marginTop: 3, fontSize: 12.2, fontWeight: 700, color: BLOOM.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 },

  cellMain: { fontSize: 13, fontWeight: 900, color: BLOOM.ink },
  cellSub: { marginTop: 2, fontSize: 12, fontWeight: 700, color: BLOOM.muted },

  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderTop: `1px solid ${BLOOM.sage}`,
    background: BLOOM.cream,
    flexWrap: "wrap",
  },
  pagePill: {
    padding: "10px 12px",
    borderRadius: 999,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
    fontSize: 12,
    fontWeight: 950,
    color: BLOOM.ink,
  },

  // common UI
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: `1px solid ${BLOOM.sage}`,
    whiteSpace: "nowrap",
  },
  dot: { width: 8, height: 8, borderRadius: 999, boxShadow: "0 0 0 3px rgba(0,0,0,0.04)" },
  tag: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 950, justifySelf: "start" },
  shadow: "0 4px 12px rgba(0,0,0,0.05)",

  primaryBtn: {
    padding: "11px 14px",
    borderRadius: 18,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 950,
    color: "white",
    background: BLOOM.forest,
    boxShadow: "0 10px 24px rgba(46,139,87,0.25)",
    transition: "transform .15s ease, box-shadow .15s ease",
  },
  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 18,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 950,
    color: BLOOM.muted,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  softBtn: {
    padding: "10px 12px",
    borderRadius: 16,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 950,
    border: "none",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    border: `1px solid ${BLOOM.sage}`,
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 950,
    color: BLOOM.muted,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 48,
    width: 240,
    borderRadius: 18,
    border: `1px solid ${BLOOM.sage}`,
    background: "#ffffff",
    boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
    overflow: "hidden",
    zIndex: 20,
  },
  menuItem: {
    width: "100%",
    padding: "12px 12px",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },

  // segmented
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

  // drawer
  overlay: { position: "fixed", inset: 0, background: "rgba(27,67,50,0.35)", zIndex: 50, border: "none" },
  drawer: {
    position: "fixed",
    right: 0,
    top: 0,
    height: "100%",
    width: "min(460px, 100%)",
    background: "#ffffff",
    borderLeft: `1px solid ${BLOOM.sage}`,
    boxShadow: "-12px 0 30px rgba(0,0,0,0.12)",
    zIndex: 60,
    overflow: "auto",
  },
  drawerHeader: {
    position: "sticky",
    top: 0,
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: BLOOM.cream,
    borderBottom: `1px solid ${BLOOM.sage}`,
  },
  drawerTitle: { fontSize: 16, fontWeight: 950, color: BLOOM.ink },
  drawerSub: { fontSize: 12, fontWeight: 800, color: BLOOM.muted },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    border: `1px solid ${BLOOM.sage}`,
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 950,
    color: BLOOM.muted,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },

  profileCard: {
    borderRadius: 24,
    padding: 14,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  avatarBig: {
    width: 56,
    height: 56,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    color: "white",
    background: BLOOM.forest,
    boxShadow: "0 10px 24px rgba(46,139,87,0.25)",
    flex: "0 0 auto",
  },
  userName: { fontSize: 18, fontWeight: 950, color: BLOOM.ink, letterSpacing: -0.3 },
  userEmail: { marginTop: 2, fontSize: 12.5, fontWeight: 750, color: BLOOM.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 },

  metaGrid: { marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  metaBox: {
    borderRadius: 18,
    padding: 12,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
  },
  metaLabel: { fontSize: 11.5, fontWeight: 900, color: "rgba(15,36,27,0.62)" },
  metaValue: { marginTop: 4, fontSize: 13, fontWeight: 950, color: BLOOM.ink },

  subsPanel: {
    position: "fixed",
    right: "50%",
    top: "50%",
    transform: "translate(50%, -50%)",
    width: "min(760px, 94vw)",
    maxHeight: "80vh",
    background: "#ffffff",
    borderRadius: 24,
    border: `1px solid ${BLOOM.sage}`,
    boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
    zIndex: 70,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  subsBody: {
    padding: 18,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  subsRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 18,
    border: `1px solid ${BLOOM.sage}`,
    background: "#ffffff",
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  },
  subsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: BLOOM.forest,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    flex: "0 0 auto",
  },
  subsName: { fontSize: 14, fontWeight: 900, color: BLOOM.ink },
  subsMeta: { marginTop: 2, fontSize: 12, fontWeight: 700, color: BLOOM.muted },
  subsDates: {
    textAlign: "right",
    fontSize: 11.5,
    color: BLOOM.muted,
    fontWeight: 800,
    minWidth: 120,
  },
  subsDateLabel: { textTransform: "uppercase", letterSpacing: 0.6, fontSize: 10, color: BLOOM.muted },
  subsDateValue: { fontSize: 12, fontWeight: 900, color: BLOOM.ink, marginBottom: 6 },
  subsEmpty: {
    padding: 20,
    borderRadius: 16,
    background: "rgba(27,67,50,0.05)",
    color: BLOOM.muted,
    fontWeight: 800,
    textAlign: "center",
  },

  sectionTitle: { marginTop: 12, fontSize: 13, fontWeight: 950, color: BLOOM.ink },
  reportList: { marginTop: 10, display: "grid", gap: 10 },
  reportItem: {
    padding: 12,
    borderRadius: 16,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
  },
  reportReason: { fontSize: 13, fontWeight: 900, color: BLOOM.ink },
  reportDesc: { marginTop: 4, fontSize: 12, fontWeight: 700, color: BLOOM.muted },
  reportMeta: { marginTop: 6, fontSize: 11, fontWeight: 700, color: "rgba(15,36,27,0.55)" },
  kpiGrid: { marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  kpiCard: { borderRadius: 22, padding: 14, border: `1px solid ${BLOOM.sage}` },
  kpiLabel: { fontSize: 12, fontWeight: 900, color: "rgba(15,36,27,0.62)" },
  kpiValue: { marginTop: 6, fontSize: 22, fontWeight: 950, color: BLOOM.ink, letterSpacing: -0.3 },
  kpiBar: { height: 10, borderRadius: 999 },
};
