import { supabase } from "../config/supabaseClient.js";
import jwt from "jsonwebtoken";

const table = {
  items: "store_items",
  orders: "store_orders",
  orderItems: "store_order_items",
  orderStatusHistory: "store_order_status_history",
  rentalStatusHistory: "store_rental_status_history",
  rentals: "store_rentals",
  questions: "product_questions",
  answers: "product_answers",
};

const RETURN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const LATE_ELIGIBLE_STATUSES = new Set(["pending", "approved", "active"]);

const getLatestStatusEntry = (timeline = [], status) => {
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    if (timeline[i]?.status === status) return timeline[i];
  }
  return null;
};

const isArchivedTimeline = (timeline = []) => {
  const deliveredEntry = getLatestStatusEntry(timeline, "delivered");
  const hasReturned = (timeline || []).some((t) => t.status === "returned");
  if (!deliveredEntry || hasReturned) return false;
  const deliveredAt = new Date(deliveredEntry.changed_at);
  if (Number.isNaN(deliveredAt.getTime())) return false;
  return Date.now() - deliveredAt.getTime() > RETURN_WINDOW_MS;
};

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const getOptionalUserId = (req) => {
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id ?? decoded?.user_id ?? decoded?.farmer_id ?? null;
  } catch (err) {
    return null;
  }
};

const markOverdueRentalsLate = async (rentals = []) => {
  const today = getTodayDateString();
  const overdue = rentals.filter(
    (r) =>
      r?.end_date &&
      r.end_date < today &&
      LATE_ELIGIBLE_STATUSES.has(r.status)
  );

  if (overdue.length === 0) return rentals;

  const overdueIds = overdue.map((r) => r.id);
  const { error: updateErr } = await supabase
    .from(table.rentals)
    .update({ status: "late", late: true })
    .in("id", overdueIds);

  if (updateErr) {
    console.error("markOverdueRentalsLate update error:", updateErr);
    return rentals;
  }

  const { error: historyInsertErr } = await supabase
    .from(table.rentalStatusHistory)
    .insert(
      overdueIds.map((id) => ({
        rental_id: id,
        status: "late",
        changed_by: "system",
      }))
    );

  if (historyInsertErr) {
    console.error(
      "markOverdueRentalsLate history insert error:",
      historyInsertErr
    );
  }

  const overdueSet = new Set(overdueIds);
  return rentals.map((r) =>
    overdueSet.has(r.id) ? { ...r, status: "late", late: true } : r
  );
};
/* ============================================================
   GET ALL ITEMS (with filters)
============================================================ */
export const getAllItems = async (req, res) => {
  try {
    const { category, tag, search, farmer_id } = req.query;

    let query = supabase
      .from(table.items)
      .select("*, farmer:farmer_id (id, name)");

    if (category) query = query.eq("category", category);
    if (tag) query = query.eq("tag", tag);
    if (farmer_id) query = query.eq("farmer_id", farmer_id);
    if (search) {
      const term = `%${search}%`;
      query = query.or(`name.ilike.${term},location.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("getAllItems error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================
   GET SINGLE ITEM
============================================================ */
export const getSingleItem = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(table.items)
      .select("*, farmer:farmer_id (id, name)")
      .eq("id", req.params.id)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ message: "Item not found" });
    }
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("getSingleItem error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================
   CREATE ITEM (Sale or Rent)
============================================================ */
export const createItem = async (req, res) => {
  try {
    const payload = req.body || {};

    const { data, error } = await supabase
      .from(table.items)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("createItem error:", err);
    res.status(500).json({ error: "Unable to create item" });
  }
};

/* ============================================================
   UPDATE ITEM
============================================================ */
export const updateItem = async (req, res) => {
  try {
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No data provided" });
    }

    // Fields that are NOT allowed to be edited
    const protectedFields = ["id", "owner_id", "created_at"];

    // Remove protected fields if sent
    protectedFields.forEach((field) => delete updates[field]);

    // Ensure updated_at is refreshed
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(table.items)
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: "Item updated successfully",
      item: data,
    });
  } catch (err) {
    console.error("updateItem error:", err);
    res.status(500).json({ error: "Update failed" });
  }
};


/* ============================================================
   DELETE ITEM
============================================================ */
export const deleteItem = async (req, res) => {
  try {
    const itemId = req.params.id;
    if (!itemId) {
      return res.status(400).json({ error: "Missing item id" });
    }

    const [orderRef, rentalRef, cartRef] = await Promise.all([
      supabase
        .from(table.orderItems)
        .select("id", { count: "exact", head: true })
        .eq("item_id", itemId),
      supabase
        .from(table.rentals)
        .select("id", { count: "exact", head: true })
        .eq("item_id", itemId),
      supabase
        .from("store_cart")
        .select("id", { count: "exact", head: true })
        .eq("item_id", itemId),
    ]);

    if (orderRef.error) throw orderRef.error;
    if (rentalRef.error) throw rentalRef.error;
    if (cartRef.error) throw cartRef.error;

    const ordersCount = orderRef.count || 0;
    const rentalsCount = rentalRef.count || 0;
    const cartCount = cartRef.count || 0;

    if (ordersCount > 0 || rentalsCount > 0 || cartCount > 0) {
      return res.status(409).json({
        error: "Cannot delete item with existing references",
        references: {
          orders: ordersCount,
          rentals: rentalsCount,
          cart: cartCount,
        },
      });
    }

    const { error } = await supabase
      .from(table.items)
      .delete()
      .eq("id", itemId);

    if (error) throw error;

    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("deleteItem error:", err);
    if (err?.code === "23503") {
      return res.status(409).json({
        error: "Cannot delete item because it is referenced by other records",
      });
    }
    res.status(500).json({ error: "Delete failed" });
  }
};

/* ============================================================
   ⭐ NEW: GET USER'S ITEMS (My Items)
============================================================ */
export const getUserItems = async (req, res) => {
  try {
    const userId = req.params.id;

    const { data, error } = await supabase
      .from(table.items)
      .select("*, farmer:farmer_id (id, name)")
      .eq("farmer_id", userId);   // ✅ FIXED HERE

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("getUserItems error:", err);
    res.status(500).json({ error: "Could not load user's items" });
  }
};

// ⭐ GET ORDERS ON MY ITEMS (SELLER ORDERS)
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.params.id;

    // Fetch items owned by seller
    const { data: items, error: itemsErr } = await supabase
      .from(table.items)
      .select("*")
      .eq("farmer_id", sellerId);

    if (itemsErr) throw itemsErr;
    if (!items || items.length === 0) return res.json([]);

    const itemIds = items.map((i) => i.id);
    const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

    // Fetch order items that reference those products
    const { data: orderItems, error: orderItemsErr } = await supabase
      .from(table.orderItems)
      .select("id, order_id, item_id, quantity, price_each")
      .in("item_id", itemIds);

    if (orderItemsErr) throw orderItemsErr;
    if (!orderItems || orderItems.length === 0) return res.json([]);

    const orderIds = [
      ...new Set(
        orderItems
          .map((oi) => Number(oi.order_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];
    if (orderIds.length === 0) return res.json([]);

    // Fetch order metadata
    const { data: orders, error: ordersErr } = await supabase
      .from(table.orders)
      .select("id, buyer_id, total_price, status, created_at")
      .in("id", orderIds);

    if (ordersErr) throw ordersErr;

    const orderMap = new Map(
      (orders || []).map((o) => [Number(o.id), o])
    );
    const timelineByOrderId = {};

    const { data: historyRows, error: historyErr } = await supabase
      .from(table.orderStatusHistory)
      .select("order_id, status, changed_at, changed_by")
      .in("order_id", orderIds)
      .order("changed_at", { ascending: true });

    if (historyErr) {
      console.error("getSellerOrders history error:", historyErr);
    } else {
      (historyRows || []).forEach((row) => {
        const normalizedOrderId = Number(row.order_id);
        if (!timelineByOrderId[normalizedOrderId]) {
          timelineByOrderId[normalizedOrderId] = [];
        }
        timelineByOrderId[normalizedOrderId].push({
          status: row.status,
          changed_at: row.changed_at,
          changed_by: row.changed_by,
        });
      });
    }

    const rows = orderItems
      .map((oi) => {
        const order = orderMap.get(Number(oi.order_id)) || {};
        const item = itemMap[oi.item_id] || {};

        const timeline = timelineByOrderId[Number(oi.order_id)] || [];
        return {
          id: oi.id,
          order_id: oi.order_id,
          quantity: oi.quantity,
          price_each: oi.price_each,
          item_id: oi.item_id,
          item_name: item.name,
          image_url: item.image_url,
          location: item.location,
          buyer_id: order.buyer_id,
          total_price: order.total_price,
          status: order.status,
          created_at: order.created_at,
          timeline,
          archived: isArchivedTimeline(timeline),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

    res.json(rows);
  } catch (err) {
    console.error("getSellerOrders error:", err?.message || err, err?.details || "");
    res.status(500).json({ error: "Unable to fetch seller orders" });
  }
};


/* ============================================================
   RENT AN ITEM
============================================================ */

const isRentalOverlapping = (existing, start, end) => {
  const existingStart = new Date(existing.start_date);
  const existingEnd = new Date(existing.end_date);
  return existingStart <= end && existingEnd >= start;
};

export const rentItem = async (req, res) => {
  try {
    const { renter_id, item_id, start_date, end_date } = req.body;

    const { data: item, error: itemErr } = await supabase
      .from(table.items)
      .select("*")
      .eq("id", item_id)
      .single();

    if (itemErr) throw itemErr;
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!item.is_rentable)
      return res.status(400).json({ message: "This item cannot be rented" });

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (!(start < end))
      return res.status(400).json({ message: "Invalid rental dates" });

    const { data: rentals, error: rentalsErr } = await supabase
      .from(table.rentals)
      .select("*")
      .eq("item_id", item_id)
      .in("status", ["active", "late"]);

    if (rentalsErr) throw rentalsErr;

    const conflict = (rentals || []).some((r) =>
      isRentalOverlapping(r, start, end)
    );

    if (conflict) {
      return res
        .status(409)
        .json({ message: "Item already rented for these dates" });
    }

    const days =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (days <= 0)
      return res.status(400).json({ message: "Rental period must be > 0 days" });

    if (days > (item.max_rent_days || 30)) {
      return res.status(400).json({
        message: `Max rental period is ${item.max_rent_days || 30} days`,
      });
    }

    const total_cost = days * (item.rent_price_per_day || item.price || 0);

    const { data: rental, error } = await supabase
  .from(table.rentals)
  .insert([{
    renter_id,
    item_id,
    start_date,
    end_date,
    total_cost,
    status: "pending"   
  }])
  .select()
  .single();


    if (error) throw error;

    res.json({ message: "Rental successful", rental });
  } catch (err) {
    console.error("rentItem error:", err);
    res.status(500).json({ error: "Rental failed" });
  }
};

/* ============================================================
   GET RENTALS FOR USER
============================================================ */
export const getUserRentals = async (req, res) => {
  try {
    const userId = req.params.id;

    const { data, error } = await supabase
      .from(table.rentals)
      .select("*, store_items(name, image_url)")
      .eq("renter_id", userId)
      .order("start_date", { ascending: false });

    if (error) throw error;

    const updated = await markOverdueRentalsLate(data || []);
    res.json(updated || []);
  } catch (err) {
    console.error("getUserRentals error:", err);
    res.status(500).json({ error: "Could not load rentals" });
  }
};

/* ============================================================
   GET RENTALS FOR ITEM
============================================================ */
export const getItemRentals = async (req, res) => {
  try {
    const itemId = req.params.id;

    const { data, error } = await supabase
      .from(table.rentals)
      .select("*")
      .eq("item_id", itemId)
      .order("start_date", { ascending: false });

    if (error) throw error;

    const updated = await markOverdueRentalsLate(data || []);
    res.json(updated || []);
  } catch (err) {
    console.error("getItemRentals error:", err);
    res.status(500).json({ error: "Could not load item rentals" });
  }
};

/* ============================================================
   CREATE ORDER
============================================================ */
export const createOrder = async (req, res) => {
  try {
    const {
      user_id,
      items = [],
      payment_method = "cash",
      totals = {},
    } = req.body || {};

    if (!user_id)
      return res.status(400).json({ message: "user_id is required" });

    if (!Array.isArray(items) || items.length === 0)
      return res
        .status(400)
        .json({ message: "At least one item is required" });

    const computedTotal =
      totals.total ??
      items.reduce(
        (sum, item) =>
          sum +
          (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );

    const itemIds = [
      ...new Set(
        items
          .map((item) => Number(item.item_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];

    if (itemIds.length === 0) {
      return res.status(400).json({ message: "Invalid item list" });
    }

    const { data: storeItems, error: storeItemsErr } = await supabase
      .from(table.items)
      .select("id, name, stock, tag, is_rentable")
      .in("id", itemIds);

    if (storeItemsErr) throw storeItemsErr;

    const storeItemMap = new Map(
      (storeItems || []).map((row) => [Number(row.id), row])
    );

    if (storeItemMap.size !== itemIds.length) {
      return res.status(404).json({ message: "One or more items not found" });
    }

    const requestedById = new Map();
    items.forEach((item) => {
      const id = Number(item.item_id);
      if (!Number.isFinite(id)) return;
      const storeItem = storeItemMap.get(id);
      if (!storeItem) return;
      const tag =
        item.tag ||
        storeItem.tag ||
        (storeItem.is_rentable ? "rent" : "sale");
      if (tag === "rent") return;
      const qty = Number(item.quantity) || 1;
      const current = requestedById.get(id) || 0;
      requestedById.set(id, current + qty);
    });

    const stockUpdates = [];
    for (const [id, qty] of requestedById.entries()) {
      const storeItem = storeItemMap.get(id);
      const currentStock = Number(storeItem?.stock);
      const available = Number.isFinite(currentStock) ? currentStock : 0;
      if (qty > available) {
        return res.status(400).json({
          message: `Not enough stock for ${storeItem?.name || "item"}`,
          item_id: id,
          available,
          requested: qty,
        });
      }
      stockUpdates.push({ id, stock: Math.max(0, available - qty) });
    }

    const { data: order, error: orderErr } = await supabase
      .from(table.orders)
      .insert([
        {
          buyer_id: user_id,
          total_price: computedTotal,
          payment_method,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (orderErr) throw orderErr;

    const { error: historyErr } = await supabase
      .from(table.orderStatusHistory)
      .insert([
        {
          order_id: order.id,
          status: "pending",
          changed_by: "buyer",
        },
      ]);

    if (historyErr) {
      console.error("createOrder history insert error:", historyErr);
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      item_id: item.item_id,
      quantity: item.quantity || 1,
      price_each: item.price || 0,
    }));

    const { data: insertedItems, error: itemsErr } = await supabase
      .from(table.orderItems)
      .insert(orderItems)
      .select();

    if (itemsErr) throw itemsErr;

    const buyerRes = await supabase
      .from("farmer")
      .select("id, name")
      .eq("id", user_id)
      .single();
    const buyerName = buyerRes.data?.name || "Someone";

    const uniqueItemIds = [
      ...new Set(
        insertedItems
          .map((item) => Number(item.item_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];

    if (uniqueItemIds.length > 0) {
      const { data: storeItems, error: storeErr } = await supabase
        .from(table.items)
        .select("id, name, farmer_id")
        .in("id", uniqueItemIds);

      if (storeErr) {
        console.error("createOrder notification store items error:", storeErr);
      } else {
        const itemsByFarmer = storeItems.reduce((acc, item) => {
          if (!item || !item.farmer_id) return acc;
          const arr = acc.get(item.farmer_id) || [];
          arr.push(item);
          acc.set(item.farmer_id, arr);
          return acc;
        }, new Map());

        const notifications = [];
        itemsByFarmer.forEach((itemsList, farmerId) => {
          if (!farmerId) return;
          const itemNames = itemsList
            .map((itm) => itm.name)
            .filter(Boolean)
            .slice(0, 3);
          const title = "New store order";
          const message = `${buyerName} ordered ${itemNames.join(", ") || "your item"}.`;
          notifications.push({
            farmer_id: farmerId,
            title,
            message,
            type: "store_order",
            metadata: {
              order_id: order.id,
              item_ids: itemsList.map((itm) => itm.id),
              actor_id: user_id,
              actor_name: buyerName,
            },
          });
        });

        if (notifications.length > 0) {
          const { error: notifErr } = await supabase
            .from("notifications")
            .insert(notifications);
          if (notifErr) {
            console.error("createOrder notification insert error:", notifErr);
          }
        }
      }
    }

    for (const update of stockUpdates) {
      const { error: stockErr } = await supabase
        .from(table.items)
        .update({ stock: update.stock, updated_at: new Date().toISOString() })
        .eq("id", update.id);

      if (stockErr) {
        console.error("createOrder stock update error:", stockErr);
      }
    }

    res.status(201).json({ order, items: insertedItems });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
};

/* ============================================================
   GET USER ORDERS
============================================================ */
export const getUserOrders = async (req, res) => {
  try {
    const buyerId = req.params.id;

    const { data, error } = await supabase
      .from(table.orders)
      .select(
        `
        *,
        store_order_items(
          id,
          item_id,
          quantity,
          price_each,
          store_items (
            id,
            name
          )
        )
      `
      )
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const orders = data || [];
    const orderIds = orders
      .map((o) => Number(o.id))
      .filter((id) => Number.isFinite(id));
    const timelineByOrderId = {};

    if (orderIds.length > 0) {
      const { data: historyRows, error: historyErr } = await supabase
        .from(table.orderStatusHistory)
        .select("order_id, status, changed_at, changed_by")
        .in("order_id", orderIds)
        .order("changed_at", { ascending: true });

      if (historyErr) {
        console.error("getUserOrders history error:", historyErr);
      } else {
        (historyRows || []).forEach((row) => {
          const normalizedOrderId = Number(row.order_id);
          if (!timelineByOrderId[normalizedOrderId]) {
            timelineByOrderId[normalizedOrderId] = [];
          }
          timelineByOrderId[normalizedOrderId].push({
            status: row.status,
            changed_at: row.changed_at,
            changed_by: row.changed_by,
          });
        });
      }
    }

    res.json(
      orders.map((o) => {
        const timeline = timelineByOrderId[Number(o.id)] || [];
        return {
          ...o,
          timeline,
          archived: isArchivedTimeline(timeline),
        };
      })
    );
  } catch (err) {
    console.error("getUserOrders error:", err);
    res.status(500).json({ error: "Could not load orders" });
  }
};
export const addToCart = async (req, res) => {
  try {
    const { user_id, item_id, quantity } = req.body;
    if (!user_id || !item_id) {
      return res.status(400).json({ error: "user_id and item_id are required" });
    }

    // Check if item exists in cart
    const { data: existing, error: err1 } = await supabase
      .from("store_cart")
      .select("*")
      .eq("user_id", user_id)
      .eq("item_id", item_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("store_cart")
        .update({ quantity: existing.quantity + (quantity || 1) })
        .eq("id", existing.id)
        .select()
        .single();

      return res.json(data);
    }

    // Insert new cart item
    const { data, error } = await supabase
      .from("store_cart")
      .insert([{ user_id, item_id, quantity: quantity || 1 }])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("addToCart error:", err);
    res.status(500).json({ error: "Unable to add item to cart" });
  }
};
export const getCart = async (req, res) => {
  try {
    const id =
      req.params.id ||
      req.query.user_id ||
      req.query.userId ||
      req.query.id;

    if (!id) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const { data, error } = await supabase
      .from("store_cart")
      .select("id, quantity, store_items(*)")
      .eq("user_id", id);

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("getCart error:", err);
    res.status(200).json([]);
  }
};
export const updateCart = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const { data, error } = await supabase
      .from("store_cart")
      .update({ quantity })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("updateCart error:", err);
    res.status(500).json({ error: "Unable to update cart" });
  }
};
export const removeCartItem = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("store_cart")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "Item removed" });
  } catch (err) {
    console.error("removeCartItem error:", err);
    res.status(500).json({ error: "Unable to remove item" });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, changed_by } = req.body;

    const allowed = ["pending", "processing", "in-transit", "delivered", "returned"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const { data: order, error: orderErr } = await supabase
      .from(table.orders)
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderErr && orderErr.code === "PGRST116") {
      return res.status(404).json({ error: "Order not found" });
    }
    if (orderErr) throw orderErr;

    const { data: historyRows, error: historyFetchErr } = await supabase
      .from(table.orderStatusHistory)
      .select("status, changed_at")
      .eq("order_id", orderId)
      .order("changed_at", { ascending: true });

    if (historyFetchErr) {
      console.error("updateOrderStatus history fetch error:", historyFetchErr);
    }

    const safeHistory = historyRows || [];
    if (isArchivedTimeline(safeHistory)) {
      return res.status(400).json({ error: "Order is archived" });
    }

    if (status === "returned") {
      if (order.status !== "delivered") {
        return res
          .status(400)
          .json({ error: "Return allowed only after delivery" });
      }

      const deliveredEntry = getLatestStatusEntry(safeHistory, "delivered");
      if (!deliveredEntry) {
        return res.status(400).json({ error: "Order not delivered yet" });
      }

      const deliveredAt = new Date(deliveredEntry.changed_at);
      if (Number.isNaN(deliveredAt.getTime())) {
        return res.status(400).json({ error: "Invalid delivery date" });
      }

      if (Date.now() - deliveredAt.getTime() > RETURN_WINDOW_MS) {
        return res.status(400).json({ error: "Return window expired" });
      }
    }

    if (order.status === status) {
      return res.json({ success: true, order });
    }

    const { data, error } = await supabase
      .from(table.orders)
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Order not found" });
    }
    if (error) throw error;

    const { error: historyInsertErr } = await supabase
      .from(table.orderStatusHistory)
      .insert([
        {
          order_id: orderId,
          status,
          changed_by: changed_by || "seller",
        },
      ]);

    if (historyInsertErr) {
      console.error("updateOrderStatus history insert error:", historyInsertErr);
    }

    return res.json({ success: true, order: data });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getSellerRentals = async (req, res) => {
  try {
    const sellerId = req.params.id;

    // Join rentals with items by seller/farmer_id to avoid empty results when item prefetch fails
    const { data: rentals, error: rentErr } = await supabase
      .from("store_rentals")
      .select("*, store_items!inner(id, name, image_url, location, farmer_id)")
      .eq("store_items.farmer_id", sellerId)
      .order("start_date", { ascending: false });

    if (rentErr) throw rentErr;

    const mapped = (rentals || []).map((r) => ({
      ...r,
      item: r.store_items || r.item || {},
    }));

    const updated = await markOverdueRentalsLate(mapped);
    res.json(updated || []);
  } catch (err) {
    console.error("getSellerRentals error:", err);
    res.status(500).json({ error: "Unable to load seller rentals" });
  }
};

/* ============================================================
   UPDATE RENTAL STATUS (seller/admin)
============================================================ */
/*export const updateRentalStatus = async (req, res) => {
  try {
    const rentalId = req.params.id;
    const { status } = req.body || {};

    const allowed = ["pending", "approved", "rejected", "cancelled", "active", "returned", "late"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const { data, error } = await supabase
      .from("store_rentals")
      .update({ status })
      .eq("id", rentalId)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ message: "Rental not found" });
    }
    if (error) throw error;

    res.json({ success: true, rental: data });
  } catch (err) {
    console.error("updateRentalStatus error:", err);
    res.status(500).json({ message: "Could not update rental status" });
  }
};*/
export const updateRentalStatus = async (req, res) => {
  try {
    const rentalId = req.params.id;
    const {
      status,
      late_fee = 0,
      damage_fee = 0,
      damage_note = "",
      changed_by,
    } = req.body;

    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
      "active",
      "returned",
      "late",
      "cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid rental status" });
    }

    const { data: rental, error: rentalErr } = await supabase
      .from(table.rentals)
      .select("id, status")
      .eq("id", rentalId)
      .single();

    if (rentalErr && rentalErr.code === "PGRST116") {
      return res.status(404).json({ message: "Rental not found" });
    }
    if (rentalErr) throw rentalErr;

    if (rental?.status === status) {
      return res.json({ message: "Rental status updated", rental });
    }

    const updates = { status };

    if (status === "returned") {
      updates.returned_at = new Date().toISOString();
    }

    if (late_fee > 0) updates.late_fee = late_fee;
    if (damage_fee > 0) updates.damage_fee = damage_fee;
    if (damage_note) updates.damage_note = damage_note;

    const { data, error } = await supabase
      .from(table.rentals)
      .update(updates)
      .eq("id", rentalId)
      .select()
      .single();

    if (error) throw error;

    const { error: historyInsertErr } = await supabase
      .from(table.rentalStatusHistory)
      .insert([
        {
          rental_id: rentalId,
          status,
          changed_by: changed_by || "seller",
        },
      ]);

    if (historyInsertErr) {
      console.error(
        "updateRentalStatus history insert error:",
        historyInsertErr
      );
    }

    res.json({ message: "Rental status updated", rental: data });
  } catch (err) {
    console.error("updateRentalStatus error:", err);
    res.status(500).json({ error: "Failed to update rental status" });
  }
};

/* ============================================================
   PRODUCT QUESTIONS (Q&A)
============================================================ */
export const getProductQuestions = async (req, res) => {
  try {
    const productId = req.params.id;
    if (!productId) {
      return res.status(400).json({ error: "Missing product id" });
    }

    const { data: item, error: itemErr } = await supabase
      .from(table.items)
      .select("id, farmer_id")
      .eq("id", productId)
      .single();

    if (itemErr && itemErr.code === "PGRST116") {
      return res.status(404).json({ error: "Item not found" });
    }
    if (itemErr) throw itemErr;

    const userId = getOptionalUserId(req);
    let query = supabase
      .from(table.questions)
      .select(
        `
        *,
        asker:asker_id(id, name, avatar, is_expert, expert_verified),
        answers:product_answers(
          *,
          responder:responder_id(id, name, avatar, is_expert, expert_verified)
        )
      `
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (!userId) {
      query = query.eq("visibility", "public");
    } else if (String(userId) !== String(item.farmer_id)) {
      query = query.or(`visibility.eq.public,asker_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((question) => ({
      ...question,
      answers: (question.answers || []).sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
        return aTime - bTime;
      }),
    }));

    res.json(normalized);
  } catch (err) {
    console.error("getProductQuestions error:", err);
    res.status(500).json({ error: "Unable to load questions" });
  }
};

export const addProductQuestion = async (req, res) => {
  try {
    const productId = req.params.id;
    const askerId = req.user?.id;
    const { question_text, visibility } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: "Missing product id" });
    }

    if (!askerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trimmed = (question_text || "").trim();
    if (!trimmed) {
      return res.status(400).json({ error: "Question text is required" });
    }

    const { data: item, error: itemErr } = await supabase
      .from(table.items)
      .select("id")
      .eq("id", productId)
      .single();

    if (itemErr && itemErr.code === "PGRST116") {
      return res.status(404).json({ error: "Item not found" });
    }
    if (itemErr) throw itemErr;

    const safeVisibility = visibility === "private" ? "private" : "public";

    const { data: question, error } = await supabase
      .from(table.questions)
      .insert([
        {
          product_id: item.id,
          asker_id: askerId,
          question_text: trimmed,
          visibility: safeVisibility,
        },
      ])
      .select(
        `
        *,
        asker:asker_id(id, name, avatar, is_expert, expert_verified),
        answers:product_answers(
          *,
          responder:responder_id(id, name, avatar, is_expert, expert_verified)
        )
      `
      )
      .single();

    if (error) throw error;

    res.status(201).json({
      question: {
        ...question,
        answers: question?.answers || [],
      },
    });
  } catch (err) {
    console.error("addProductQuestion error:", err);
    res.status(500).json({ error: "Unable to submit question" });
  }
};

export const addProductAnswer = async (req, res) => {
  try {
    const questionId = req.params.id;
    const responderId = req.user?.id;
    const { answer_text } = req.body || {};

    if (!questionId) {
      return res.status(400).json({ error: "Missing question id" });
    }

    if (!responderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trimmed = (answer_text || "").trim();
    if (!trimmed) {
      return res.status(400).json({ error: "Answer text is required" });
    }

    const { data: question, error: questionErr } = await supabase
      .from(table.questions)
      .select("id, product_id, status")
      .eq("id", questionId)
      .single();

    if (questionErr && questionErr.code === "PGRST116") {
      return res.status(404).json({ error: "Question not found" });
    }
    if (questionErr) throw questionErr;

    if (question.status === "closed") {
      return res.status(400).json({ error: "Question is closed" });
    }

    const { data: item, error: itemErr } = await supabase
      .from(table.items)
      .select("id, farmer_id")
      .eq("id", question.product_id)
      .single();

    if (itemErr && itemErr.code === "PGRST116") {
      return res.status(404).json({ error: "Item not found" });
    }
    if (itemErr) throw itemErr;

    const isOwner = String(item.farmer_id) === String(responderId);
    let isExpert = false;

    if (!isOwner) {
      const { data: farmer, error: farmerErr } = await supabase
        .from("farmer")
        .select("id, is_expert, expert_verified")
        .eq("id", responderId)
        .single();

      if (farmerErr && farmerErr.code !== "PGRST116") throw farmerErr;
      isExpert = Boolean(farmer?.is_expert || farmer?.expert_verified);
    }

    if (!isOwner && !isExpert) {
      return res
        .status(403)
        .json({ error: "Not authorized to answer this question" });
    }

    const { data: answer, error: answerErr } = await supabase
      .from(table.answers)
      .insert([
        {
          question_id: questionId,
          responder_id: responderId,
          answer_text: trimmed,
        },
      ])
      .select(
        `
        *,
        responder:responder_id(id, name, avatar, is_expert, expert_verified)
      `
      )
      .single();

    if (answerErr) throw answerErr;

    let updatedStatus = question.status;
    if (question.status !== "answered") {
      const { data: updated, error: updateErr } = await supabase
        .from(table.questions)
        .update({ status: "answered", updated_at: new Date().toISOString() })
        .eq("id", questionId)
        .select("status")
        .single();

      if (!updateErr) {
        updatedStatus = updated?.status || "answered";
      }
    }

    res.status(201).json({ answer, status: updatedStatus });
  } catch (err) {
    console.error("addProductAnswer error:", err);
    res.status(500).json({ error: "Unable to submit answer" });
  }
};
