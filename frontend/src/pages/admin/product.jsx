// AdminProductsFigma.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AdminHeader from "./AdminHeader";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const STORE_BASE = `${API_BASE}/store`;
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

const TAG_META = {
  sale: { label: "For Sale", bg: "rgba(111,207,151,0.18)", fg: BLOOM.forest, icon: "🛒" },
  rent: { label: "For Rent", bg: "rgba(242,201,76,0.22)", fg: BLOOM.olive, icon: "📦" },
};

const CATEGORY_UNITS = {
  plants: ["item", "seedling", "tray", "pot"],
  pots: ["piece", "set"],
  medicines: ["ml", "liter", "gram", "kg", "bottle"],
  crops: ["kg", "box", "sack"],
  seeds: ["pack", "gram"],
  equipment: ["item"],
};

const CATEGORY_OPTIONS = [
  { value: "plants", label: "Plants" },
  { value: "seeds", label: "Seeds & Soil" },
  { value: "crops", label: "Crops" },
  { value: "equipment", label: "Equipment" },
  { value: "pots", label: "Pots" },
  { value: "medicines", label: "Medicines" },
  { value: "other", label: "Other" },
];

const CATEGORY_VALUES = CATEGORY_OPTIONS.map((opt) => opt.value);

const seedProducts = [
  {
    id: 501,
    name: "Drip Irrigation Kit (20m)",
    tag: "sale", // sale | rent
    price: 120,
    stock: 7,
    category: "equipment",
    location: "Nablus",
    createdAt: "2026-01-05",
    owner: { id: 101, name: "Alaa Qasem" },
    reports: 0,
    image: "/img/store/placeholder.png",
    description: "Complete drip irrigation starter kit for small farms and gardens.",
  },
  {
    id: 502,
    name: "Soil pH Meter",
    tag: "rent",
    price: 15,
    stock: 2,
    category: "equipment",
    location: "Jenin",
    createdAt: "2026-01-09",
    owner: { id: 103, name: "Omar Masri" },
    reports: 1,
    image: "/img/store/placeholder.png",
    description: "Portable meter. Great for quick soil checks before planting.",
  },
  {
    id: 503,
    name: "Fungicide Spray (1L)",
    tag: "sale",
    price: 45,
    stock: 0,
    category: "medicines",
    location: "Ramallah",
    createdAt: "2025-12-21",
    owner: { id: 105, name: "Hiba Shakhshir" },
    reports: 3,
    image: "/img/store/placeholder.png",
    description: "Broad-spectrum spray. (Example) Suspended due to repeated reports.",
  },
];

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return `₪${n}`;
}

function getUnitOptions(category, tag) {
  if (tag === "rent") return ["day"];
  return CATEGORY_UNITS[category] || ["unit"];
}

function isRentAllowed(category) {
  return category === "equipment";
}

function getCategoryLabel(category = "") {
  const match = CATEGORY_OPTIONS.find((opt) => opt.value === category);
  if (match) return match.label;
  return category || "Other";
}

function getItemTag(item = {}) {
  return item.tag || (item.is_rentable ? "rent" : "sale");
}

function getItemPriceValue(item = {}) {
  const tag = getItemTag(item);
  const raw = tag === "rent" ? (item.rent_price_per_day ?? item.price) : item.price;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getItemPriceLabel(item = {}) {
  if (typeof item.price === "string") return item.price;
  const tag = getItemTag(item);
  const value = getItemPriceValue(item);
  if (value === null) return "-";
  const formatted = money(value);
  if (tag === "rent") return `${formatted} / day`;
  const unit = item.price_unit || item.priceUnit || item.unit;
  return unit ? `${formatted} / ${unit}` : formatted;
}

function getItemImage(item = {}) {
  return item.image_url || item.image || item.img || "/img/store/placeholder.png";
}

function getItemLocation(item = {}) {
  return (
    item.location ||
    item.location_name ||
    item.locationName ||
    item.city ||
    item.address ||
    ""
  );
}

function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function mapBackendItem(item = {}, reportCounts = {}, reportDetails = {}) {
  const tag = item.tag || (item.is_rentable ? "rent" : "sale");
  const priceValue =
    tag === "rent"
      ? item.rent_price_per_day ?? item.price
      : item.price ?? item.rent_price_per_day;
  const ownerId = item.farmer_id ?? item.owner_id ?? item.user_id ?? null;
  const ownerName =
    item.seller_name ||
    item.owner_name ||
    item.farmer_name ||
    item.farmer?.name ||
    item.username ||
    item.seller ||
    "";

  return {
    id: item.id,
    name: item.name || "Product",
    tag,
    price: priceValue ?? 0,
    rent_price_per_day: item.rent_price_per_day,
    price_unit: item.price_unit || item.priceUnit || item.unit || "",
    stock: item.stock ?? 0,
    category: item.category || "other",
    location:
      item.location ||
      item.location_name ||
      item.locationName ||
      item.city ||
      item.address ||
      "",
    createdAt: item.created_at || item.createdAt,
    owner: ownerId ? { id: ownerId, name: ownerName } : undefined,
    reports: reportCounts[item.id] ?? item.reports ?? 0,
    reportDetails: reportDetails[item.id] || [],
    image: item.image_url || item.image || item.img,
    description: item.description || "",
  };
}

function getDraftFromProduct(product) {
  if (!product) {
    return {
      name: "",
      category: "",
      tag: "sale",
      price: "",
      price_unit: "",
      stock: "",
      location: "",
      description: "",
      image_url: "",
    };
  }

  const tag = getItemTag(product) || "sale";
  const rawPrice =
    tag === "rent"
      ? product.rent_price_per_day ?? product.price
      : product.price ?? product.rent_price_per_day;
  const priceValue = toNumberOrNull(rawPrice);
  const unit =
    product.price_unit ||
    product.priceUnit ||
    product.unit ||
    getUnitOptions(product.category, tag)[0] ||
    (tag === "rent" ? "day" : "unit");
  const stockValue = toNumberOrNull(product.stock);

  return {
    name: product.name || "",
    category: product.category || "",
    tag,
    price: priceValue !== null ? String(priceValue) : "",
    price_unit: unit || "",
    stock: stockValue !== null ? String(stockValue) : "",
    location: getItemLocation(product) || "",
    description: product.description || "",
    image_url: product.image_url || product.image || product.img || "",
  };
}

function GlassBg() {
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

function Tag({ tone = "leaf", children }) {
  const map = {
    leaf: { bg: "rgba(111,207,151,0.16)", fg: BLOOM.forest, ring: "rgba(111,207,151,0.30)" },
    yellow: { bg: "rgba(242,201,76,0.18)", fg: BLOOM.olive, ring: "rgba(242,201,76,0.35)" },
    red: { bg: "rgba(239,68,68,0.10)", fg: "#991b1b", ring: "rgba(239,68,68,0.20)" },
    olive: { bg: "rgba(27,67,50,0.10)", fg: BLOOM.olive, ring: "rgba(27,67,50,0.18)" },
  };
  const t = map[tone] || map.leaf;
  return (
    <span style={{ ...styles.tag, background: t.bg, color: t.fg, boxShadow: `0 0 0 1px ${t.ring} inset` }}>
      {children}
    </span>
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
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SoftButton({ children, onClick, danger, subtle, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.softBtn,
        background: danger ? "rgba(239,68,68,0.10)" : subtle ? "rgba(27,67,50,0.06)" : "rgba(111,207,151,0.18)",
        color: danger ? "#991b1b" : BLOOM.olive,
        borderColor: danger ? "rgba(239,68,68,0.22)" : "rgba(27,67,50,0.12)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
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

function MetaBox({ label, value }) {
  return (
    <div style={styles.metaBox}>
      <div style={styles.metaLabel}>{label}</div>
      <div style={styles.metaValue}>{value}</div>
    </div>
  );
}

function Drawer({ product, onClose, onUpdateProduct, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => getDraftFromProduct(product));

  useEffect(() => {
    if (!product) return;
    setEditing(false);
    setDraft(getDraftFromProduct(product));
  }, [product]);

  if (!product) return null;

  const tagKey = getItemTag(product);
  const tag = TAG_META[tagKey] || TAG_META.sale;
  const location = getItemLocation(product) || "";
  const reportDetails = Array.isArray(product.reportDetails) ? product.reportDetails : [];
  const formatReportDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  };

  const onFieldChange = (field) => (e) => {
    const value = e.target.value;
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = () => {
    const cleanedName = draft.name.trim();
    const cleanedCategory = draft.category.trim();
    const cleanedLocation = draft.location.trim();
    const cleanedDescription = draft.description.trim();
    const cleanedUnit = draft.price_unit.trim();
    const priceValue = toNumberOrNull(draft.price);
    const stockValue = toNumberOrNull(draft.stock);

    const next = {
      name: cleanedName || product.name || "",
      category: cleanedCategory || product.category || "",
      location: cleanedLocation || getItemLocation(product) || "",
      description: cleanedDescription || product.description || "",
      tag: draft.tag || getItemTag(product),
      price_unit:
        cleanedUnit ||
        product.price_unit ||
        product.priceUnit ||
        product.unit ||
        (draft.tag === "rent" ? "day" : ""),
      image_url: draft.image_url.trim(),
    };

    if (priceValue !== null) next.price = priceValue;
    if (stockValue !== null) next.stock = Math.max(0, Math.floor(stockValue));

    onUpdateProduct(product.id, next);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(getDraftFromProduct(product));
    setEditing(false);
  };

  const normalizedCategory = draft.category || "";
  const categoryList = CATEGORY_OPTIONS.some((opt) => opt.value === normalizedCategory)
    ? CATEGORY_OPTIONS
    : normalizedCategory
      ? [{ value: normalizedCategory, label: normalizedCategory }, ...CATEGORY_OPTIONS]
      : CATEGORY_OPTIONS;
  const unitOptions = getUnitOptions(normalizedCategory, draft.tag || "sale");
  const unitList = draft.price_unit && !unitOptions.includes(draft.price_unit)
    ? [draft.price_unit, ...unitOptions]
    : unitOptions;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <img src={getItemImage(product)} alt={product.name} />
        </div>

        <div className="modal-body">
          <div
            className="edit-actions"
            style={{ marginBottom: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            {!editing ? (
              <>
                <button className="modal-btn modal-btn-secondary" onClick={() => setEditing(true)}>
                  Edit Item
                </button>
                <button className="modal-btn modal-btn-danger" onClick={() => onDelete(product.id)}>
                  Delete
                </button>
              </>
            ) : (
              <>
                <button className="edit-btn edit-btn-save" onClick={saveEdit}>
                  Save Changes
                </button>
                <button className="edit-btn edit-btn-cancel" onClick={cancelEdit}>
                  Cancel
                </button>
              </>
            )}
          </div>

          {editing ? (
            <div className="edit-form">
              <div className="edit-form-group">
                <label className="edit-form-label">Item Name *</label>
                <input
                  type="text"
                  className="edit-form-input"
                  value={draft.name}
                  onChange={onFieldChange("name")}
                />
              </div>

              <div className="edit-form-row">
                <div className="edit-form-group">
                  <label className="edit-form-label">Category *</label>
                  <select
                    className="edit-form-select"
                    value={normalizedCategory}
                    onChange={(e) => {
                      const value = e.target.value;
                      const tagValue = draft.tag || "sale";
                      const nextUnits = getUnitOptions(value, tagValue);
                      const nextUnit =
                        tagValue === "rent"
                          ? "day"
                          : nextUnits.includes(draft.price_unit)
                            ? draft.price_unit
                            : nextUnits[0] || "unit";
                      setDraft((prev) => ({
                        ...prev,
                        category: value,
                        price_unit: nextUnit,
                      }));
                    }}
                  >
                    {categoryList.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="edit-form-group">
                  <label className="edit-form-label">Type *</label>
                  <select
                    className="edit-form-select"
                    value={draft.tag}
                    onChange={(e) => {
                      const value = e.target.value;
                      const nextUnits = getUnitOptions(normalizedCategory, value);
                      const nextUnit = value === "rent" ? "day" : nextUnits[0] || "unit";
                      setDraft((prev) => ({
                        ...prev,
                        tag: value,
                        price_unit: prev.price_unit || nextUnit,
                      }));
                    }}
                  >
                    <option value="sale">For Sale</option>
                    <option value="rent" disabled={!isRentAllowed(normalizedCategory)}>
                      For Rent (equipment only)
                    </option>
                  </select>
                </div>
              </div>

              <div className="edit-form-row">
                <div className="edit-form-group">
                  <label className="edit-form-label">
                    Price (₪ {draft.tag === "rent" ? "/ day" : `/ ${draft.price_unit || "unit"}`}) *
                  </label>
                  <input
                    type="number"
                    className="edit-form-input"
                    value={draft.price}
                    onChange={onFieldChange("price")}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="edit-form-group">
                  <label className="edit-form-label">Unit</label>
                  <select
                    className="edit-form-select"
                    value={draft.price_unit}
                    onChange={onFieldChange("price_unit")}
                    disabled={draft.tag === "rent"}
                  >
                    {unitList.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="edit-form-group">
                  <label className="edit-form-label">Stock Quantity *</label>
                  <input
                    type="number"
                    className="edit-form-input"
                    value={draft.stock}
                    onChange={onFieldChange("stock")}
                    min="0"
                  />
                </div>
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Location *</label>
                <input
                  type="text"
                  className="edit-form-input"
                  value={draft.location}
                  onChange={onFieldChange("location")}
                  placeholder="e.g., Nablus - Delivery Available"
                />
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Image URL</label>
                <input
                  type="url"
                  className="edit-form-input"
                  value={draft.image_url}
                  onChange={onFieldChange("image_url")}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Description</label>
                <textarea
                  className="edit-form-textarea"
                  value={draft.description}
                  onChange={onFieldChange("description")}
                  placeholder="Describe your item in detail..."
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="modal-title">{product.name}</h2>
              <div className="modal-price">{getItemPriceLabel(product)}</div>

              <div className="modal-section">
                <h3 className="modal-section-title">Item Details</h3>
                <div className="modal-section-content simple-details">
                  <div className="detail-row">
                    <span className="detail-label">Type</span>
                    <span>{tag.label}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Category</span>
                    <span>{getCategoryLabel(product.category || "other")}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Location</span>
                    <span>{location || "Location unavailable"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Stock</span>
                    <span>{Number.isFinite(product.stock) ? product.stock : "-"}</span>
                  </div>
                </div>
              </div>

              {product.description ? (
                <div className="modal-section">
                  <h3 className="modal-section-title">Description</h3>
                  <div className="modal-section-content">{product.description}</div>
                </div>
              ) : null}

              {reportDetails.length ? (
                <div className="modal-section">
                  <h3 className="modal-section-title">Reports</h3>
                  <div className="modal-section-content" style={{ display: "grid", gap: 10 }}>
                    {reportDetails.map((report, idx) => {
                      const reason = report.reason || "Unspecified";
                      const description = report.description || "";
                      const createdAt = formatReportDate(report.createdAt);
                      return (
                        <div
                          key={report.id || `${product.id}-report-${idx}`}
                          style={{
                            padding: "10px 12px",
                            border: `1px solid ${BLOOM.line}`,
                            borderRadius: 12,
                            background: BLOOM.sage,
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{reason}</div>
                          {description ? <div style={{ marginTop: 6 }}>{description}</div> : null}
                          {createdAt ? (
                            <div style={{ marginTop: 8, fontSize: 12, color: BLOOM.muted }}>
                              {createdAt}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Page --------------------------------- */

export default function AdminProductsFigma() {
  const [products, setProducts] = useState(seedProducts);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all"); // all | sale | rent
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest"); // newest | oldest | priceHigh | priceLow | reports
  const [reportOnly, setReportOnly] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const [drawerId, setDrawerId] = useState(null);
  const drawerProduct = useMemo(
    () => products.find((p) => p.id === drawerId) || null,
    [products, drawerId]
  );

  const categories = useMemo(() => ["all", ...CATEGORY_VALUES], []);

  const activeKpi = reportOnly ? "reported" : tag === "sale" ? "sale" : tag === "rent" ? "rent" : "all";

  const applyKpiFilter = (next) => {
    if (next === "reported") {
      setReportOnly((prev) => {
        const nextValue = !prev;
        if (nextValue) setTag("all");
        return nextValue;
      });
      return;
    }
    setReportOnly(false);
    if (next === "sale") setTag("sale");
    else if (next === "rent") setTag("rent");
    else setTag("all");
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = products.length;
    const forSale = products.filter((p) => getItemTag(p) === "sale").length;
    const forRent = products.filter((p) => getItemTag(p) === "rent").length;
    const reported = products.filter((p) => (p.reports || 0) > 0).length;
    return { total, forSale, forRent, reported };
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let arr = [...products];

    if (q) {
      arr = arr.filter((p) => {
        const sellerName =
          p.owner?.name ||
          p.owner_name ||
          p.seller ||
          p.seller_name ||
          p.farmer?.name ||
          "";
        const hay = [p.name, p.category, getItemLocation(p), p.description, sellerName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (tag !== "all") arr = arr.filter((p) => getItemTag(p) === tag);
    if (category !== "all") {
      if (category === "other") {
        arr = arr.filter((p) => !CATEGORY_VALUES.includes(p.category) || p.category === "other");
      } else {
        arr = arr.filter((p) => p.category === category);
      }
    }
    if (reportOnly) {
      arr = arr.filter((p) => (p.reports || 0) > 0);
    }

    // sorting
    arr.sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "priceHigh") return (getItemPriceValue(b) || 0) - (getItemPriceValue(a) || 0);
      if (sort === "priceLow") return (getItemPriceValue(a) || 0) - (getItemPriceValue(b) || 0);
      if (sort === "reports") return (b.reports || 0) - (a.reports || 0);
      // newest default
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return arr;
  }, [products, query, tag, category, sort]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, tag, category, sort]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const token = localStorage.getItem("token");
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const [itemsRes, reportsRes] = await Promise.all([
          fetch(`${STORE_BASE}/items`, { signal: controller.signal }),
          fetch(`${ADMIN_BASE}/reports`, { headers: authHeaders, signal: controller.signal }).catch(
            () => null
          ),
        ]);

        if (!itemsRes.ok) {
          throw new Error(`Items request failed (${itemsRes.status})`);
        }

        const itemsData = await itemsRes.json();

        let reportCounts = {};
        let reportDetails = {};
        if (reportsRes && reportsRes.ok) {
          const reportsData = await reportsRes.json();
          reportCounts = (reportsData || []).reduce((acc, report) => {
            if (report?.target_type === "item" && report?.target_id) {
              const key = Number(report.target_id);
              if (Number.isFinite(key)) acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
          }, {});
          reportDetails = (reportsData || []).reduce((acc, report) => {
            if (report?.target_type === "item" && report?.target_id) {
              const key = Number(report.target_id);
              if (Number.isFinite(key)) {
                if (!acc[key]) acc[key] = [];
                acc[key].push({
                  id: report.id,
                  reason: report.reason || "",
                  description: report.description || "",
                  createdAt: report.created_at,
                });
              }
            }
            return acc;
          }, {});
        }

        const mapped = Array.isArray(itemsData)
          ? itemsData.map((item) => mapBackendItem(item, reportCounts, reportDetails))
          : [];

        if (!cancelled) {
          setProducts(mapped.length ? mapped : seedProducts);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to load products:", err);
        if (!cancelled) {
          setLoadError("Could not load products. Showing demo data.");
          setProducts(seedProducts);
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

  const onUpdateProduct = async (id, patch) => {
    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    const payload = { ...patch };

    if (patch.tag === "rent") {
      payload.is_rentable = true;
      if (patch.price !== undefined) payload.rent_price_per_day = patch.price;
    } else if (patch.tag === "sale") {
      payload.is_rentable = false;
      if (patch.price !== undefined) payload.price = patch.price;
    }

    try {
      const res = await fetch(`${STORE_BASE}/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Update failed (${res.status})`);
      }

      const updatedItem = data.item || data;
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const reports = p.reports || 0;
          const details = Array.isArray(p.reportDetails) ? p.reportDetails : [];
          return mapBackendItem(updatedItem, { [id]: reports }, { [id]: details });
        })
      );
    } catch (err) {
      console.error("Update product failed:", err);
      alert(`Could not update product: ${err.message}`);
    }
  };

  const onDelete = async (id) => {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;
    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${STORE_BASE}/items/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data?.references) {
          const parts = [];
          if (data.references.orders) parts.push(`${data.references.orders} order(s)`);
          if (data.references.rentals) parts.push(`${data.references.rentals} rental(s)`);
          if (data.references.cart) parts.push(`${data.references.cart} cart item(s)`);
          const details = parts.length ? ` (${parts.join(", ")})` : "";
          throw new Error(`Cannot delete: item is referenced${details}.`);
        }
        throw new Error(data?.message || data?.error || `Delete failed (${res.status})`);
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (drawerId === id) setDrawerId(null);
    } catch (err) {
      console.error("Delete product failed:", err);
      alert(`Could not delete product: ${err.message}`);
    }
  };

  return (
    <>
      <AdminHeader />
      <style>{`
:root {
  --forest: #2E8B57;
  --leaf: #6FCF97;
  --yellow: #F2C94C;
  --cream: #FAF9F6;
  --sage: #E8F3E8;
  --olive: #1B4332;
  --text: #333333;
  --sub: #4F6F52;
  --white: #ffffff;
  --error: #e74c3c;
  --success: #2ecc71;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-content {
  background-color: white;
  border-radius: 24px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: modalFadeIn 0.3s ease;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--sage);
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  color: var(--olive);
  transition: all 0.2s ease;
  z-index: 10;
}

.modal-close:hover {
  background-color: var(--forest);
  color: white;
  transform: rotate(90deg);
}

.modal-header {
  position: relative;
  height: 250px;
  border-radius: 24px 24px 0 0;
  overflow: hidden;
}

.modal-header img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-body {
  padding: 30px;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--olive);
  margin-bottom: 10px;
}

.modal-price {
  font-size: 22px;
  font-weight: 700;
  color: var(--forest);
  margin-bottom: 20px;
}

.modal-location {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--sub);
  font-size: 14px;
  margin-bottom: 20px;
}

.modal-section {
  margin-bottom: 25px;
}

.modal-section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--olive);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-section-content {
  color: var(--text);
  line-height: 1.6;
}

.simple-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(27,67,50,0.1);
  font-size: 14px;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--sub);
  font-weight: 600;
}

.modal-footer {
  display: flex;
  gap: 15px;
  padding-top: 20px;
  border-top: 1px solid var(--sage);
}

.modal-btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.modal-btn-primary {
  background-color: var(--forest);
  color: white;
}

.modal-btn-primary:hover {
  background-color: var(--yellow);
  color: var(--olive);
}

.modal-btn-secondary {
  background-color: white;
  color: var(--forest);
  border: 1px solid var(--forest);
}

.modal-btn-secondary:hover {
  background-color: var(--sage);
}

.modal-btn-danger {
  background-color: white;
  color: var(--error);
  border: 1px solid var(--error);
}

.modal-btn-danger:hover {
  background-color: var(--error);
  color: white;
}

.edit-form {
  background-color: var(--sage);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.edit-form-group {
  margin-bottom: 15px;
}

.edit-form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}

.edit-form-input,
.edit-form-select,
.edit-form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(27,67,50,0.25);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  transition: all 0.2s ease;
  background-color: white;
}

.edit-form-input:focus,
.edit-form-select:focus,
.edit-form-textarea:focus {
  outline: none;
  border-color: var(--forest);
  box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
}

.edit-form-textarea {
  min-height: 100px;
  resize: vertical;
}

.edit-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.edit-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.edit-btn {
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.edit-btn-save {
  background-color: var(--forest);
  color: white;
}

.edit-btn-save:hover {
  background-color: var(--yellow);
  color: var(--olive);
}

.edit-btn-cancel {
  background-color: white;
  color: var(--forest);
  border: 1px solid var(--forest);
}

.edit-btn-cancel:hover {
  background-color: var(--sage);
}

.edit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
      `}</style>
      <div style={styles.page}>
        <GlassBg />

        <div style={styles.container}>
          <div style={styles.top}>
            <div>
              <div style={styles.title}>Products</div>
              <div style={styles.subtitle}>Manage store items (sale + rent) and reports.</div>
            </div>
          </div>

          <div style={styles.statsRow}>
            <Stat
              title="Total"
              value={kpis.total}
              hint="All products"
              accent="olive"
              active={activeKpi === "all"}
              onClick={() => applyKpiFilter("all")}
            />
            <Stat
              title="For Sale"
              value={kpis.forSale}
              hint="Available for purchase"
              accent="leaf"
              active={activeKpi === "sale"}
              onClick={() => applyKpiFilter("sale")}
            />
            <Stat
              title="For Rent"
              value={kpis.forRent}
              hint="Available for rental"
              accent="yellow"
              active={activeKpi === "rent"}
              onClick={() => applyKpiFilter("rent")}
            />
            <Stat
              title="Reported"
              value={kpis.reported}
              hint="Has reports"
              accent="red"
              active={activeKpi === "reported"}
              onClick={() => applyKpiFilter("reported")}
            />
          </div>

          <div style={styles.panel}>
            <div style={styles.controls}>
              <div style={styles.searchWrap}>
                <span style={styles.searchIcon}>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, location, category"
                  style={styles.search}
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Segmented
                  value={tag}
                  onChange={(next) => {
                    setTag(next);
                    if (reportOnly) setReportOnly(false);
                  }}
                  options={[
                    { value: "all", label: "All" },
                    { value: "sale", label: "For Sale" },
                    { value: "rent", label: "For Rent" },
                  ]}
                />

            <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All Categories" : getCategoryLabel(c)}
                </option>
              ))}
            </select>

                <select value={sort} onChange={(e) => setSort(e.target.value)} style={styles.select}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="priceLow">Price: Low to High</option>
                  <option value="reports">Most Reported</option>
                </select>
              </div>
            </div>

            {loadError ? (
              <div style={{ marginTop: 10, color: "#991b1b", fontWeight: 700, fontSize: 13 }}>
                {loadError}
              </div>
            ) : null}
            {loading ? (
              <div style={{ marginTop: 6, color: BLOOM.muted, fontWeight: 700, fontSize: 13 }}>
                Loading products...
              </div>
            ) : null}

            <div style={styles.tableWrap}>
            <div style={{ ...styles.tableHead, ...styles.tableGrid }}>
              <div style={styles.th}>Product</div>
              <div style={styles.th}>Seller</div>
              <div style={styles.th}>Type</div>
              <div style={styles.th}>Location</div>
              <div style={styles.th}>Price</div>
              <div style={styles.th}>Stock</div>
                <div style={styles.th}>Reports</div>
                <div style={{ ...styles.th, textAlign: "right" }}>Actions</div>
              </div>

              <div style={styles.tableBody}>
                {paged.length === 0 ? (
                  <EmptyState />
                ) : (
                  paged.map((p) => {
                  const tagKey = getItemTag(p);
                  const tg = TAG_META[tagKey] || TAG_META.sale;
                  const reports = Number(p.reports || 0);
                  const location = getItemLocation(p) || "Location not set";
                  const sellerName =
                    p.owner?.name ||
                    p.owner_name ||
                    p.seller ||
                    p.seller_name ||
                    "Unknown";

                  return (
                    <div key={p.id} style={{ ...styles.row, ...styles.tableGrid }}>
                      <button type="button" onClick={() => setDrawerId(p.id)} style={styles.productCell}>
                          <div style={styles.productAvatar}>
                            <img
                              src={getItemImage(p)}
                              alt={p.name}
                              style={styles.productThumb}
                            />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={styles.nameLine}>
                              <span style={styles.name}>{p.name}</span>
                              {reports > 0 ? <Tag tone="red">Reported</Tag> : null}
                            </div>
                            <div style={styles.email}>{getCategoryLabel(p.category || "other")}</div>
                          </div>
                        </button>

                        <div style={styles.cellStack}>
                          <div style={styles.cellMain}>{sellerName}</div>
                        </div>

                        <div style={styles.centerCell}>
                          <Pill bg={tg.bg} fg={tg.fg}>
                            {tg.icon} {tg.label}
                          </Pill>
                        </div>

                        <div style={styles.cellStack}>
                          <div style={styles.cellMain}>{location}</div>
                        </div>

                        <div style={styles.cellStack}>
                          <div style={styles.cellMain}>{getItemPriceLabel(p)}</div>
                        </div>

                        <div style={styles.cellStack}>
                          <div style={styles.cellMain}>{Number.isFinite(p.stock) ? p.stock : "-"}</div>
                        </div>

                        <div style={styles.centerCell}>
                          {reports > 0 ? (
                            <Pill bg="rgba(239,68,68,0.12)" fg="#991b1b" dot="#ef4444">
                              {reports}
                            </Pill>
                          ) : (
                            <div style={styles.cellMain}>0</div>
                          )}
                        </div>

                        <div style={styles.actionsCell}>
                          <SoftButton onClick={() => setDrawerId(p.id)}>Details</SoftButton>
                          <Menu
                            actions={[
                              {
                                label: "Edit",
                                hint: "Update product details",
                                onClick: () => setDrawerId(p.id),
                              },
                              {
                                label: "Delete",
                                hint: "Remove product",
                                danger: true,
                                onClick: () => onDelete(p.id),
                              },
                            ]}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={styles.pagination}>
              <div style={{ fontSize: 13, color: BLOOM.muted, fontWeight: 700 }}>
                Showing <span style={{ color: BLOOM.ink, fontWeight: 900 }}>{paged.length}</span> of{" "}
                <span style={{ color: BLOOM.ink, fontWeight: 900 }}>{filtered.length}</span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <SoftButton subtle disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </SoftButton>
                <div style={styles.pagePill}>
                  {page} / {totalPages}
                </div>
                <SoftButton subtle disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </SoftButton>
              </div>
            </div>
          </div>
        </div>

        <Drawer
          product={drawerProduct}
          onClose={() => setDrawerId(null)}
          onUpdateProduct={onUpdateProduct}
          onDelete={onDelete}
        />
      </div>
    </>
  );
}

/* ------------------------------- Stats Card ------------------------------ */

function Stat({ title, value, hint, accent = "leaf", onClick, active }) {
  const map = {
    leaf: { bg: "rgba(111,207,151,0.12)", ring: "rgba(111,207,151,0.22)", chip: "rgba(111,207,151,0.18)" },
    yellow: { bg: "rgba(242,201,76,0.16)", ring: "rgba(242,201,76,0.26)", chip: "rgba(242,201,76,0.20)" },
    olive: { bg: "rgba(27,67,50,0.08)", ring: "rgba(27,67,50,0.16)", chip: "rgba(27,67,50,0.10)" },
    red: { bg: "rgba(239,68,68,0.08)", ring: "rgba(239,68,68,0.16)", chip: "rgba(239,68,68,0.10)" },
  };
  const t = map[accent] || map.leaf;
  const interactiveProps = onClick
    ? {
        role: "button",
        tabIndex: 0,
        onClick,
        "aria-pressed": !!active,
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <div
      style={{
        ...styles.stat,
        ...(onClick ? styles.statClickable : null),
        ...(active ? styles.statActive : null),
      }}
      {...interactiveProps}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={styles.statTitle}>{title}</div>
          <div style={styles.statValue}>{value}</div>
          <div style={styles.statHint}>{hint}</div>
        </div>
        <div style={{ ...styles.statIcon, background: t.bg, boxShadow: `0 0 0 1px ${t.ring} inset` }}>📦</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 32 }}>📦</div>
      <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, color: BLOOM.ink }}>No products found</div>
      <div style={{ marginTop: 6, fontSize: 13, color: BLOOM.muted, fontWeight: 700 }}>
        Try different filters or a shorter keyword.
      </div>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <Tag tone="olive">Tip: search by category</Tag>
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
    maxWidth: 1360,
    margin: "0 auto",
    padding: "28px 18px 60px",
    position: "relative",
    zIndex: 2,
  },
  top: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  title: { fontSize: 34, fontWeight: 950, letterSpacing: -0.6, color: BLOOM.olive },
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
  statClickable: {
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  statActive: {
    border: `1px solid ${BLOOM.leaf}`,
    boxShadow: "0 8px 18px rgba(46,139,87,0.18)",
  },
  statTitle: { fontSize: 12, fontWeight: 900, color: BLOOM.muted },
  statValue: { marginTop: 6, fontSize: 26, fontWeight: 950, color: BLOOM.ink, letterSpacing: -0.4 },
  statHint: { marginTop: 4, fontSize: 12.5, fontWeight: 700, color: BLOOM.muted },
  statIcon: { width: 44, height: 44, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" },

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

  // table
  tableWrap: { borderTop: `1px solid ${BLOOM.sage}`, overflowX: "hidden" },
  tableGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(260px, 2fr) minmax(160px, 1.2fr) minmax(120px, 0.9fr) minmax(180px, 1.2fr) minmax(140px, 1fr) minmax(90px, 0.7fr) minmax(90px, 0.7fr) minmax(120px, 0.9fr)",
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
  productCell: {
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
  productAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    overflow: "hidden",
    flex: "0 0 auto",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  productThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  nameLine: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  name: { fontSize: 13.5, fontWeight: 950, color: BLOOM.ink, letterSpacing: -0.2 },
  email: { marginTop: 3, fontSize: 12.2, fontWeight: 700, color: BLOOM.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 },
  centerCell: { display: "flex", alignItems: "center" },
  cellStack: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  cellMain: { fontSize: 13, fontWeight: 900, color: BLOOM.ink },
  actionsCell: { display: "flex", justifyContent: "flex-end", gap: 8 },

  pill: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 99 },
  tag: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 950, justifySelf: "start" },
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

  kpiCard: { borderRadius: 22, padding: 14, border: `1px solid ${BLOOM.sage}` },
  kpiLabel: { fontSize: 12, fontWeight: 900, color: "rgba(15,36,27,0.62)" },
  kpiValue: { marginTop: 6, fontSize: 22, fontWeight: 950, color: BLOOM.ink, letterSpacing: -0.3 },
  kpiBar: { height: 10, borderRadius: 999 },
  metaBox: {
    borderRadius: 18,
    padding: 12,
    background: "#ffffff",
    border: `1px solid ${BLOOM.sage}`,
  },
  metaLabel: { fontSize: 11.5, fontWeight: 900, color: "rgba(15,36,27,0.62)" },
  metaValue: { marginTop: 4, fontSize: 13, fontWeight: 950, color: BLOOM.ink },

  shadow: "0 4px 12px rgba(0,0,0,0.05)",

  // background blobs
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
};
