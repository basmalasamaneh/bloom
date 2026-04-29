import React, { useEffect, useRef, useState } from "react";
import MyOrdersPage from "./MyOrdersPage";
import MyRentalsPage from "./MyRentalsPage";
import { useNavigate } from "react-router-dom";
import Header from '../components/Header';
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
const STORE_BASE = `${API_BASE}/store`;
const FALLBACK_IMAGE = "/img/store/placeholder.png";
const token = localStorage.getItem("token");

const CATEGORY_UNITS = {
  plants: ["item", "seedling", "tray", "pot"],
  pots: ["piece", "set"],
  medicines: ["ml", "liter", "gram", "kg", "bottle"],
  crops: ["kg", "box", "sack"],
  seeds: ["pack", "gram"],
  equipment: ["item"],
};

let userId = null;

if (token) {
  try {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    userId = decoded.id || decoded.user_id || decoded.farmer_id || null;
  } catch (err) {
    console.error("Token decode failed:", err);
  }
}

const DEFAULT_MAP_CENTER = { lat: 31.9522, lng: 35.2332 };

const leafletMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const getUnitOptions = (category, tag) => {
  if (tag === "rent") return ["day"];
  return CATEGORY_UNITS[category] || ["unit"];
};

const getDefaultUnit = (category, tag) => {
  const opts = getUnitOptions(category, tag);
  return opts[0] || "unit";
};

const isRentAllowed = (category) => category === "equipment";


export default function StorePage() {
  const navigate = useNavigate();
  // -------------------------------------------------------------
  // PRODUCTS DATA (You can add as many as you want later)
  // -------------------------------------------------------------
  const allProducts = [
    {
      id: 1,
      name: "Organic Tomato Seedlings",
      category: "plants",
      price: "15₪",
      tag: "sale",
      location: "Nablus — Delivery Available",
      coords: { lat: 32.2211, lng: 35.2544 },
      img: "https://images.pexels.com/photos/4750270/pexels-photo-4750270.jpeg?auto=compress",
      description: "High-quality organic tomato seedlings grown without pesticides. Perfect for home gardens and small farms.",
      seller: "Green Valley Farm",
      stock: 45,
      rating: 4.7,
      reviews: 23,
    },
    {
      id: 2,
      name: "Electric Sprayer (16L)",
      category: "equipment",
      price: "10₪ / day",
      tag: "rent",
      location: "Jenin — No Delivery",
      coords: { lat: 32.459, lng: 35.301 },
      img: "https://images.pexels.com/photos/4207909/pexels-photo-4207909.jpeg?auto=compress",
      description: "Powerful electric sprayer with 16L capacity. Perfect for applying fertilizers and pesticides efficiently.",
      seller: "Farm Tools Rental Co.",
      stock: 8,
      rating: 4.5,
      reviews: 15,
    },
    {
      id: 3,
      name: "Premium Soil Mix",
      category: "seeds",
      price: "20₪",
      tag: "sale",
      location: "Tulkarm — Delivery Available",
      coords: { lat: 32.31, lng: 35.028 },
      img: "https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress",
      description: "Nutrient-rich soil mix perfect for all types of plants. Contains organic compost and essential minerals.",
      seller: "Earth's Best Soil",
      stock: 120,
      rating: 4.9,
      reviews: 42,
    },
    {
      id: 4,
      name: "Clay Pot (Large)",
      category: "pots",
      price: "12₪",
      tag: "sale",
      location: "Nablus — Delivery Available",
      coords: { lat: 32.2211, lng: 35.2544 },
      img: "https://images.pexels.com/photos/450326/pexels-photo-450326.jpeg?auto=compress",
      description: "Handcrafted clay pot with drainage system. Perfect for indoor and outdoor plants.",
      seller: "Pottery Workshop",
      stock: 30,
      rating: 4.6,
      reviews: 18,
    },
    {
      id: 5,
      name: "Plant Medicine – Anti-Fungi",
      category: "medicines",
      price: "25₪",
      tag: "sale",
      location: "Hebron — Delivery Available",
      coords: { lat: 31.5326, lng: 35.0998 },
      img: "https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress",
      description: "Effective anti-fungal treatment for common plant diseases. Safe for edible plants.",
      seller: "Plant Health Solutions",
      stock: 65,
      rating: 4.8,
      reviews: 27,
    },
    {
      id: 6,
      name: "Seasonal Harvest Basket",
      category: "crops",
      price: "18₪",
      tag: "sale",
      location: "Jenin — Delivery Available",
      coords: { lat: 32.45, lng: 35.299 },
      img: "https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg?auto=compress&cs=tinysrgb&w=800",
      description: "Fresh mixed vegetables harvested this week, perfect for farm-to-table customers.",
      seller: "Family Farm Co.",
      stock: 25,
      rating: 4.8,
      reviews: 31,
    },
  ];

  const parsePriceValue = (value) => {
    if (typeof value === "number") return value;
    if (!value) return 0;
    const cleaned = String(value).replace(/[^0-9.,-]/g, "").replace(",", ".");
    const number = parseFloat(cleaned);
    return Number.isFinite(number) ? number : 0;
  };

  const formatPrice = (value, suffix = "") => {
    const numeric = parsePriceValue(value);
    const suffixText = suffix ? ` ${suffix}` : "";
    return `${numeric.toFixed(2)}₪${suffixText}`;
  };

  const mapBackendItem = (item = {}) => {
    const tag = item.tag || (item.is_rentable ? "rent" : "sale");
    const priceSource =
      tag === "rent"
        ? item.rent_price_per_day ?? item.price
        : item.price ?? item.rent_price_per_day;
    const priceUnit =
      tag === "rent"
        ? "day"
        : item.price_unit || item.priceUnit || item.unit || getDefaultUnit(item.category, tag);
    const locationValue =
      item.location ||
      item.location_name ||
      item.locationName ||
      item.city ||
      item.address ||
      item.area ||
      item.region ||
      "";

    return {
      id: item.id,
      name: item.name || "Product",
      category: item.category || "other",
      price: formatPrice(
        priceSource,
        tag === "rent" ? "/ day" : priceUnit ? `/ ${priceUnit}` : ""
      ),
      priceValue: parsePriceValue(priceSource),
      price_unit: priceUnit || "",
      priceUnit: priceUnit || "",
      tag,
      location: locationValue,
      coords: resolveCoordsFromItem(item, locationValue),
      img: item.image_url || FALLBACK_IMAGE,
      description: item.description || "No description provided.",
      seller:
        item.seller ||
        item.seller_name ||
        item.farmer_name ||
        item.farmer?.name ||
        item.username ||
        item.user_name ||
        item.owner_name ||
        "Seller",
      stock: item.stock ?? 0,
      rating: item.rating ?? 4.5,
      reviews: item.reviews ?? 0,
      ownerId: item.farmer_id ?? item.owner_id ?? item.ownerId ?? item.user_id ?? null,
      farmerId: item.farmer_id ?? null,
    };
  };

  const mapCartRow = (row = {}) => {
    const product = mapBackendItem(row.store_items || row.item || row);
    return {
      ...product,
      quantity: row.quantity || product.quantity || 1,
      cartRowId: row.id || row.cart_id || row.cartRowId,
    };
  };

  const getItemPriceValue = (item) => {
    if (!item) return 0;
    if (typeof item.priceValue === "number") return item.priceValue;
    return parsePriceValue(item.price);
  };

  // -------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------
  const [activeCategory, setActiveCategory] = useState("all");
  const [saleRentFilter, setSaleRentFilter] = useState("all"); // all | sale | rent
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null); // For details modal
  const selectedOutOfStock =
    selectedProduct &&
    selectedProduct.tag !== "rent" &&
    Number(selectedProduct.stock) <= 0;
  const [reportSending, setReportSending] = useState(false);
  const [rentStart, setRentStart] = useState("");
  const [rentEnd, setRentEnd] = useState("");
  const [rentError, setRentError] = useState("");
  const [rentLoading, setRentLoading] = useState(false);
  const [rentUnavailable, setRentUnavailable] = useState([]); // [{ start, end }]
  const [rentDatesLoading, setRentDatesLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]); // Cart items
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState("");
  const [showCart, setShowCart] = useState(false); // Show cart modal
  const [showCheckout, setShowCheckout] = useState(false); // Show checkout modal
  const [showMyItems, setShowMyItems] = useState(false); // Show my items modal
  const [showMyOrders, setShowMyOrders] = useState(false); // Show my orders modal
  const [showMyRentals, setShowMyRentals] = useState(false); // Show my rentals modal
  const [showAddItem, setShowAddItem] = useState(false); // Show add item modal
  const [myListedItems, setMyListedItems] = useState([]); // User's listings
  const [loadingMyItems, setLoadingMyItems] = useState(false);
  const [myItemsError, setMyItemsError] = useState("");
  const [products, setProducts] = useState(allProducts);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState("");
  const [authToken] = useState(() => localStorage.getItem("token") || "");
  const [productQuestions, setProductQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionVisibility, setQuestionVisibility] = useState("public");
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [answerSubmitting, setAnswerSubmitting] = useState({});
  const [answerErrors, setAnswerErrors] = useState({});

  useEffect(() => {
    setRentStart("");
    setRentEnd("");
    setRentError("");
    setRentLoading(false);
    setRentUnavailable([]);
    setProductQuestions([]);
    setQuestionsError("");
    setQuestionText("");
    setQuestionVisibility("public");
    setAnswerDrafts({});
    setAnswerErrors({});

    if (selectedProduct?.id) {
      loadProductQuestions(selectedProduct.id);
    }
  }, [selectedProduct]);

  // Edit item states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    price: '',
    tag: 'sale',
    price_unit: getDefaultUnit('', 'sale'),
    location: '',
    description: '',
    stock: 0,
    image_url: ''
  });
  const [saving, setSaving] = useState(false);

  // Add item states
  const getDefaultAddForm = () => ({
    name: '',
    category: 'plants',
    price: '',
    tag: 'sale',
    price_unit: getDefaultUnit('plants', 'sale'),
    location: '',
    description: '',
    stock: 0,
    image_url: ''
  });
  const [addForm, setAddForm] = useState(getDefaultAddForm());
  const [adding, setAdding] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationCoords, setLocationCoords] = useState(DEFAULT_MAP_CENTER);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationNameLoading, setLocationNameLoading] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [selectedLocationLoading, setSelectedLocationLoading] = useState(false);
  const [locationPickerTarget, setLocationPickerTarget] = useState("add"); // add | checkout
  const [locationLabels, setLocationLabels] = useState({});
  const mapRef = useRef(null);
  const locationLookupId = useRef(0);
  const selectedLocationLookupId = useRef(0);
  const deliveryLocationLookupId = useRef(0);
  const [userCoords, setUserCoords] = useState(null);
  const locationLabelCache = useRef({});

  const decodeBase64Url = (str = "") => {
    try {
      const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
      return atob(padded);
    } catch (err) {
      return "";
    }
  };

  const getIdFromToken = (token) => {
    if (!token) return null;
    try {
      const [, payloadPart] = token.split(".");
      if (!payloadPart) return null;
      const json = decodeBase64Url(payloadPart);
      const payload = JSON.parse(json);
      return (
        payload?.farmer_id ??
        payload?.user_id ??
        payload?.user?.id ??
        payload?.sub ??
        payload?.id ??
        payload?.profile?.id ??
        null
      );
    } catch (err) {
      return null;
    }
  };

  const resolveUserId = () => {
    const rawUser = localStorage.getItem("user");
    const fallbackId =
      localStorage.getItem("farmer_id") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("id");
    const tokenId = getIdFromToken(localStorage.getItem("token"));

    const isValid = (v) =>
      v !== null &&
      v !== undefined &&
      String(v).trim() !== "" &&
      String(v).toLowerCase() !== "null" &&
      String(v).toLowerCase() !== "undefined";

    const candidateFromParsed = (u) => {
      // handle primitives stored directly
      if (typeof u === "number" || typeof u === "string") {
        return isValid(u) ? u : null;
      }
      if (!u || typeof u !== "object") return null;
      const candidates = [
        u?.id,
        u?.user?.id,
        u?.user_id,
        u?.user?.user_id,
        u?.farmer_id,
        u?.user?.farmer_id,
        u?.profile?.id,
        u?.profile?.farmer_id,
        fallbackId,
      ].filter(isValid);
      return candidates.length > 0 ? candidates[0] : null;
    };

    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        const parsedId = candidateFromParsed(parsed);
        if (parsedId) return parsedId;
      } catch (err) {
        // fall through to fallbackId
      }
    }

    if (isValid(tokenId)) return tokenId;

    return isValid(fallbackId) ? fallbackId : null;
  };

  const [userId] = useState(() => resolveUserId());
  const getEffectiveUserId = () => userId || resolveUserId();

  const getStoredUser = () => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  };

  const isExpertUser = () => {
    const storedUser = getStoredUser();
    return Boolean(storedUser?.is_expert || storedUser?.expert_verified);
  };

  const formatQuestionTime = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
  };

  const loadProductQuestions = async (productId) => {
    if (!productId) return;
    setQuestionsLoading(true);
    setQuestionsError("");
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await fetch(`${STORE_BASE}/items/${productId}/questions`, {
        headers,
      });
      if (!res.ok) {
        throw new Error(`Failed to load questions (${res.status})`);
      }
      const data = await res.json();
      setProductQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load product questions:", err);
      setProductQuestions([]);
      setQuestionsError("Could not load questions right now.");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const submitQuestion = async () => {
    const productId = selectedProduct?.id;
    const trimmed = (questionText || "").trim();

    if (!productId) return;
    if (!trimmed) {
      setQuestionsError("Please enter a question.");
      return;
    }
    if (!authToken) {
      setQuestionsError("Please log in to ask a question.");
      return;
    }

    setQuestionSubmitting(true);
    setQuestionsError("");

    try {
      const res = await fetch(`${STORE_BASE}/items/${productId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          question_text: trimmed,
          visibility: questionVisibility,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Unable to submit question.");
      }

      const created = data?.question || data;
      const normalized = {
        ...created,
        answers: created?.answers || [],
      };
      setProductQuestions((prev) => [normalized, ...prev]);
      setQuestionText("");
      setQuestionVisibility("public");
    } catch (err) {
      console.error("Question submit failed:", err);
      setQuestionsError(err.message || "Unable to submit question.");
    } finally {
      setQuestionSubmitting(false);
    }
  };

  const submitAnswer = async (questionId) => {
    const draft = (answerDrafts[questionId] || "").trim();

    if (!questionId) return;
    if (!draft) {
      setAnswerErrors((prev) => ({
        ...prev,
        [questionId]: "Please enter an answer.",
      }));
      return;
    }
    if (!authToken) {
      setAnswerErrors((prev) => ({
        ...prev,
        [questionId]: "Please log in to answer.",
      }));
      return;
    }

    setAnswerSubmitting((prev) => ({ ...prev, [questionId]: true }));
    setAnswerErrors((prev) => ({ ...prev, [questionId]: "" }));

    try {
      const res = await fetch(`${STORE_BASE}/questions/${questionId}/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ answer_text: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Unable to submit answer.");
      }

      const answer = data?.answer || data;
      const updatedStatus = data?.status;
      setProductQuestions((prev) =>
        prev.map((question) =>
          question.id === questionId
            ? {
                ...question,
                status: updatedStatus || question.status,
                answers: [...(question.answers || []), answer],
              }
            : question
        )
      );
      setAnswerDrafts((prev) => ({ ...prev, [questionId]: "" }));
    } catch (err) {
      console.error("Answer submit failed:", err);
      setAnswerErrors((prev) => ({
        ...prev,
        [questionId]: err.message || "Unable to submit answer.",
      }));
    } finally {
      setAnswerSubmitting((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const datesOverlap = (startA, endA, startB, endB) => {
    if (!startA || !endA || !startB || !endB) return false;
    return startA <= endB && startB <= endA;
  };

  const getOwnerId = (item) => {
    if (!item) return null;
    return (
      item.ownerId ??
      item.farmerId ??
      item.farmer_id ??
      item.owner_id ??
      item.user_id ??
      null
    );
  };

  const loadItemRentals = async (itemId) => {
    if (!itemId) {
      setRentUnavailable([]);
      return;
    }
    setRentDatesLoading(true);
    try {
      const res = await fetch(`${STORE_BASE}/rentals/item/${itemId}`);
      if (!res.ok) throw new Error(`rentals fetch failed ${res.status}`);
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map((r) => ({
        start: r.start_date,
        end: r.end_date,
      }));
      setRentUnavailable(normalized);
    } catch (err) {
      console.error("loadItemRentals failed:", err);
      setRentUnavailable([]);
    } finally {
      setRentDatesLoading(false);
    }
  };

  const filterItemsByOwner = (items = [], owner = userId) => {
    if (!owner) return [];
    return items.filter((item) => {
      const itemOwner = getOwnerId(item);
      return itemOwner !== null && String(itemOwner) === String(owner);
    });
  };
  
  // Form states for checkout
  const [deliveryInfo, setDeliveryInfo] = useState({
    fullName: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
    location: ''
  });
  const [deliveryLocationCoords, setDeliveryLocationCoords] = useState(DEFAULT_MAP_CENTER);
  const [deliveryLocationName, setDeliveryLocationName] = useState("");
  const [deliveryLocationNameLoading, setDeliveryLocationNameLoading] = useState(false);
  
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false
  });
  
  const [paymentMethod, setPaymentMethod] = useState('credit'); // credit | cash
  const [orderProcessing, setOrderProcessing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchItems = async () => {
      setLoadingItems(true);
      setItemsError("");
      try {
        const params = new URLSearchParams();
        if (activeCategory !== "all") params.append("category", activeCategory);
        if (saleRentFilter !== "all") params.append("tag", saleRentFilter);
        if (searchTerm.trim()) params.append("search", searchTerm.trim());
        const query = params.toString() ? `?${params.toString()}` : "";

        const res = await fetch(`${STORE_BASE}/items${query}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Request failed with ${res.status}`);
        }

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map(mapBackendItem));
        } else {
          setProducts(allProducts);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to load store items:", err);
        setItemsError("Could not load items from the server. Showing demo data.");
        setProducts(allProducts);
      } finally {
        setLoadingItems(false);
      }
    };

    const debounce = setTimeout(fetchItems, 300);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [activeCategory, saleRentFilter, searchTerm]);

  useEffect(() => {
    if (!showMyItems) return;

    const controller = new AbortController();

    const fetchUserItems = async () => {
      setLoadingMyItems(true);
      setMyItemsError("");
      
      // Ensure we have a user id; if not, stop and show an error
      const effectiveUserId = resolveUserId() || userId;
      if (!effectiveUserId) {
        setMyItemsError("Could not load your items (missing user account). Please sign in again.");
        setMyListedItems([]);
        setLoadingMyItems(false);
        return;
      }

      try {
        const res = await fetch(`${STORE_BASE}/items/user/${effectiveUserId}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Request failed with ${res.status}`);
        }

        const data = await res.json();
        const mapped = Array.isArray(data) ? data.map(mapBackendItem) : [];
        setMyListedItems(filterItemsByOwner(mapped, effectiveUserId));
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to load user's listed items:", err);
        setMyItemsError("Could not load your listed items.");
        setMyListedItems([]);
      } finally {
        setLoadingMyItems(false);
      }
    };

    fetchUserItems();

    return () => controller.abort();
  }, [showMyItems, userId]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    products.forEach((p) => {
      const coords = getProductCoords(p);
      if (!coords) return;

      const hasTextLabel =
        hasReadableLocationText(p.location) && !isPlaceholderLocation(p.location);
      if (hasTextLabel) return;

      const key = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
      if (locationLabelCache.current[key]) return;
      locationLabelCache.current[key] = "loading";
      requestLocationLabel(key, coords);
    });

    return () => controller.abort();
  }, [products]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setCartLoading(true);
    setCartError("");

    fetch(`${STORE_BASE}/cart/${userId}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) return [];
        if (!res.ok) {
          throw new Error(`Failed to load cart (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        const mapped = Array.isArray(data) ? data.map(mapCartRow) : [];
        setCartItems(mapped);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Cart load failed:", err);
        setCartError("Could not load your cart. Using local cart only.");
      })
      .finally(() => setCartLoading(false));

    return () => controller.abort();
  }, [userId]);

  // FILTERED PRODUCTS
  const filteredProducts = products
    .filter((p) =>
      activeCategory === "all" ? true : p.category === activeCategory
    )
    .filter((p) => {
      if (saleRentFilter === "all") return true;
      if (saleRentFilter === "sale") return p.tag === "sale";
      if (saleRentFilter === "rent") return p.tag === "rent";
      return true;
    })
    .filter((p) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    });

  // Function to open product details modal
  const openDetails = (product, isOwnItem = false) => {
    const owner = getOwnerId(product);
    const effectiveUser = getEffectiveUserId();
    const isMine = isOwnItem || (owner && effectiveUser && String(owner) === String(effectiveUser));
    setSelectedProduct({ ...product, isOwnItem: isMine });
    if (isOwnItem) {
      setShowMyItems(false);
    }
    if (product?.tag === "rent") {
      loadItemRentals(product.id);
    }
  };

  // Function to close product details modal
  const closeDetails = () => {
    setSelectedProduct(null);
    setIsEditing(false);
    setEditForm({
      name: '',
      category: '',
      price: '',
      tag: 'sale',
      location: '',
      description: '',
      stock: 0,
      image_url: ''
    });
  };

  // Function to start editing
  const startEditing = (product) => {
    setIsEditing(true);
    setEditForm({
      name: product.name,
      category: product.category,
      price: product.priceValue.toString(),
      tag: product.tag,
      price_unit: product.priceUnit || getDefaultUnit(product.category, product.tag),
      location: product.location,
      description: product.description,
      stock: product.stock,
      image_url: product.img
    });
  };

  // Function to handle edit form changes
  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    setEditForm(prev => {
      const next = {
        ...prev,
        [name]: type === 'number' ? Number(value) : value
      };

      if (name === 'tag') {
        next.price_unit = getDefaultUnit(next.category, value);
        if (value === 'rent' && !isRentAllowed(next.category)) {
          next.tag = 'sale';
        }
      }

      if (name === 'category') {
        if (!isRentAllowed(value) && next.tag === 'rent') {
          next.tag = 'sale';
        }
        if (next.tag !== 'rent') {
          next.price_unit = getDefaultUnit(value, next.tag);
        }
      }

      return next;
    });
  };

  const reportItem = async (item) => {
    if (!item) return;
    if (item.isOwnItem) {
      alert("You cannot report your own item.");
      return;
    }

    if (!authToken) {
      alert("Please log in to report this item.");
      return;
    }

    const reason = window.prompt("Why are you reporting this item?");
    if (!reason) return;
    const description = window.prompt("Additional details (optional):");

    setReportSending(true);
    try {
      const res = await fetch(`${API_BASE}/community/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          targetType: "item",
          targetId: item.id,
          reason,
          description: description || "",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Report failed");
      }

      alert("Thanks for the report. Our team will review it.");
    } catch (err) {
      console.error("Report item failed:", err);
      alert(`Could not submit report: ${err.message}`);
    } finally {
      setReportSending(false);
    }
  };

  const handleAddChange = (e) => {
    const { name, value, type } = e.target;
    setAddForm((prev) => {
      const next = {
        ...prev,
        [name]: type === 'number' ? Number(value) : value
      };

      if (name === 'tag') {
        next.price_unit = getDefaultUnit(next.category, value);
        if (value === 'rent' && !isRentAllowed(next.category)) {
          next.tag = 'sale';
        }
      }

      if (name === 'category') {
        if (!isRentAllowed(value) && next.tag === 'rent') {
          next.tag = 'sale';
        }
        if (next.tag !== 'rent') {
          next.price_unit = getDefaultUnit(value, next.tag);
        }
      }

      return next;
    });
  };

  const handleAddFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === "string") {
        setAddForm((prev) => ({
          ...prev,
          image_url: dataUrl,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const resetAddForm = () => {
    setAddForm(getDefaultAddForm());
    setLocationName("");
    setLocationCoords(DEFAULT_MAP_CENTER);
  };

  const formatLatLng = (lat, lng) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  const parseLatLngFromString = (value = "") => {
    if (!value) return null;
    // Accept "lat,lng", "lat lng", or any text containing two numbers
    const matches = String(value).match(/-?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) return null;
    const lat = parseFloat(matches[0]);
    const lng = parseFloat(matches[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  const toNumberOrNull = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const resolveCoordsFromItem = (item = {}, locationValue = "") => {
    const latCandidates = [
      item?.coords?.lat,
      item?.latitude,
      item?.lat,
      item?.location_lat,
      item?.location?.lat,
      item?.latLng?.lat,
    ];
    const lngCandidates = [
      item?.coords?.lng,
      item?.longitude,
      item?.lng,
      item?.location_lng,
      item?.location?.lng,
      item?.latLng?.lng,
    ];
    const lat = latCandidates.map(toNumberOrNull).find((v) => v !== null);
    const lng = lngCandidates.map(toNumberOrNull).find((v) => v !== null);

    if (lat !== null && lng !== null) {
      return { lat, lng };
    }

    if (typeof locationValue === "string") {
      return parseLatLngFromString(locationValue);
    }

    return null;
  };

  const getProductCoords = (product) => {
    if (!product) return null;
    const coords = resolveCoordsFromItem(product, product.location);
    const lat = toNumberOrNull(coords?.lat);
    const lng = toNumberOrNull(coords?.lng);
    return lat !== null && lng !== null ? { lat, lng } : null;
  };

  const hasReadableLocationText = (value) => {
    if (!value || typeof value !== "string") return false;
    return /[\\p{L}]/u.test(value) || /[a-zA-Z\u00C0-\u024F\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(value);
  };

  const isPlaceholderLocation = (value) => {
    if (!value || typeof value !== "string") return false;
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "location available" ||
      normalized === "location unavailable" ||
      normalized === "delivery available" ||
      normalized === "delivery" ||
      normalized === "available"
    );
  };

  const requestLocationLabel = (key, coords) => {
    if (!key || !coords) return;
    if (locationLabelCache.current[key]) return;
    locationLabelCache.current[key] = "loading";

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=12&addressdetails=1`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Reverse geocode failed with ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const label = data?.display_name || "Location unavailable";
        locationLabelCache.current[key] = label;
        setLocationLabels((prev) => ({ ...prev, [key]: label }));
      })
      .catch(() => {
        locationLabelCache.current[key] = "Location unavailable";
        setLocationLabels((prev) => ({ ...prev, [key]: "Location unavailable" }));
      });
  };

  const getDisplayLocation = (product) => {
    if (!product) return "";
    const locationString = product.location || "";
    const preset =
      product.location_name ||
      product.locationName ||
      product.city ||
      product.address;

    if (preset) return preset;
    if (hasReadableLocationText(locationString) && !isPlaceholderLocation(locationString)) {
      return locationString;
    }

    const coords = getProductCoords(product);
    const key = coords ? `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}` : null;
    const parsedFromString = !coords ? parseLatLngFromString(locationString) : null;
    const stringKey = parsedFromString
      ? `${parsedFromString.lat.toFixed(4)},${parsedFromString.lng.toFixed(4)}`
      : null;

    if (key) {
      const cached = locationLabels[key];
      if (cached && cached !== "loading") return cached;
      if (!cached) requestLocationLabel(key, coords);
      return "Resolving location...";
    }

    if (stringKey) {
      const cached = locationLabels[stringKey];
      if (cached && cached !== "loading") return cached;
      if (!cached) requestLocationLabel(stringKey, parsedFromString);
      return "Resolving location...";
    }

    return locationString && !isPlaceholderLocation(locationString)
      ? locationString
      : "Location unavailable";
  };

  const toRadians = (value) => (value * Math.PI) / 180;

  const calculateDistanceKm = (from, to) => {
    if (!from || !to) return Number.POSITIVE_INFINITY;

    const dLat = toRadians(to.lat - from.lat);
    const dLng = toRadians(to.lng - from.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(from.lat)) *
        Math.cos(toRadians(to.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadiusKm = 6371;
    return earthRadiusKm * c;
  };

  const effectiveUserCoords =
    parseLatLngFromString(deliveryInfo.location || "") || userCoords;

  const sortedProducts = filteredProducts
    .map((p) => ({
      ...p,
      distanceKm: calculateDistanceKm(effectiveUserCoords, getProductCoords(p)),
    }))
    .sort((a, b) => {
      const aFinite = Number.isFinite(a.distanceKm);
      const bFinite = Number.isFinite(b.distanceKm);

      if (aFinite && bFinite) {
        if (a.distanceKm === b.distanceKm) return 0;
        return a.distanceKm - b.distanceKm;
      }

      if (aFinite && !bFinite) return -1;
      if (!aFinite && bFinite) return 1;
      return 0;
    });

  const fetchLocationName = async (
    lat,
    lng,
    {
      setName,
      setLoading,
      lookupRef,
      fallbackLabel = "Place name unavailable",
    }
  ) => {
    const requestId = ++lookupRef.current;
    setLoading(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
      );

      if (!res.ok) {
        throw new Error(`Reverse geocode failed with ${res.status}`);
      }

      const data = await res.json();
      if (lookupRef.current !== requestId) return;
      const label = data?.display_name || "";
      setName(label);
    } catch (err) {
      if (lookupRef.current !== requestId) return;
      setName(fallbackLabel);
    } finally {
      if (lookupRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const updateLocationFromCoords = (lat, lng, options = {}) => {
    const next = { lat, lng };
    if (locationPickerTarget === "checkout") {
      setDeliveryLocationCoords(next);
      setDeliveryInfo((prev) => ({
        ...prev,
        address: prev.address || formatLatLng(lat, lng),
        location: formatLatLng(lat, lng),
      }));
      setDeliveryLocationName("");
      fetchLocationName(lat, lng, {
        setName: setDeliveryLocationName,
        setLoading: setDeliveryLocationNameLoading,
        lookupRef: deliveryLocationLookupId,
        fallbackLabel: "Place name unavailable",
      });
    } else {
      setLocationCoords(next);
      setAddForm((prev) => ({
        ...prev,
        location: formatLatLng(lat, lng),
      }));
      setLocationName("");
      fetchLocationName(lat, lng, {
        setName: setLocationName,
        setLoading: setLocationNameLoading,
        lookupRef: locationLookupId,
        fallbackLabel: "Place name unavailable",
      });
    }
    if (options.centerMap && mapRef.current) {
      mapRef.current.setView(next);
    }
  };

  const openLocationPicker = (target = "add") => {
    setLocationPickerTarget(target);
    const parsedFromInput = parseLatLngFromString(addForm.location);
    const parsedFromDelivery = parseLatLngFromString(deliveryInfo.location || "");

    if (target === "checkout" && parsedFromDelivery) {
      updateLocationFromCoords(parsedFromDelivery.lat, parsedFromDelivery.lng, {
        centerMap: true,
      });
    } else if (target === "checkout") {
      setDeliveryLocationCoords(DEFAULT_MAP_CENTER);
      updateLocationFromCoords(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng, {
        centerMap: true,
      });
    } else if (parsedFromInput) {
      updateLocationFromCoords(parsedFromInput.lat, parsedFromInput.lng, {
        centerMap: true,
      });
    } else {
      updateLocationFromCoords(locationCoords.lat, locationCoords.lng);
    }

    setShowLocationPicker(true);

    if (!navigator.geolocation) return;

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocationFromCoords(pos.coords.latitude, pos.coords.longitude, {
          centerMap: true,
        });
        setLocatingUser(false);
      },
      () => setLocatingUser(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMapLocationChange = (latlng) => {
    updateLocationFromCoords(latlng.lat, latlng.lng);
  };

  const handleMarkerDrag = (event) => {
    const latlng = event.target.getLatLng();
    updateLocationFromCoords(latlng.lat, latlng.lng);
  };

  const LocationMapEvents = ({ onSelect }) => {
    useMapEvents({
      click(e) {
        onSelect(e.latlng);
      },
    });
    return null;
  };

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedLocationName("");
      setSelectedLocationLoading(false);
      return;
    }

    const locationValue = selectedProduct.location || "";
    const coords = parseLatLngFromString(locationValue);

    if (!coords) {
      setSelectedLocationName(locationValue);
      setSelectedLocationLoading(false);
      return;
    }

    const requestId = ++selectedLocationLookupId.current;
    setSelectedLocationLoading(true);
    const controller = new AbortController();

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=14&addressdetails=1`,
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Reverse geocode failed with ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (selectedLocationLookupId.current !== requestId) return;
        const label = data?.display_name || formatLatLng(coords.lat, coords.lng);
        const key = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
        if (key) {
          locationLabelCache.current[key] = label;
          setLocationLabels((prev) => ({ ...prev, [key]: label }));
        }
        setSelectedLocationName(label);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (selectedLocationLookupId.current !== requestId) return;
        setSelectedLocationName(locationValue || "Location unavailable");
      })
      .finally(() => {
        if (selectedLocationLookupId.current === requestId) {
          setSelectedLocationLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedProduct]);

  // Function to save edited item
  const saveEdit = async () => {
    if (!selectedProduct) return;
    if (editForm.tag === 'rent' && !isRentAllowed(editForm.category)) {
      alert('Only equipment items can be listed for rent.');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        name: editForm.name,
        category: editForm.category,
        price: parseFloat(editForm.price),
        tag: editForm.tag,
        price_unit: editForm.tag === 'rent' ? 'day' : editForm.price_unit,
        location: editForm.location,
        description: editForm.description,
        stock: editForm.stock,
        image_url: editForm.image_url
      };

      const res = await fetch(`${STORE_BASE}/items/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Failed to update item: ${res.status}`);
      }

      const updatedItem = await res.json();
      const mappedItem = mapBackendItem({
        ...updatedItem,
        price_unit: payload.price_unit
      });
      
      // Update the selected product
      setSelectedProduct(mappedItem);
      
      // Update in myListedItems if it exists there
      setMyListedItems(prev => 
        prev.map(item => item.id === selectedProduct.id ? mappedItem : item)
      );
      
      setIsEditing(false);
      setSelectedProduct(null);
      setShowMyItems(true);
      alert('Item updated successfully!');
    } catch (err) {
      console.error('Failed to save edit:', err);
      alert('Failed to update item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveNewItem = async () => {
    const ownerId = resolveUserId() || userId;
    if (!ownerId) {
      alert('Could not determine your account. Please sign in again.');
      return;
    }

    if (!addForm.name || !addForm.category || !addForm.price || !addForm.location) {
      alert('Please fill in all required fields.');
      return;
    }
    if (addForm.tag === 'rent' && !isRentAllowed(addForm.category)) {
      alert('Only equipment items can be listed for rent.');
      return;
    }

    setAdding(true);
    try {
      const payload = {
        name: addForm.name,
        category: addForm.category,
        price: addForm.tag === 'sale' ? parseFloat(addForm.price) : null,
        rent_price_per_day: addForm.tag === 'rent' ? parseFloat(addForm.price) : null,
        tag: addForm.tag,
        price_unit: addForm.tag === 'rent' ? 'day' : addForm.price_unit,
        location: addForm.location,
        description: addForm.description,
        stock: Number(addForm.stock) || 0,
        image_url: addForm.image_url,
        farmer_id: ownerId,
        is_rentable: addForm.tag === 'rent',
      };

      const res = await fetch(`${STORE_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Failed to create item: ${res.status}`);
      }

      const created = await res.json();
      const mapped = mapBackendItem({
        ...created,
        price_unit: payload.price_unit
      });

      setProducts((prev) => [mapped, ...prev]);
      setMyListedItems((prev) => [mapped, ...prev]);
      setShowAddItem(false);
      resetAddForm();
      alert('Item added successfully!');
    } catch (err) {
      console.error('Failed to add item:', err);
      alert('Could not add item. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  // Function to cancel editing
  const cancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    if (selectedProduct) {
      setEditForm({
        name: selectedProduct.name,
        category: selectedProduct.category,
        price: selectedProduct.priceValue.toString(),
        tag: selectedProduct.tag,
        price_unit: selectedProduct.priceUnit || getDefaultUnit(selectedProduct.category, selectedProduct.tag),
        location: selectedProduct.location,
        description: selectedProduct.description,
        stock: selectedProduct.stock,
        image_url: selectedProduct.img
      });
    }
  };

  const cancelAdd = () => {
    resetAddForm();
    setShowAddItem(false);
  };

  const handleRent = async () => {
    if (!selectedProduct || selectedProduct.tag !== "rent") return;

    if (!rentStart || !rentEnd) {
      setRentError("Please select rental dates");
      return;
    }

    const effectiveUser = getEffectiveUserId();
    const owner = getOwnerId(selectedProduct);
    if (owner && effectiveUser && String(owner) === String(effectiveUser)) {
      setRentError("You cannot rent your own item.");
      alert("You cannot rent your own item.");
      return;
    }

    const startDate = parseDate(rentStart);
    const endDate = parseDate(rentEnd);
    const hasConflict = rentUnavailable.some((r) =>
      datesOverlap(startDate, endDate, parseDate(r.start), parseDate(r.end))
    );
    if (hasConflict) {
      setRentError("Selected dates are already booked.");
      return;
    }
    if (endDate && startDate && endDate < startDate) {
      setRentError("End date cannot be before start date.");
      return;
    }

    const renterId = effectiveUser;
    if (!renterId) {
      setRentError("Please sign in to rent items.");
      return;
    }

    setRentLoading(true);
    setRentError("");

    // Do not create the rental on the server until the user fully checks out.
    // Instead, add the rental to the cart with the selected dates.
    addToCart(selectedProduct, {
      startDate: rentStart,
      endDate: rentEnd,
      skipServer: true,
    });
    setShowCart(true);
    setSelectedProduct(null);
    setRentLoading(false);
  };

  // Function to delete item
  const deleteItem = async () => {
    if (!selectedProduct) return;
    
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`${STORE_BASE}/items/${selectedProduct.id}`, {
        method: 'DELETE',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to delete item: ${res.status}`);
      }

      // Remove from myListedItems
      setMyListedItems(prev => prev.filter(item => item.id !== selectedProduct.id));
      
      closeDetails();
      alert('Item deleted successfully!');
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item. Please try again.');
    }
  };

  // Function to add item to cart
  const addToCart = (product, options = {}) => {
    const isRent = product?.tag === "rent";
    const rentalStartDate =
      options.startDate ||
      options.rentStart ||
      product.rentalStartDate ||
      product.start_date ||
      null;
    const rentalEndDate =
      options.endDate ||
      options.rentEnd ||
      product.rentalEndDate ||
      product.end_date ||
      null;

    if (isRent && (!rentalStartDate || !rentalEndDate)) {
      alert("Please select a rental start and end date before adding to cart.");
      return;
    }

    const owner = getOwnerId(product);
    const effectiveUser = getEffectiveUserId();
    if (owner && effectiveUser && String(owner) === String(effectiveUser)) {
      alert("You cannot order your own item.");
      return;
    }

    const existingItem = cartItems.find(item => item.id === product.id);

    const fallbackUpdate = () => {
      if (existingItem) {
        setCartItems(cartItems.map(item =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                ...(isRent
                  ? {
                      rentalStartDate: rentalStartDate || item.rentalStartDate,
                      rentalEndDate: rentalEndDate || item.rentalEndDate,
                    }
                  : {}),
              }
            : item
        ));
      } else {
        setCartItems([...cartItems, {
          ...product,
          priceValue: getItemPriceValue(product),
          quantity: 1,
          ...(isRent
            ? { rentalStartDate, rentalEndDate }
            : {}),
        }]);
      }
    };

    if (!userId) {
      fallbackUpdate();
      return;
    }

    const existingRowId = existingItem?.cartRowId;
    const headers = {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };

    const doUpdate = async () => {
      try {
        if (existingRowId) {
          const newQty = (existingItem.quantity || 1) + 1;
          if (!options.skipServer) {
            const res = await fetch(`${STORE_BASE}/cart/${existingRowId}`, {
              method: "PUT",
              headers,
              body: JSON.stringify({ quantity: newQty }),
            });
            if (!res.ok) throw new Error(`Cart update failed (${res.status})`);
          }
          setCartItems((prev) =>
            prev.map((item) =>
              item.id === product.id
                ? {
                    ...item,
                    quantity: newQty,
                    ...(isRent
                      ? {
                          rentalStartDate:
                            rentalStartDate || item.rentalStartDate,
                          rentalEndDate: rentalEndDate || item.rentalEndDate,
                        }
                      : {}),
                  }
                : item
            )
          );
        } else {
          let data = null;
          if (!options.skipServer) {
            const res = await fetch(`${STORE_BASE}/cart`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                user_id: userId,
                item_id: product.id,
                quantity: 1,
              }),
            });
            if (!res.ok) throw new Error(`Cart add failed (${res.status})`);
            data = await res.json();
          }
          setCartItems((prev) => [
            ...prev,
            {
              ...product,
              quantity: 1,
              cartRowId: data?.id || existingRowId,
              priceValue: getItemPriceValue(product),
              ...(isRent
                ? { rentalStartDate, rentalEndDate }
                : {}),
            },
          ]);
        }
      } catch (err) {
        console.error("Cart sync failed, using local cart:", err);
        fallbackUpdate();
      }
    };

    doUpdate();
  };

  // Function to update item quantity in cart
  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      // If quantity is 0 or less, remove item from cart
      removeFromCart(id);
    } else {
      // Otherwise, update quantity
      const target = cartItems.find((i) => i.id === id);
      const applyLocal = () => {
        setCartItems(cartItems.map(item =>
          item.id === id
            ? { ...item, quantity: newQuantity }
            : item
        ));
      };

      if (!target || !userId || !target.cartRowId) {
        applyLocal();
        return;
      }

      fetch(`${STORE_BASE}/cart/${target.cartRowId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ quantity: newQuantity }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Cart update failed (${res.status})`);
          applyLocal();
        })
        .catch((err) => {
          console.error("Cart quantity update failed:", err);
          applyLocal();
        });
    }
  };

  // Function to remove item from cart
  const removeFromCart = (id) => {
    const target = cartItems.find((i) => i.id === id);
    setCartItems(cartItems.filter(item => item.id !== id));

    if (!target || !userId || !target.cartRowId) return;

    fetch(`${STORE_BASE}/cart/${target.cartRowId}`, {
      method: "DELETE",
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    }).catch((err) => {
      console.error("Cart remove failed:", err);
    });
  };

  // Function to calculate total price
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (getItemPriceValue(item) * (item.quantity || 1));
    }, 0).toFixed(2);
  };

  const cartStockWarnings = cartItems
    .filter((item) => {
      const isRent = (item.tag || "sale") === "rent";
      if (isRent) return false;
      const requested = Number(item.quantity) || 1;
      const available = Number(item.stock);
      if (!Number.isFinite(available)) return false;
      return requested > available;
    })
    .map((item) => ({
      id: item.id,
      message: `${item.name || "Item"}: requested ${item.quantity || 1}, available ${item.stock ?? 0}`,
    }));

  const hasCartStockIssue = cartStockWarnings.length > 0;

  // Function to proceed to checkout
  const proceedToCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  // Function to handle form input changes
  const handleDeliveryChange = (e) => {
    const { name, value } = e.target;
    setDeliveryInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaymentInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Function to validate and submit order
  const submitOrder = async () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty");
      return;
    }

    // Basic validation
    if (!deliveryInfo.fullName || !deliveryInfo.phone || !deliveryInfo.city || !deliveryInfo.address) {
      alert('Please fill in all required delivery information');
      return;
    }
    
    if (paymentMethod === 'credit' && (!paymentInfo.cardNumber || !paymentInfo.cardName || !paymentInfo.expiryDate || !paymentInfo.cvv)) {
      alert('Please fill in all credit card information');
      return;
    }

    const ownItems = cartItems.filter((item) => {
      const owner = getOwnerId(item);
      return owner && userId && String(owner) === String(userId);
    });

    if (ownItems.length > 0) {
      alert("You cannot order your own items. Please remove them from the cart.");
      return;
    }

    const insufficient = cartItems.filter((item) => {
      const isRent = (item.tag || "sale") === "rent";
      if (isRent) return false;
      const requested = Number(item.quantity) || 1;
      const available = Number(item.stock);
      if (!Number.isFinite(available)) return false;
      return requested > available;
    });

    if (insufficient.length > 0) {
      const message = insufficient
        .map((item) => `${item.name || "Item"}: requested ${item.quantity || 1}, available ${item.stock ?? 0}`)
        .join("\n");
      alert(`Some items do not have enough stock:\n${message}`);
      return;
    }
    
    setOrderProcessing(true);
    
    const subtotal = parseFloat(calculateTotal());
    const deliveryFee = 15;
    const tax = subtotal * 0.1;
    const total = subtotal + deliveryFee + tax;

    const payload = {
      user_id: userId,
      items: cartItems.map((item) => ({
        item_id: item.id,
        quantity: item.quantity || 1,
        price: getItemPriceValue(item),
        tag: item.tag || "sale",
      })),
      delivery: deliveryInfo,
      payment_method: paymentMethod,
      totals: {
        subtotal,
        delivery_fee: deliveryFee,
        tax,
        total,
      },
    };

    try {
      const res = await fetch(`${STORE_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || `Order failed with ${res.status}`);
      }

      const orderData = await res.json();
      alert(`Order confirmed! Order #${orderData.id || 'N/A'} Total: ${total.toFixed(2)}₪`);

      const purchased = cartItems.map((item) => ({
        id: item.id,
        quantity: item.quantity || 1,
        tag: item.tag,
      }));

      const applyStockUpdate = (list = []) =>
        list.map((item) => {
          const matched = purchased.find((c) => c.id === item.id);
          if (!matched) return item;
          const isRent = (matched.tag || item.tag) === "rent";
          if (isRent) return item;
          const currentStock = Number(item.stock) || 0;
          const newStock = Math.max(0, currentStock - (Number(matched.quantity) || 1));
          return { ...item, stock: newStock };
        });

      setProducts((prev) => applyStockUpdate(prev));
      setMyListedItems((prev) => applyStockUpdate(prev));
      setSelectedProduct((prev) => {
        if (!prev) return prev;
        const matched = purchased.find((c) => c.id === prev.id);
        if (!matched || (matched.tag || prev.tag) === "rent") return prev;
        const currentStock = Number(prev.stock) || 0;
        const newStock = Math.max(0, currentStock - (Number(matched.quantity) || 1));
        return { ...prev, stock: newStock };
      });
      
      // Reset states
      setCartItems([]);
      setShowCheckout(false);
      setDeliveryInfo({
        fullName: '',
        phone: '',
        city: '',
        address: '',
        notes: '',
        location: ''
      });
      setPaymentInfo({
        cardNumber: '',
        cardName: '',
        expiryDate: '',
        cvv: '',
        saveCard: false
      });
      setDeliveryLocationCoords(DEFAULT_MAP_CENTER);
      setDeliveryLocationName("");
      setDeliveryLocationNameLoading(false);
    } catch (err) {
      console.error("Order submit failed:", err);
      alert(`Could not place order: ${err.message}`);
    } finally {
      setOrderProcessing(false);
    }
  };

  const canAskQuestion = Boolean(selectedProduct && !selectedProduct.isOwnItem);
  const canAnswerQuestion = Boolean(
    selectedProduct && (selectedProduct.isOwnItem || isExpertUser())
  );

  // [The rest of the component remains the same - styles, JSX, etc.]
  // ...
  
  return (
    <>
      <Header />

      {/* ----------------------------------------------------------
          STYLES
      ------------------------------------------------------------- */}
      <style>{`
/* COLORS */
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

body {
  background: var(--cream);
  font-family: Inter, sans-serif;
  overflow-x: hidden;
}

/* ------------------------------------------------------
   FEATURE PANEL (ENHANCED VERSION)
------------------------------------------------------- */
.feature-panel {
  margin: 65px auto 50px;
  width: 92%;
  padding: 60px 40px;
  border-radius: 38px;
  
  background: linear-gradient(135deg, rgba(46, 139, 87, 0.15), rgba(111, 207, 151, 0.1));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 40px;
  position: relative;
  overflow: hidden;
  
  box-shadow: 
    0px 25px 60px rgba(46, 139, 87, 0.15),
    0px 10px 25px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  
  animation: panelEnter 1.2s ease forwards;
  transform: translateY(25px);
  opacity: 0;
  
  perspective: 1200px;
}

@keyframes panelEnter {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
}

/* LEAF PATTERN BACKGROUND */
.feature-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("https://raw.githubusercontent.com/loai-raw-assets/bloom-patterns/main/leaves-soft.png");
  background-size: 480px;
  background-repeat: repeat;
  opacity: 0.1;
  z-index: 1;
  pointer-events: none;
  animation: backgroundMove 30s linear infinite;
}

@keyframes backgroundMove {
  0% { background-position: 0 0; }
  100% { background-position: 480px 480px; }
}

/* Gradient overlay */
.feature-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(46, 139, 87, 0.15),
    rgba(111, 207, 151, 0.08),
    rgba(250, 249, 246, 0.05)
  );
  z-index: 2;
  pointer-events: none;
}

/* FEATURE ITEMS */
.feature-item {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 20px 10px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
  animation: itemFadeIn 0.8s ease forwards;
  opacity: 0;
}

.feature-item:nth-child(1) { animation-delay: 0.1s; }
.feature-item:nth-child(2) { animation-delay: 0.2s; }
.feature-item:nth-child(3) { animation-delay: 0.3s; }
.feature-item:nth-child(4) { animation-delay: 0.4s; }

@keyframes itemFadeIn {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.feature-item:hover {
  transform: rotateY(5deg) rotateX(-5deg) scale(1.05);
}

/* ICON */
.feature-icon {
  width: 85px;
  height: 85px;
  border-radius: 22px;
  background: linear-gradient(145deg, #2E8B57, #1B4332, #3A7A5C);
  box-shadow: 
    0px 12px 30px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin: 0 auto 18px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.feature-icon::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 70%
  );
  transform: rotate(45deg) translateX(-100%);
  transition: transform 0.6s;
}

.feature-item:hover .feature-icon::before {
  transform: rotate(45deg) translateX(100%);
}

.feature-item:hover .feature-icon {
  transform: translateZ(20px) scale(1.15);
  box-shadow: 
    0px 15px 35px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* FLOATING ICON ANIM */
.floating {
  animation: floatIcon 4s ease-in-out infinite;
}

@keyframes floatIcon {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}

/* TEXT */
.feature-item h3 {
  font-size: 21px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--olive);
  text-shadow: 0px 1px 2px rgba(0,0,0,0.1);
  transition: color 0.3s ease;
}

.feature-item:hover h3 {
  color: var(--forest);
}

.feature-item p {
  font-size: 14px;
  opacity: 0.9;
  color: var(--sub);
  line-height: 1.6;
  transition: all 0.3s ease;
}

.feature-item:hover p {
  opacity: 1;
  transform: translateY(-2px);
}

/* DECOR SHAPES */
.feature-panel .decorative-shape {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(111, 207, 151, 0.2), transparent 70%);
  z-index: 1;
  pointer-events: none;
}

.shape-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  right: -100px;
  animation: floatShape 20s infinite alternate ease-in-out;
}

.shape-2 {
  width: 200px;
  height: 200px;
  bottom: -100px;
  left: -50px;
  animation: floatShape 15s infinite alternate-reverse ease-in-out;
}

@keyframes floatShape {
  0% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(20px, 20px) rotate(10deg); }
}

/* -----------------------------------------
   CATEGORY SECTION (CIRCLES)
------------------------------------------ */
.category-section {
  padding: 20px 40px;
}

.category-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--olive);
  margin-bottom: 35px;
}

.category-grid {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 45px;
}

.category-card {
  cursor: pointer;
  transition: 0.3s ease;
  text-align: center;
  width: 160px;
}

.category-card:hover {
  transform: translateY(-8px);
}

.circle {
  width: 150px;
  height: 150px;
  background: #6FA87A;
  border-radius: 50%;
  position: relative;
  box-shadow: 0 15px 30px rgba(0,0,0,0.25);
}

.circle-main {
  width: 155px;
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  object-fit: contain;
  filter: drop-shadow(0px 14px 18px rgba(0,0,0,0.35));
  transition: 0.3s ease;
}

.category-card:hover .circle-main {
  transform: translateX(-50%) translateY(-10px);
}

.crops-img {
  width: 130px;
  bottom: -38px;
}

.category-card:hover .crops-img {
  transform: translateX(-50%) translateY(-10px);
}

.circle-text {
  margin-top: 20px;
  font-size: 17px;
  font-weight: 700;
  color: var(--olive);
}

/* -----------------------------------------
   STORE TOOLBAR (SEARCH + FILTERS + BUTTONS)
------------------------------------------ */
.store-toolbar {
  padding: 10px 40px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Search box */
.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--sage);
  border: 1px solid rgba(27,67,50,0.16);
  min-width: 260px;
}

.toolbar-search-icon {
  font-size: 16px;
  color: var(--sub);
}

.toolbar-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text);
  width: 160px;
}

/* Filter chips */
.toolbar-chip {
  font-size: 12px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(27,67,50,0.25);
  background: white;
  color: var(--sub);
  cursor: pointer;
  transition: 0.25s ease;
}

.toolbar-chip.active {
  background: var(--forest);
  color: white;
  border-color: var(--forest);
  box-shadow: 0 6px 16px rgba(27,67,50,0.25);
}

/* Buttons right side */
.toolbar-primary-btn {
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: var(--forest);
  color: white;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 8px 18px rgba(27,67,50,0.25);
  transition: 0.25s ease;
}

.toolbar-primary-btn:hover {
  background: var(--yellow);
  color: var(--olive);
}

.toolbar-ghost-btn {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(27,67,50,0.25);
  background: white;
  color: var(--olive);
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: 0.25s ease;
}

.toolbar-ghost-btn:hover {
  background: var(--sage);
}

/* Cart icon */
.cart-icon {
  position: relative;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(27,67,50,0.25);
  background: white;
  color: var(--olive);
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: 0.25s ease;
}

.cart-icon:hover {
  background: var(--sage);
}

.cart-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--forest);
  color: white;
  font-size: 11px;
  font-weight: 700;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* -----------------------------------------
   PRODUCT GRID
------------------------------------------ */
.product-grid {
  padding: 20px 40px 60px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 25px;
}

.product-status {
  grid-column: 1 / -1;
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  color: var(--sub);
  box-shadow: 0 10px 28px rgba(0,0,0,0.12);
}

.product-status-error {
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: var(--error);
}

.product-card {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(0,0,0,0.12);
  transition: 0.3s ease;
  position: relative;
}

.product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 18px 40px rgba(0,0,0,0.22);
}

.product-image {
  width: 100%;
  height: 185px;
  object-fit: cover;
}

.tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 14px;
  background: var(--yellow);
  color: var(--olive);
  font-size: 11px;
  border-radius: 14px;
  font-weight: 700;
}

.tag-sale {
  background: var(--forest);
  color: white;
}

.out-stock-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 14px;
  background: rgba(231, 76, 60, 0.12);
  color: var(--error);
  font-size: 11px;
  font-weight: 700;
  z-index: 2;
}

.card-content {
  padding: 16px;
}

.product-name {
  font-size: 16px;
  font-weight: 700;
}

.product-details {
  font-size: 13px;
  color: var(--sub);
  margin-top: 5px;
}

.price {
  font-size: 17px;
  font-weight: 700;
  color: var(--forest);
  margin-top: 10px;
}

.actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.btn-main {
  flex: 1;
  padding: 10px 14px;
  background: var(--forest);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.btn-main:hover {
  background: var(--yellow);
  color: var(--olive);
}

.btn-outline {
  padding: 10px 14px;
  border-radius: 20px;
  border: 1px solid var(--forest);
  background: white;
  color: var(--forest);
  font-size: 13px;
  cursor: pointer;
}

/* -----------------------------------------
   PRODUCT DETAILS MODAL (GENERAL)
------------------------------------------ */
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

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qa-item {
  background: var(--sage);
  border-radius: 14px;
  padding: 14px;
  border: 1px solid rgba(27,67,50,0.12);
}

.qa-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--sub);
  margin-bottom: 6px;
}

.qa-private {
  background: rgba(231, 76, 60, 0.15);
  color: var(--error);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.qa-question {
  font-weight: 600;
  color: var(--olive);
  margin-bottom: 6px;
}

.qa-answers {
  margin-top: 10px;
  padding-left: 12px;
  border-left: 2px solid rgba(27,67,50,0.15);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qa-answer {
  font-size: 14px;
  color: var(--text);
}

.qa-answer-meta {
  font-size: 12px;
  color: var(--sub);
  margin-bottom: 4px;
}

.qa-empty {
  color: var(--sub);
  font-style: italic;
}

.qa-error {
  color: var(--error);
}

.qa-form {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qa-textarea {
  width: 100%;
  min-height: 70px;
  border: 1px solid rgba(27,67,50,0.25);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: white;
  color: var(--text);
}

.qa-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.qa-select {
  border: 1px solid rgba(27,67,50,0.25);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--sub);
  background: white;
}

.qa-button {
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  background: var(--forest);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease;
}

.qa-button:hover {
  background: var(--yellow);
  color: var(--olive);
}

.qa-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.rating-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.rating-stars {
  color: var(--yellow);
  font-size: 16px;
}

.rating-text {
  font-size: 14px;
  color: var(--sub);
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.stock-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--leaf);
}

.stock-text {
  font-size: 14px;
  color: var(--sub);
}

.category-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 20px;
  background-color: var(--sage);
  color: var(--olive);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: capitalize;
}

.tag-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 20px;
  background-color: var(--forest);
  color: white;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: uppercase;
}

/* EDIT FORM STYLES */
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

.edit-form-input, .edit-form-select, .edit-form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(27,67,50,0.25);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  transition: all 0.2s ease;
  background-color: white;
}

.edit-form-input:focus, .edit-form-select:focus, .edit-form-textarea:focus {
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
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
}

/* -----------------------------------------
   CART MODAL
------------------------------------------ */
.cart-overlay {
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

.cart-content {
  background-color: white;
  border-radius: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: modalFadeIn 0.3s ease;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}

.cart-header {
  padding: 20px;
  border-bottom: 1px solid var(--sage);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cart-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--olive);
}

.cart-body {
  padding: 20px;
}

.cart-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--sub);
}

.cart-item {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--sage);
}

.cart-item-image {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
}

.cart-item-details {
  flex: 1;
}

.cart-item-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 5px;
}

.cart-item-price {
  font-size: 14px;
  color: var(--forest);
  font-weight: 600;
  margin-bottom: 8px;
}

.cart-item-seller {
  font-size: 12px;
  color: var(--sub);
}

.cart-item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}

.cart-item-quantity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quantity-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--forest);
  background: white;
  color: var(--forest);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.quantity-btn:hover {
  background: var(--forest);
  color: white;
}

.quantity-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  min-width: 20px;
  text-align: center;
}

.remove-btn {
  color: #e74c3c;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.remove-btn:hover {
  color: #c0392b;
}

.cart-footer {
  padding: 20px;
  border-top: 1px solid var(--sage);
}

.cart-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 700;
}

.cart-total-price {
  color: var(--forest);
}

.cart-actions {
  display: flex;
  gap: 10px;
}

.cart-btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.cart-btn-primary {
  background-color: var(--forest);
  color: white;
}

.cart-btn-primary:hover {
  background-color: var(--yellow);
  color: var(--olive);
}

.cart-btn-secondary {
  background-color: white;
  color: var(--forest);
  border: 1px solid var(--forest);
}

.cart-btn-secondary:hover {
  background-color: var(--sage);
}

/* -----------------------------------------
   MY ITEMS MODAL
------------------------------------------ */
.my-items-overlay {
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

.my-items-content {
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

.my-items-header {
  padding: 20px;
  border-bottom: 1px solid var(--sage);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.my-items-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--olive);
}

.my-items-body {
  padding: 20px;
}

.my-items-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--sub);
}

.my-items-item {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--sage);
}

.my-items-item-image {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  object-fit: cover;
}

.my-items-item-details {
  flex: 1;
}

.my-items-item-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 5px;
}

.my-items-item-price {
  font-size: 16px;
  color: var(--forest);
  font-weight: 600;
  margin-bottom: 8px;
}

.my-items-item-seller {
  font-size: 14px;
  color: var(--sub);
  margin-bottom: 8px;
}

.my-items-item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 15px;
}

.my-items-item-quantity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.my-items-quantity-label {
  font-size: 14px;
  color: var(--sub);
  margin-right: 5px;
}

.my-items-quantity-input {
  width: 60px;
  padding: 8px;
  border: 1px solid var(--forest);
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.my-items-quantity-input:focus {
  outline: none;
  border-color: var(--forest);
  box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
}

.my-items-details-btn {
  padding: 8px 16px;
  background: white;
  color: var(--forest);
  border: 1px solid var(--forest);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.my-items-details-btn:hover {
  background: var(--sage);
}

.my-items-delete-btn {
  padding: 8px 16px;
  background: white;
  color: var(--error);
  border: 1px solid var(--error);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.my-items-delete-btn:hover {
  background: var(--error);
  color: white;
}

.my-items-footer {
  padding: 20px;
  border-top: 1px solid var(--sage);
  display: flex;
  gap: 15px;
}

.my-items-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 700;
}

.my-items-total-price {
  color: var(--forest);
}

.my-items-actions {
  display: flex;
  gap: 10px;
}

.my-items-btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.my-items-btn-primary {
  background-color: var(--forest);
  color: white;
}

.my-items-btn-primary:hover {
  background-color: var(--yellow);
  color: var(--olive);
}

.my-items-btn-secondary {
  background-color: white;
  color: var(--forest);
  border: 1px solid var(--forest);
}

.my-items-btn-secondary:hover {
  background-color: var(--sage);
}

/* -----------------------------------------
   CHECKOUT MODAL
------------------------------------------ */
.checkout-content {
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

.checkout-header {
  padding: 20px;
  border-bottom: 1px solid var(--sage);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkout-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--olive);
}

.checkout-body {
  padding: 20px;
}

.checkout-section {
  margin-bottom: 30px;
}

.checkout-section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--olive);
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(27,67,50,0.25);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--forest);
  box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.payment-methods {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.payment-method {
  flex: 1;
  padding: 15px;
  border: 2px solid rgba(27,67,50,0.25);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.payment-method.active {
  border-color: var(--forest);
  background-color: var(--sage);
}

.payment-method-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.payment-method-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.credit-card-form {
  display: grid;
  gap: 15px;
}

.card-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 15px;
}

.order-summary {
  background-color: var(--sage);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.summary-item:last-child {
  margin-bottom: 0;
  padding-top: 8px;
  border-top: 1px solid rgba(27,67,50,0.25);
  font-weight: 700;
  font-size: 16px;
}

.checkout-footer {
  padding: 20px;
  border-top: 1px solid var(--sage);
  display: flex;
  gap: 15px;
}

.checkout-btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.checkout-btn-primary {
  background-color: var(--forest);
  color: white;
}

.checkout-btn-primary:hover {
  background-color: var(--yellow);
  color: var(--olive);
}

.checkout-btn-primary:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
}

.checkout-btn-secondary {
  background-color: white;
  color: var(--forest);
  border: 1px solid var(--forest);
}

.checkout-btn-secondary:hover {
  background-color: var(--sage);
}

@media (max-width: 768px) {
  .modal-content {
    max-width: 100%;
    margin: 0;
    border-radius: 24px 24px 0 0;
    max-height: 95vh;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .edit-form-row {
    grid-template-columns: 1fr;
  }
  
  .cart-content {
    max-width: 100%;
    margin: 0;
    border-radius: 24px 24px 0 0;
    max-height: 95vh;
  }
  
  .cart-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .cart-item-actions {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  
  .checkout-content {
    max-width: 100%;
    margin: 0;
    border-radius: 24px 24px 0 0;
    max-height: 95vh;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .card-row {
    grid-template-columns: 1fr;
  }
  
  .payment-methods {
    flex-direction: column;
  }
  
  .my-items-content {
    max-width: 100%;
    margin: 0;
    border-radius: 24px 24px 0 0;
    max-height: 95vh;
  }
  
  .my-items-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .my-items-item-actions {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

      `}</style>

      {/* ------------------------------------------------------
          FEATURE PANEL
      ------------------------------------------------------- */}
      <section className="feature-panel">
        <div className="decorative-shape shape-1"></div>
        <div className="decorative-shape shape-2"></div>

        <div className="feature-item">
          <div className="feature-icon floating">🛒</div>
          <h3>Buy Anything</h3>
          <p>
            Plants, seeds, fertilizers, equipment — directly from trusted
            farmers.
          </p>
        </div>

        <div className="feature-item">
          <div className="feature-icon floating">🔧</div>
          <h3>Rent Equipment</h3>
          <p>Sprayers, cutters, tools & machines available for daily rental.</p>
        </div>

        <div className="feature-item">
          <div className="feature-icon floating">📦</div>
          <h3>Add Your Products</h3>
          <p>Sell or rent your personal agricultural items to others.</p>
        </div>

        <div className="feature-item">
          <div className="feature-icon floating">🚚</div>
          <h3>Fast Delivery</h3>
          <p>Same-city delivery for plants, seeds, equipment and more.</p>
        </div>
      </section>

      {/* ------------------------------------------------------
          CATEGORY CIRCLES
      ------------------------------------------------------- */}
      <section className="category-section">
        <p className="category-title">Select what you need</p>

        <div className="category-grid">
          <div
            className="category-card"
            onClick={() => setActiveCategory("plants")}
          >
            <div className="circle">
              <img
                className="circle-main"
                src="/img/store/plants.png"
                alt="Plants"
              />
            </div>
            <div className="circle-text">Plants</div>
          </div>

          <div
            className="category-card"
            onClick={() => setActiveCategory("seeds")}
          >
            <div className="circle">
              <img
                className="circle-main"
                src="/img/store/seeds.png"
                alt="Seeds"
              />
            </div>
            <div className="circle-text">Seeds & Soil</div>
          </div>

          <div
            className="category-card"
            onClick={() => setActiveCategory("crops")}
          >
            <div className="circle">
              <img
                className="circle-main crops-img"
                src="/img/store/crops.png"
                alt="Crops"
              />
            </div>
            <div className="circle-text">Crops</div>
          </div>

          <div
            className="category-card"
            onClick={() => setActiveCategory("equipment")}
          >
            <div className="circle">
              <img
                className="circle-main"
                src="/img/store/equipment.png"
                alt="Equipment"
              />
            </div>
            <div className="circle-text">Equipment</div>
          </div>

          <div
            className="category-card"
            onClick={() => setActiveCategory("pots")}
          >
            <div className="circle">
              <img
                className="circle-main"
                src="/img/store/pots.png"
                alt="Pots"
              />
            </div>
            <div className="circle-text">Pots</div>
          </div>

          <div
            className="category-card"
            onClick={() => setActiveCategory("medicines")}
          >
            <div className="circle">
              <img
                className="circle-main"
                src="/img/store/medicines.png"
                alt="Medicines"
              />
            </div>
            <div className="circle-text">Medicines</div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------
          STORE TOOLBAR (SEARCH + FILTERS + ACTION BUTTONS)
      ------------------------------------------------------- */}
      <div className="store-toolbar">
        {/* LEFT SIDE: SEARCH + SALE/RENT FILTER */}
        <div className="toolbar-left">
          <div className="toolbar-search">
            <span className="toolbar-search-icon">🔍</span>
            <input
              className="toolbar-input"
              type="text"
              placeholder="Search by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            className={
              "toolbar-chip " + (saleRentFilter === "all" ? "active" : "")
            }
            onClick={() => {
              setSaleRentFilter("all");
              setActiveCategory("all");
            }}
          >
            All items
          </button>
          <button
            className={
              "toolbar-chip " + (saleRentFilter === "sale" ? "active" : "")
            }
            onClick={() => setSaleRentFilter("sale")}
          >
            For sale
          </button>
          <button
            className={
              "toolbar-chip " + (saleRentFilter === "rent" ? "active" : "")
            }
            onClick={() => setSaleRentFilter("rent")}
          >
            For rent
          </button>
        </div>

        {/* RIGHT SIDE: ACTION BUTTONS */}
        <div className="toolbar-right">
          <button
            className="toolbar-ghost-btn"
            onClick={() => setShowMyOrders(true)}
          >
            🧾 My Orders
          </button>

          <button
            className="toolbar-ghost-btn"
            onClick={() => setShowMyRentals(true)}
          >
            📅 My Rentals
          </button>

          <button
            className="toolbar-ghost-btn"
            onClick={() => setShowMyItems(true)}
          >
            📦 My Items
          </button>

          <button
            className="toolbar-primary-btn"
            onClick={() => {
              resetAddForm();
              setShowAddItem(true);
            }}
          >
            ➕ Add Item
          </button>

          <button className="cart-icon" onClick={() => setShowCart(true)}>
            🛒 Cart
            {cartItems.length > 0 && (
              <span className="cart-count">{cartItems.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------
          PRODUCT GRID — FILTERED RESULTS
      ------------------------------------------------------- */}
      <section className="product-grid">
        {itemsError && (
          <div className="product-status product-status-error">{itemsError}</div>
        )}

        {loadingItems ? (
          <div className="product-status">Loading items...</div>
        ) : sortedProducts.length === 0 ? (
          <div className="product-status">No items found.</div>
        ) : (
          sortedProducts.map((p) => (
            <div key={p.id} className="product-card">
              {p.tag !== "rent" && Number.isFinite(Number(p.stock)) && Number(p.stock) <= 0 && (
                <div className="out-stock-badge">Out of stock</div>
              )}
              <div style={{ position: "relative" }}>
                <img src={p.img} className="product-image" />

                {p.tag === "sale" && <div className="tag tag-sale">FOR SALE</div>}
                {p.tag === "rent" && <div className="tag">FOR RENT</div>}
              </div>

              <div className="card-content">
                <div className="product-name">{p.name}</div>
                <div className="product-details">
                  {getDisplayLocation(p)}
                  {Number.isFinite(p.distanceKm) && (
                    <span style={{ marginLeft: "6px", color: "#6b7280", fontSize: "13px" }}>
                      - {p.distanceKm.toFixed(1)} km away
                    </span>
                  )}
                </div>
                <div className="price">{p.price}</div>

                <div className="actions">
          <button
            className="btn-main"
            onClick={() => {
              const outOfStock =
                p.tag !== "rent" &&
                Number.isFinite(Number(p.stock)) &&
                Number(p.stock) <= 0;
              if (outOfStock) return;
              if (p.tag === "rent") {
                openDetails(p);
              } else {
                addToCart(p);
              }
            }}
            disabled={
              p.tag !== "rent" &&
              Number.isFinite(Number(p.stock)) &&
              Number(p.stock) <= 0
            }
          >
            {p.tag !== "rent" &&
            Number.isFinite(Number(p.stock)) &&
            Number(p.stock) <= 0
              ? "Out of Stock"
              : p.tag === "rent"
              ? "Rent Now"
              : "Add to Cart"}
          </button>
                  <button 
                    className="btn-outline"
                    onClick={() => openDetails(p)}
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ------------------------------------------------------
          PRODUCT DETAILS MODAL (GENERAL)
      ------------------------------------------------------- */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetails}>✕</button>
            
            <div className="modal-header">
              <img src={selectedProduct.img} alt={selectedProduct.name} />
            </div>
            
            <div className="modal-body">
              {selectedProduct.isOwnItem && (
                <div className="edit-actions" style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  {!isEditing ? (
                    <>
                      <button 
                        className="modal-btn modal-btn-secondary"
                        onClick={() => startEditing(selectedProduct)}
                      >
                        ✏️ Edit Item
                      </button>
                      <button 
                        className="modal-btn modal-btn-danger"
                        onClick={deleteItem}
                      >
                        🗑️ Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="edit-btn edit-btn-save"
                        onClick={saveEdit}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : '💾 Save Changes'}
                      </button>
                      <button 
                        className="edit-btn edit-btn-cancel"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        ❌ Cancel
                      </button>
                    </>
                  )}
                </div>
              )}

              {isEditing && selectedProduct.isOwnItem ? (
                <div className="edit-form">
                  <div className="edit-form-group">
                    <label className="edit-form-label">Item Name *</label>
                    <input 
                      type="text" 
                      name="name"
                      className="edit-form-input"
                      value={editForm.name}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label className="edit-form-label">Category *</label>
                      <select 
                        name="category"
                        className="edit-form-select"
                        value={editForm.category}
                        onChange={handleEditChange}
                      >
                        <option value="plants">Plants</option>
                        <option value="seeds">Seeds & Soil</option>
                        <option value="crops">Crops</option>
                        <option value="equipment">Equipment</option>
                        <option value="pots">Pots</option>
                        <option value="medicines">Medicines</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="edit-form-group">
                      <label className="edit-form-label">Type *</label>
                      <select 
                        name="tag"
                        className="edit-form-select"
                        value={editForm.tag}
                        onChange={handleEditChange}
                      >
                        <option value="sale">For Sale</option>
                        <option value="rent" disabled={!isRentAllowed(editForm.category)}>For Rent (equipment only)</option>
                      </select>
                    </div>
                  </div>

                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label className="edit-form-label">
                        Price (₪ {editForm.tag === "rent" ? "/ day" : `/ ${editForm.price_unit || "unit"}`}) *
                      </label>
                      <input 
                        type="number" 
                        name="price"
                        className="edit-form-input"
                        value={editForm.price}
                        onChange={handleEditChange}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="edit-form-group">
                    <label className="edit-form-label">Unit</label>
                    <select
                      name="price_unit"
                      className="edit-form-select"
                      value={editForm.price_unit}
                      onChange={handleEditChange}
                      disabled={editForm.tag === "rent"}
                    >
                        {getUnitOptions(editForm.category, editForm.tag).map((unit) => (
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
                        name="stock"
                        className="edit-form-input"
                        value={editForm.stock}
                        onChange={handleEditChange}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Location *</label>
                    <input 
                      type="text" 
                      name="location"
                      className="edit-form-input"
                      value={editForm.location}
                      onChange={handleEditChange}
                      placeholder="e.g., Nablus — Delivery Available"
                    />
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Image URL</label>
                    <input 
                      type="url" 
                      name="image_url"
                      className="edit-form-input"
                      value={editForm.image_url}
                      onChange={handleEditChange}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Description</label>
                    <textarea 
                      name="description"
                      className="edit-form-textarea"
                      value={editForm.description}
                      onChange={handleEditChange}
                      placeholder="Describe your item in detail..."
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="modal-title">{selectedProduct.name}</h2>
                  <div className="modal-price">{selectedProduct.price}</div>
                  
                  <div className="modal-section">
                    <h3 className="modal-section-title">Item Details</h3>
                    <div className="modal-section-content simple-details">
                      <div className="detail-row">
                        <span className="detail-label">Type</span>
                        <span>{selectedProduct.tag === "sale" ? "For Sale" : "For Rent"}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Category</span>
                        <span>{selectedProduct.category}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Location</span>
                        <span>
                          {selectedLocationLoading
                            ? "Loading location..."
                            : selectedLocationName ||
                              selectedProduct.location ||
                              "Location unavailable"}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Stock</span>
                        <span>
                          {selectedOutOfStock ? "Out of stock" : selectedProduct.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedProduct.description && (
                  <div className="modal-section">
                    <h3 className="modal-section-title">Description</h3>
                    <div className="modal-section-content">
                      {selectedProduct.description}
                    </div>
                  </div>
                )}

                  <div className="modal-section">
                    <h3 className="modal-section-title">Questions & Answers</h3>
                    <div className="modal-section-content">
                      {questionsLoading ? (
                        <div className="qa-empty">Loading questions...</div>
                      ) : questionsError ? (
                        <div className="qa-empty qa-error">{questionsError}</div>
                      ) : productQuestions.length === 0 ? (
                        <div className="qa-empty">No questions yet. Be the first to ask.</div>
                      ) : (
                        <div className="qa-list">
                          {productQuestions.map((question) => (
                            <div key={question.id} className="qa-item">
                              <div className="qa-meta">
                                <span>{question.asker?.name || "User"}</span>
                                <span>{formatQuestionTime(question.created_at)}</span>
                                {question.visibility === "private" && (
                                  <span className="qa-private">Private</span>
                                )}
                                {question.status === "answered" && <span>Answered</span>}
                              </div>
                              <div className="qa-question">{question.question_text}</div>

                              <div className="qa-answers">
                                {question.answers && question.answers.length > 0 ? (
                                  question.answers.map((answer) => (
                                    <div key={answer.id} className="qa-answer">
                                      <div className="qa-answer-meta">
                                        {answer.responder?.name || "Responder"} -{" "}
                                        {formatQuestionTime(answer.created_at)}
                                      </div>
                                      <div>{answer.answer_text}</div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="qa-empty">No answers yet.</div>
                                )}
                              </div>

                              {canAnswerQuestion && question.status !== "closed" && (
                                <div className="qa-form">
                                  <textarea
                                    className="qa-textarea"
                                    placeholder="Write an answer..."
                                    value={answerDrafts[question.id] || ""}
                                    onChange={(e) =>
                                      setAnswerDrafts((prev) => ({
                                        ...prev,
                                        [question.id]: e.target.value,
                                      }))
                                    }
                                  />
                                  {answerErrors[question.id] && (
                                    <div className="qa-empty qa-error">
                                      {answerErrors[question.id]}
                                    </div>
                                  )}
                                  <div className="qa-actions">
                                    <button
                                      className="qa-button"
                                      onClick={() => submitAnswer(question.id)}
                                      disabled={
                                        answerSubmitting[question.id] ||
                                        !(answerDrafts[question.id] || "").trim()
                                      }
                                    >
                                      {answerSubmitting[question.id] ? "Posting..." : "Post Answer"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {canAskQuestion && (
                        <div className="qa-form">
                          <textarea
                            className="qa-textarea"
                            placeholder="Ask a question about this product..."
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                          />
                          <div className="qa-actions">
                            <select
                              className="qa-select"
                              value={questionVisibility}
                              onChange={(e) => setQuestionVisibility(e.target.value)}
                            >
                              <option value="public">Public</option>
                              <option value="private">Private</option>
                            </select>
                            <button
                              className="qa-button"
                              onClick={submitQuestion}
                              disabled={
                                questionSubmitting || !questionText.trim() || !authToken
                              }
                            >
                              {questionSubmitting ? "Sending..." : "Ask Question"}
                            </button>
                          </div>
                          {!authToken && (
                            <div className="qa-empty">Sign in to submit questions.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedProduct?.tag === "rent" && !selectedProduct.isOwnItem && (
                    <div
                      className="rent-box"
                      style={{
                        background: "#f0f7f4",
                        padding: "18px",
                        borderRadius: "14px",
                        marginTop: "20px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                        border: "1px solid rgba(46,139,87,0.18)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div>
                          <h3 style={{ color: "#2E8B57", margin: 0 }}>Rent This Item</h3>
                          <div style={{ color: "#4B5563", fontSize: "13px" }}>
                            Choose your rental window before confirming.
                          </div>
                        </div>
                        <div style={{ background: "#d1f0e0", color: "#1b4332", padding: "6px 10px", borderRadius: "10px", fontSize: "12px" }}>
                          {rentUnavailable.length} blocked range{rentUnavailable.length === 1 ? "" : "s"}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ fontSize: "13px", color: "#1f2937", fontWeight: 600 }}>Start Date</label>
                          <input
                            type="date"
                            value={rentStart}
                            onChange={(e) => {
                              const val = e.target.value;
                              const chosen = parseDate(val);
                              const conflict = rentUnavailable.some((r) =>
                                datesOverlap(
                                  chosen,
                                  chosen,
                                  parseDate(r.start),
                                  parseDate(r.end)
                                )
                              );
                              if (conflict) {
                                setRentError("That start date is already booked.");
                                setRentStart("");
                                return;
                              }
                              setRentError("");
                              setRentStart(val);
                            }}
                            style={{
                              borderRadius: "10px",
                              border: "1px solid #d1d5db",
                              padding: "10px 12px",
                              fontSize: "14px",
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ fontSize: "13px", color: "#1f2937", fontWeight: 600 }}>End Date</label>
                          <input
                            type="date"
                            value={rentEnd}
                            onChange={(e) => {
                              const val = e.target.value;
                              const chosen = parseDate(val);
                              const startChosen = parseDate(rentStart);
                              const conflict = rentUnavailable.some((r) =>
                                datesOverlap(
                                  startChosen || chosen,
                                  chosen,
                                  parseDate(r.start),
                                  parseDate(r.end)
                                )
                              );
                              if (conflict) {
                                setRentError("Those dates overlap with an existing rental.");
                                setRentEnd("");
                                return;
                              }
                              if (startChosen && chosen < startChosen) {
                                setRentError("End date cannot be before start date.");
                                setRentEnd("");
                                return;
                              }
                              setRentError("");
                              setRentEnd(val);
                            }}
                            style={{
                              borderRadius: "10px",
                              border: "1px solid #d1d5db",
                              padding: "10px 12px",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", color: "#374151", fontSize: "13px" }}>
                        <span style={{ width: "10px", height: "10px", background: "#ef4444", borderRadius: "50%", display: "inline-block" }}></span>
                        Unavailable dates are blocked.
                      </div>

                      {rentDatesLoading && (
                        <p style={{ color: "#6b7280", marginTop: "6px" }}>
                          Checking availability...
                        </p>
                      )}
                      {rentUnavailable.length > 0 && (
                        <div style={{ marginTop: "8px", fontSize: "13px", color: "#1b4332", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          {rentUnavailable.map((r, idx) => (
                            <span
                              key={`${r.start}-${r.end}-${idx}`}
                              style={{
                                background: "#d1f0e0",
                                padding: "6px 10px",
                                borderRadius: "10px",
                                border: "1px solid rgba(46,139,87,0.2)",
                              }}
                            >
                              {r.start} → {r.end}
                            </span>
                          ))}
                        </div>
                      )}
                      {rentError && <p style={{ color: "red", marginTop: "8px" }}>{rentError}</p>}

                      <button
                        onClick={handleRent}
                        disabled={rentLoading}
                        style={{
                          background: rentLoading ? "#6EE7B7" : "#2E8B57",
                          color: "white",
                          padding: "12px 18px",
                          marginTop: "14px",
                          borderRadius: "12px",
                          width: "100%",
                          fontWeight: 700,
                          border: "none",
                          boxShadow: "0 6px 18px rgba(46,139,87,0.25)",
                        }}
                      >
                        {rentLoading ? "Processing..." : "Confirm Rental"}
                      </button>
                    </div>
                  )}

                </>
              )}
              
              {!isEditing && (
                <div className="modal-footer">
                  {!selectedProduct.isOwnItem && (
                    <button
                      className="modal-btn modal-btn-danger"
                      onClick={() => reportItem(selectedProduct)}
                      disabled={reportSending}
                    >
                      {reportSending ? "Reporting..." : "Report Item"}
                    </button>
                  )}
                  <button 
                    className="modal-btn modal-btn-primary"
                    onClick={() => {
                      if (selectedProduct.isOwnItem) return;
                      if (selectedOutOfStock && selectedProduct.tag !== "rent") return;
                      if (selectedProduct.tag === "rent") {
                        const owner = getOwnerId(selectedProduct);
                        if (owner && userId && String(owner) === String(userId)) {
                          alert("You cannot rent your own item.");
                          return;
                        }
                        addToCart(selectedProduct, {
                          startDate: rentStart,
                          endDate: rentEnd,
                          skipServer: true,
                        });
                        setShowCart(true);
                        return;
                      }
                      addToCart(selectedProduct);
                      closeDetails();
                    }}
                    disabled={
                      selectedProduct.isOwnItem ||
                      (selectedProduct.tag === "rent" && rentLoading) ||
                      (selectedProduct.tag !== "rent" && selectedOutOfStock)
                    }
                  >
                    {selectedProduct.tag !== "rent" && selectedOutOfStock
                      ? "Out of Stock"
                      : selectedProduct.tag === "rent"
                      ? rentLoading
                        ? "Processing..."
                        : "Add Rental to Cart"
                      : "Add to Cart"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          CART MODAL
      ------------------------------------------------------- */}
      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-content" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h2 className="cart-title">Shopping Cart</h2>
              <button className="modal-close" onClick={() => setShowCart(false)}>✕</button>
            </div>
            
            <div className="cart-body">
              {cartLoading ? (
                <div className="cart-empty">
                  <p>Loading your cart...</p>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="cart-empty">
                  <p>{cartError || "Your cart is empty"}</p>
                  {!cartError && <p>Add some items to get started!</p>}
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <img src={item.img} alt={item.name} className="cart-item-image" />

                    <div className="cart-item-details">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">{item.price}</div>
                      <div className="cart-item-seller">Sold by: {item.seller}</div>
                      {item.tag === "rent" && (
                        <div style={{ marginTop: "6px", fontSize: "13px", color: "#1b4332" }}>
                          <div>Rental dates:</div>
                          <div>
                            Start: {item.rentalStartDate || item.start_date || "—"}
                          </div>
                          <div>
                            End: {item.rentalEndDate || item.end_date || "—"}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="cart-item-actions">
                      <div className="cart-item-quantity">
                        <button
                          className="quantity-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          className="quantity-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-footer">
                {hasCartStockIssue && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecdd3",
                      color: "#991b1b",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      marginBottom: "12px",
                    }}
                  >
                    Some items exceed available stock:
                    <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                      {cartStockWarnings.map((w) => (
                        <li key={w.id}>{w.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="cart-total">
                  <span>Total:</span>
                  <span className="cart-total-price">{calculateTotal()}₪</span>
                </div>

                <div className="cart-actions">
                  <button
                    className="cart-btn cart-btn-secondary"
                    onClick={() => setShowCart(false)}
                  >
                    Continue Shopping
                  </button>
                  <button
                    className="cart-btn cart-btn-primary"
                    onClick={proceedToCheckout}
                    disabled={hasCartStockIssue}
                    style={hasCartStockIssue ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                  >
                    Confirm Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          MY ITEMS MODAL
      ------------------------------------------------------- */}
      {showMyItems && (
        <div className="my-items-overlay" onClick={() => setShowMyItems(false)}>
          <div className="my-items-content" onClick={(e) => e.stopPropagation()}>
            <div className="my-items-header">
              <h2 className="my-items-title">My Items</h2>
              <button className="modal-close" onClick={() => setShowMyItems(false)}>✕</button>
            </div>
            
            <div className="my-items-body">
              {loadingMyItems ? (
                <div className="my-items-empty">
                  <p>Loading your listed items...</p>
                </div>
              ) : myItemsError ? (
                <div className="my-items-empty">
                  <p>{myItemsError}</p>
                </div>
              ) : myListedItems.length === 0 ? (
                <div className="my-items-empty">
                  <p>You haven't listed any items yet</p>
                  <p>Use "Add Item" to post something for sale or rent.</p>
                </div>
              ) : (
                myListedItems.map((item) => (
                  <div key={item.id} className="my-items-item">
                    <img src={item.img} alt={item.name} className="my-items-item-image" />
                    
                    <div className="my-items-item-details">
                      <div className="my-items-item-name">{item.name}</div>
                      <div className="my-items-item-price">{item.price}</div>
                      <div className="my-items-item-seller">
                        {item.tag === "rent" ? "For rent" : "For sale"} • {item.location}
                      </div>
                    </div>
                    
                    <div className="my-items-item-actions">
                      <div className="my-items-item-quantity">
                        <span className="my-items-quantity-label">Stock:</span>
                        <span>{typeof item.stock === "number" ? item.stock : "-"}</span>
                      </div>
                      
                      <div>
                        <button 
                          className="my-items-details-btn"
                          onClick={() => openDetails(item, true)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="my-items-footer">
              <div className="my-items-actions">
                <button 
                  className="my-items-btn my-items-btn-secondary"
                  onClick={() => setShowMyItems(false)}
                >
                  Close
                </button>
                <button
                  className="my-items-btn my-items-btn-primary"
                  onClick={() => {
                    resetAddForm();
                    setShowAddItem(true);
                    setShowMyItems(false);
                  }}
                >
                  Add Item
                </button>
              </div>
            </div>
      </div>
    </div>
      )}

      {/* ------------------------------------------------------
          MY ORDERS MODAL
      ------------------------------------------------------- */}
      {showMyOrders && (
        <div className="my-items-overlay" onClick={() => setShowMyOrders(false)}>
          <div className="my-items-content" onClick={(e) => e.stopPropagation()}>
            <div className="my-items-header">
              <h2 className="my-items-title">My Orders</h2>
              <button className="modal-close" onClick={() => setShowMyOrders(false)}>✕</button>
            </div>

            <div className="my-items-body" style={{ paddingBottom: 0 }}>
              <MyOrdersPage embedded />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          MY RENTALS MODAL
      ------------------------------------------------------- */}
      {showMyRentals && (
        <div className="my-items-overlay" onClick={() => setShowMyRentals(false)}>
          <div className="my-items-content" onClick={(e) => e.stopPropagation()}>
            <div className="my-items-header">
              <h2 className="my-items-title">My Rentals</h2>
              <button className="modal-close" onClick={() => setShowMyRentals(false)}>✕</button>
            </div>

            <div className="my-items-body" style={{ paddingBottom: 0 }}>
              <MyRentalsPage embedded />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          ADD ITEM MODAL
      ------------------------------------------------------- */}
      {showAddItem && (
        <div className="my-items-overlay" onClick={cancelAdd}>
          <div className="my-items-content" onClick={(e) => e.stopPropagation()}>
            <div className="my-items-header">
              <h2 className="my-items-title">Add Item</h2>
              <button className="modal-close" onClick={cancelAdd}>✕</button>
            </div>

            <div className="my-items-body">
              <div className="edit-form">
                <div className="edit-form-group">
                  <label className="edit-form-label">Item Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="edit-form-input"
                    value={addForm.name}
                    onChange={handleAddChange}
                    placeholder="Professional Grass Cutter"
                  />
                </div>

                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label className="edit-form-label">Category *</label>
                    <select
                      name="category"
                      className="edit-form-select"
                      value={addForm.category}
                      onChange={handleAddChange}
                    >
                      <option value="plants">Plants</option>
                      <option value="seeds">Seeds & Soil</option>
                      <option value="crops">Crops</option>
                      <option value="equipment">Equipment</option>
                      <option value="pots">Pots</option>
                      <option value="medicines">Medicines</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Type *</label>
                    <select
                      name="tag"
                      className="edit-form-select"
                      value={addForm.tag}
                      onChange={handleAddChange}
                    >
                      <option value="sale">For Sale</option>
                      <option value="rent" disabled={!isRentAllowed(addForm.category)}>For Rent (equipment only)</option>
                    </select>
                  </div>
                </div>

                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label className="edit-form-label">
                      Price (₪ {addForm.tag === "rent" ? "/ day" : `/ ${addForm.price_unit || "unit"}`}) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      className="edit-form-input"
                      value={addForm.price}
                      onChange={handleAddChange}
                      min="0"
                      step="0.01"
                      placeholder={addForm.tag === "rent" ? "30" : "120"}
                    />
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Unit</label>
                    <select
                      name="price_unit"
                      className="edit-form-select"
                      value={addForm.price_unit}
                      onChange={handleAddChange}
                      disabled={addForm.tag === "rent"}
                    >
                      {getUnitOptions(addForm.category, addForm.tag).map((unit) => (
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
                      name="stock"
                      className="edit-form-input"
                      value={addForm.stock}
                      onChange={handleAddChange}
                      min="0"
                    />
                  </div>
                </div>

                <div className="edit-form-group">
                  <label className="edit-form-label">Location *</label>
                  <input
                    type="text"
                    name="location"
                    className="edit-form-input"
                    value={addForm.location}
                    onChange={handleAddChange}
                    placeholder="e.g., 31.952200, 35.233200"
                  />
                  <button
                    type="button"
                    className="my-items-btn my-items-btn-secondary"
                    style={{ marginTop: "8px", width: "fit-content" }}
                    onClick={openLocationPicker}
                    disabled={locatingUser}
                  >
                    {locatingUser ? "Finding..." : "Use My Location"}
                  </button>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#5f6b7a" }}>
                    {addForm.location
                      ? `Selected: ${addForm.location}${
                          locationName
                            ? ` (${locationName})`
                            : locationNameLoading
                            ? " (Resolving place name...)"
                            : ""
                        }`
                      : "Choose a point on the map to autofill latitude and longitude."}
                  </div>
                </div>

                <div className="edit-form-group">
                  <label className="edit-form-label">Image URL</label>
                  <input
                    type="url"
                    name="image_url"
                    className="edit-form-input"
                    value={addForm.image_url}
                    onChange={handleAddChange}
                    placeholder="https://example.com/image.jpg"
                  />
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAddFileChange}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <div className="edit-form-group">
                  <label className="edit-form-label">Description</label>
                  <textarea
                    name="description"
                    className="edit-form-textarea"
                    value={addForm.description}
                    onChange={handleAddChange}
                    placeholder="Describe your item in detail..."
                  />
                </div>
              </div>
            </div>

            <div className="my-items-footer">
              <div className="my-items-actions">
                <button
                  className="my-items-btn my-items-btn-secondary"
                  onClick={cancelAdd}
                  disabled={adding}
                >
                  Cancel
                </button>
                <button
                  className="my-items-btn my-items-btn-primary"
                  onClick={saveNewItem}
                  disabled={adding}
                >
                  {adding ? "Adding..." : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          LOCATION PICKER MODAL
      ------------------------------------------------------- */}
      {showLocationPicker && (
        <div
          className="my-items-overlay"
          onClick={() => setShowLocationPicker(false)}
          style={{ zIndex: 1500 }}
        >
          <div
            className="my-items-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "900px" }}
          >
            <div className="my-items-header">
              <h2 className="my-items-title">Pick Location</h2>
              <button className="modal-close" onClick={() => setShowLocationPicker(false)}>X</button>
            </div>

            <div className="my-items-body">
              <p style={{ marginBottom: "12px", color: "#4b5563" }}>
                Drag the marker or click anywhere on the map to set the coordinates for your item.
              </p>
              <div style={{ height: "380px", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
                <MapContainer
                  center={locationPickerTarget === "checkout" ? deliveryLocationCoords : locationCoords}
                  zoom={13}
                  scrollWheelZoom
                  style={{ height: "100%", width: "100%" }}
                  whenCreated={(map) => {
                    mapRef.current = map;
                  }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={locationPickerTarget === "checkout" ? deliveryLocationCoords : locationCoords}
                    draggable
                    icon={leafletMarkerIcon}
                    eventHandlers={{ dragend: handleMarkerDrag }}
                  />
                  <LocationMapEvents onSelect={handleMapLocationChange} />
                </MapContainer>
              </div>
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "14px",
                  color: "#111827",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  Selected:{" "}
                  {formatLatLng(
                    (locationPickerTarget === "checkout" ? deliveryLocationCoords : locationCoords).lat,
                    (locationPickerTarget === "checkout" ? deliveryLocationCoords : locationCoords).lng
                  )}
                </span>
                <span>
                  {locationPickerTarget === "checkout"
                    ? deliveryLocationNameLoading
                      ? "Resolving place name..."
                      : deliveryLocationName || "Pick a spot to see its place name."
                    : locationNameLoading
                    ? "Resolving place name..."
                    : locationName || "Pick a spot to see its place name."}
                </span>
                {locatingUser && <span>Trying to detect your position...</span>}
              </div>
            </div>

            <div className="my-items-footer">
              <div className="my-items-actions">
                <button
                  className="my-items-btn my-items-btn-secondary"
                  onClick={() => setShowLocationPicker(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          CHECKOUT MODAL
      ------------------------------------------------------- */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="checkout-content" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-header">
              <h2 className="checkout-title">Checkout</h2>
              <button className="modal-close" onClick={() => setShowCheckout(false)}>✕</button>
            </div>
            
            <div className="checkout-body">
              {/* Delivery Information */}
              <div className="checkout-section">
                <h3 className="checkout-section-title">
                  📍 Delivery Information
                </h3>
                
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    name="fullName"
                    className="form-input"
                    placeholder="Enter your full name"
                    value={deliveryInfo.fullName}
                    onChange={handleDeliveryChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input 
                    type="tel" 
                    name="phone"
                    className="form-input"
                    placeholder="Enter your phone number"
                    value={deliveryInfo.phone}
                    onChange={handleDeliveryChange}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input 
                      type="text" 
                      name="city"
                      className="form-input"
                      placeholder="Enter your city"
                      value={deliveryInfo.city}
                      onChange={handleDeliveryChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input 
                      type="text" 
                      name="postalCode"
                      className="form-input"
                      placeholder="Enter postal code"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Street Address *</label>
                  <input 
                    type="text" 
                    name="address"
                    className="form-input"
                      placeholder="Enter your street address"
                      value={deliveryInfo.address}
                      onChange={handleDeliveryChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Location</label>
                    <input
                      type="text"
                      name="location"
                      className="form-input"
                      placeholder="Click 'Use My Location' to set precise point"
                      value={deliveryInfo.location || ""}
                      onChange={handleDeliveryChange}
                    />
                    <button
                      type="button"
                      className="my-items-btn my-items-btn-secondary"
                      style={{ marginTop: "8px", width: "fit-content" }}
                      onClick={() => openLocationPicker("checkout")}
                      disabled={locatingUser}
                    >
                      {locatingUser ? "Finding..." : "Use My Location"}
                    </button>
                    <div style={{ marginTop: "6px", fontSize: "12px", color: "#5f6b7a" }}>
                      {deliveryInfo.location
                        ? `Selected: ${deliveryInfo.location}${
                            deliveryLocationName
                              ? ` (${deliveryLocationName})`
                              : deliveryLocationNameLoading
                              ? " (Resolving place name...)"
                              : ""
                          }`
                        : "Pick a point to auto-fill coordinates and place name."}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Delivery Notes (Optional)</label>
                    <input 
                      type="text" 
                      name="notes"
                    className="form-input"
                    placeholder="Any special instructions for delivery"
                    value={deliveryInfo.notes}
                    onChange={handleDeliveryChange}
                  />
                </div>
              </div>
              
              {/* Payment Method */}
              <div className="checkout-section">
                <h3 className="checkout-section-title">
                  💳 Payment Method
                </h3>
                
                <div className="payment-methods">
                  <div 
                    className={`payment-method ${paymentMethod === 'credit' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('credit')}
                  >
                    <div className="payment-method-icon">💳</div>
                    <div className="payment-method-title">Credit Card</div>
                  </div>
                  
                  <div 
                    className={`payment-method ${paymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <div className="payment-method-icon">💵</div>
                    <div className="payment-method-title">Cash on Delivery</div>
                  </div>
                </div>
                
                {paymentMethod === 'credit' && (
                  <div className="credit-card-form">
                    <div className="form-group">
                      <label className="form-label">Card Number *</label>
                      <input 
                        type="text" 
                        name="cardNumber"
                        className="form-input"
                        placeholder="1234 5678 9012 3456"
                        value={paymentInfo.cardNumber}
                        onChange={handlePaymentChange}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Cardholder Name *</label>
                      <input 
                        type="text" 
                        name="cardName"
                        className="form-input"
                        placeholder="John Doe"
                        value={paymentInfo.cardName}
                        onChange={handlePaymentChange}
                      />
                    </div>
                    
                    <div className="card-row">
                      <div className="form-group">
                        <label className="form-label">Expiry Date *</label>
                        <input 
                          type="text" 
                          name="expiryDate"
                          className="form-input"
                          placeholder="MM/YY"
                          value={paymentInfo.expiryDate}
                          onChange={handlePaymentChange}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">CVV *</label>
                        <input 
                          type="text" 
                          name="cvv"
                          className="form-input"
                          placeholder="123"
                          value={paymentInfo.cvv}
                          onChange={handlePaymentChange}
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          name="saveCard"
                          checked={paymentInfo.saveCard}
                          onChange={handlePaymentChange}
                        />
                        Save card for future purchases
                      </label>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Order Summary */}
              <div className="checkout-section">
                <h3 className="checkout-section-title">
                  📋 Order Summary
                </h3>
                
                <div className="order-summary">
                  <div className="summary-item">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>{calculateTotal()}₪</span>
                  </div>
                  <div className="summary-item">
                    <span>Delivery Fee</span>
                    <span>15₪</span>
                  </div>
                  <div className="summary-item">
                    <span>Tax</span>
                    <span>{(parseFloat(calculateTotal()) * 0.1).toFixed(2)}₪</span>
                  </div>
                  <div className="summary-item">
                    <span>Total</span>
                    <span>{(parseFloat(calculateTotal()) + 15 + parseFloat(calculateTotal()) * 0.1).toFixed(2)}₪</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="checkout-footer">
              <button 
                className="checkout-btn checkout-btn-secondary"
                onClick={() => setShowCheckout(false)}
              >
                Back to Cart
              </button>
              <button 
                className="checkout-btn checkout-btn-primary"
                onClick={submitOrder}
                disabled={orderProcessing}
              >
                {orderProcessing ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
