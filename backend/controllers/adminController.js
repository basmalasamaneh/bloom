import { supabase } from '../config/supabaseClient.js'

/* =====================================================
   DASHBOARD OVERVIEW STATS
===================================================== */
export const getDashboardStats = async (req, res) => {
  try {
    // ---- Counts ----
    const [
      usersCount,
      productsCount,
      activeRentalsCount,
      pendingExpertsCount,
      orders,
      rentals,
      expertChats
    ] = await Promise.all([
      supabase.from("farmer").select("id", { count: "exact", head: true }),
      supabase.from("store_items").select("id", { count: "exact", head: true }),
      supabase
        .from("store_rentals")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("experts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("store_orders").select("total_price"),
      supabase.from("store_rentals").select("total_cost"),
      supabase.from("expert_chat_purchases").select("amount").eq("status", "paid")
    ]);

    // ---- Revenue ----
    const salesRevenue =
      orders.data?.reduce((sum, o) => sum + Number(o.total_price), 0) || 0;

    const rentalsRevenue =
      rentals.data?.reduce((sum, r) => sum + Number(r.total_cost), 0) || 0;

    const expertChatsRevenue =
      expertChats.data?.reduce((sum, r) => sum + Number(r.amount) * 0.1, 0) || 0;

    res.json({
      totalUsers: usersCount.count,
      pendingExperts: pendingExpertsCount.count,
      totalProducts: productsCount.count,
      activeRentals: activeRentalsCount.count,
      totalPlatformGain: salesRevenue + rentalsRevenue + expertChatsRevenue,
      revenue: {
        sales: salesRevenue,
        rentals: rentalsRevenue,
        expertChats: expertChatsRevenue
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to load dashboard stats" });
  }
};

/* =====================================================
   PENDING EXPERTS TABLE
===================================================== */
export const getPendingExperts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("experts")
      .select(`
        id,
        specialization,
        experience_years,
        chat_price,
        status,
        created_at,
        farmer:farmer_id (
          id,
          name,
          email,
          city,
          avatar
        )
      `)
      .eq("status", "pending");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Pending experts error:", error);
    res.status(500).json({ message: "Failed to load pending experts" });
  }
};

/* =====================================================
   APPROVE EXPERT
===================================================== */
export const approveExpert = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: expert, error } = await supabase
      .from("experts")
      .update({
        status: "approved",
        approved_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("id,farmer_id,specialization,experience_years")
      .single();

    if (error) throw error;

    if (expert && expert.farmer_id) {
      await supabase
        .from("farmer")
        .update({
          is_expert: true,
          expert_verified: true,
          expert_verified_at: new Date().toISOString(),
          expert_field: expert.specialization || null,
          expert_years: expert.experience_years || null
        })
        .eq("id", expert.farmer_id);
    }

    res.json({ success: true, message: "Expert approved successfully" });
  } catch (error) {
    console.error("Approve expert error:", error);
    res.status(500).json({ message: "Failed to approve expert" });
  }
};

/* =====================================================
   REJECT EXPERT
===================================================== */
export const rejectExpert = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: expert, error } = await supabase
      .from("experts")
      .update({ status: "rejected" })
      .eq("id", id)
      .select("id,farmer_id")
      .single();

    if (error) throw error;

    if (expert && expert.farmer_id) {
      await supabase
        .from("farmer")
        .update({
          is_expert: false,
          expert_verified: false,
          expert_verified_at: null
        })
        .eq("id", expert.farmer_id);
    }

    res.json({ success: true, message: "Expert rejected" });
  } catch (error) {
    console.error("Reject expert error:", error);
    res.status(500).json({ message: "Failed to reject expert" });
  }
};

/* =====================================================
   RECENT ACTIVITY FEED
===================================================== */
export const getRecentActivity = async (req, res) => {
  try {
    const posts = await supabase
      .from("posts")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(4);

    const rentals = await supabase
      .from("store_rentals")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(2);

    const activity = [];

    posts.data?.forEach(p =>
      activity.push({
        action: "New community post",
        details: p.content.slice(0, 60),
        time: p.created_at,
        type: "post"
      })
    );

    rentals.data?.forEach(r =>
      activity.push({
        action: "New rental started",
        details: `Rental ID #${r.id}`,
        time: r.created_at,
        type: "rental"
      })
    );

    res.json(activity.slice(0, 6));
  } catch (error) {
    console.error("Activity error:", error);
    res.status(500).json({ message: "Failed to load activity" });
  }
};

/* =====================================================
   SYSTEM ALERTS
===================================================== */
export const getSystemAlerts = async (req, res) => {
  try {
    const { data } = await supabase
      .from("store_rentals")
      .select("id, end_date")
      .lt("end_date", new Date().toISOString())
      .eq("status", "active");

    const alerts = [];

    if (data.length > 0) {
      alerts.push({
        type: "overdue",
        message: `${data.length} rentals overdue`
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error("Alerts error:", error);
    res.status(500).json({ message: "Failed to load alerts" });
  }
};
export const getUsers = async (req, res) => {
  try {
    const { role = "all", status = "all", q, sort = "newest" } = req.query;

    // Base user fetch
    let query = supabase
      .from("farmer")
      .select("id,name,email,city,village,created_at,status,avatar,is_expert,expert_verified,expert_verified_at,expert_field,expert_years");

    if (status && status !== "all" && status !== "pending") query = query.eq("status", status);

    if (q && q.trim()) {
      const s = q.trim();
      query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,city.ilike.%${s}%,village.ilike.%${s}%`);
    }

    // Sort
    query = query.order("created_at", { ascending: sort === "oldest" });

    const { data: users, error } = await query;
    if (error) throw error;
    if (!users || users.length === 0) {
      return res.json([]);
    }

    const userIds = users.map(u => u.id);
    const expertQuery = supabase
      .from("experts")
      .select("id,farmer_id,specialization,experience_years,status,approved_at")
      .in("farmer_id", userIds);

    if (status === "pending") expertQuery.eq("status", "pending");

    const { data: expertRows, error: expertError } = await expertQuery;
    if (expertError) throw expertError;

    const expertsByFarmer = new Map((expertRows || []).map((row) => [row.farmer_id, row]));

    let scopedUsers = users;
    if (role === "expert") {
      scopedUsers = scopedUsers.filter(
        (u) => expertsByFarmer.has(u.id) || u.is_expert || u.expert_verified
      );
    } else if (role === "farmer") {
      scopedUsers = scopedUsers.filter(
        (u) => !(expertsByFarmer.has(u.id) || u.is_expert || u.expert_verified)
      );
    }

    if (status === "pending") {
      scopedUsers = scopedUsers.filter((u) => {
        const exp = expertsByFarmer.get(u.id);
        return exp && exp.status === "pending";
      });
    }

    if (scopedUsers.length === 0) {
      return res.json([]);
    }

    // Stats per user (counts)
    // NOTE: You can optimize later using RPC/views.
    const ids = scopedUsers.map(u => u.id);
    const safeSelect = (table, cols, key) =>
      ids.length ? supabase.from(table).select(cols).in(key, ids) : Promise.resolve({ data: [] });
    const [posts, orders, rentals, listings, reports, purchases] = await Promise.all([
      safeSelect("posts", "id,author_id", "author_id"),
      safeSelect("store_orders", "id,buyer_id", "buyer_id"),
      safeSelect("store_rentals", "id,renter_id", "renter_id"),
      safeSelect("store_items", "id,farmer_id", "farmer_id"),
      safeSelect("user_reports", "id,target_id,status,reason,description,created_at", "target_id")
        .then((res) => ({
          data: (res.data || []).filter((r) => r.status === "open"),
        })),
      ids.length
        ? supabase
            .from("expert_chat_purchases")
            .select("expert_farmer_id,buyer_id,expires_at,status")
            .in("expert_farmer_id", ids)
        : Promise.resolve({ data: [] }),
    ]);

    const countBy = (rows, key) =>
      (rows?.data || []).reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] || 0) + 1), acc), {});

    const postsC = countBy(posts, "author_id");
    const ordersC = countBy(orders, "buyer_id");
    const rentalsC = countBy(rentals, "renter_id");
    const listingsC = countBy(listings, "farmer_id");
    const reportsList = reports?.data || [];
    const reportsC = countBy(reports, "target_id");
    const reportsByTarget = reportsList.reduce((acc, report) => {
      if (!acc[report.target_id]) acc[report.target_id] = [];
      acc[report.target_id].push(report);
      return acc;
    }, {});
    const now = Date.now();
    const subscriptionsByExpert = new Map();
    (purchases?.data || []).forEach((row) => {
      if (row.status !== "paid") return;
      if (row.expires_at && new Date(row.expires_at).getTime() <= now) return;
      const expertId = row.expert_farmer_id;
      if (!expertId) return;
      const buyerId = row.buyer_id ?? row.buyerId ?? null;
      if (buyerId == null) return;
      const current = subscriptionsByExpert.get(expertId) || new Set();
      current.add(String(buyerId));
      subscriptionsByExpert.set(expertId, current);
    });

    const mapped = scopedUsers.map(u => {
      const exp = expertsByFarmer.get(u.id);
      const isExpert = !!exp || u.is_expert || u.expert_verified;
      const expertStatus = exp?.status || (u.expert_verified ? "approved" : u.is_expert ? "pending" : null);
      const expertVerifiedAt = exp?.approved_at || u.expert_verified_at || null;
      const tags = [];
      if (expertStatus === "approved" || u.expert_verified) tags.push("Verified Expert");
      if ((reportsC[u.id] || 0) > 0) tags.push("Reported");

      return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: null,
      role: isExpert ? "expert" : "farmer",
      status: u.status,
      expertStatus,
      expertId: exp?.id || null,
      expertVerifiedAt,
      location: u.city || u.village || "",
      joinedAt: u.created_at,
      lastActiveAt: null,
      tags,
      stats: {
        posts: postsC[u.id] || 0,
        orders: ordersC[u.id] || 0,
        rentals: rentalsC[u.id] || 0,
        listings: listingsC[u.id] || 0,
        reports: reportsC[u.id] || 0,
        subscriptions: subscriptionsByExpert.get(u.id)?.size || 0
      },
      reports: (reportsByTarget[u.id] || []).map((report) => ({
        id: report.id,
        reason: report.reason,
        description: report.description,
        createdAt: report.created_at
      }))
    };
  });

    res.json(mapped);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ message: "Failed to load users" });
  }
};
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // active|suspended|banned

    if (!["active", "suspended", "banned"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const { error } = await supabase
      .from("farmer")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("updateUserStatus error:", err);
    res.status(500).json({ message: "Failed to update user status" });
  }
};
export const reportUser = async (req, res) => {
  try {
    const reporterId = req.user.id;          // from auth middleware
    const { id: targetId } = req.params;
    const { reason, description } = req.body || {};

    if (Number(reporterId) === Number(targetId)) {
      return res.status(400).json({ message: "You can't report yourself" });
    }

    const { data, error } = await supabase
      .from("user_reports")
      .insert([{
        reporter_id: reporterId,
        target_type: "user",
        target_id: targetId,
        reason: reason || "",
        description: description || null
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, report: data });
  } catch (err) {
    console.error("reportUser error:", err);
    res.status(500).json({ message: "Failed to submit report" });
  }
};

export const getExpertSubscriptions = async (req, res) => {
  try {
    const expertId = Number(req.params.id);
    if (!Number.isFinite(expertId)) {
      return res.status(400).json({ message: "Invalid expert id" });
    }

    const { data, error } = await supabase
      .from("expert_chat_purchases")
      .select(
        "buyer_id, paid_at, expires_at, amount, status, buyer:buyer_id (id, name, email, avatar, city, village)"
      )
      .eq("expert_farmer_id", expertId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false });

    if (error) throw error;

    const now = Date.now();
    const active = (data || []).filter(
      (row) =>
        !row.expires_at || new Date(row.expires_at).getTime() > now
    );

    const byBuyer = new Map();
    active.forEach((row) => {
      const buyerId = row.buyer_id;
      if (!buyerId) return;
      const existing = byBuyer.get(buyerId);
      if (!existing) {
        byBuyer.set(buyerId, row);
        return;
      }
      const existingPaid = new Date(existing.paid_at).getTime();
      const nextPaid = new Date(row.paid_at).getTime();
      if (!Number.isNaN(nextPaid) && nextPaid > existingPaid) {
        byBuyer.set(buyerId, row);
      }
    });

    const list = Array.from(byBuyer.values()).map((row) => ({
      id: row.buyer?.id ?? row.buyer_id,
      name: row.buyer?.name || "User",
      email: row.buyer?.email || null,
      avatar: row.buyer?.avatar || null,
      city: row.buyer?.city || null,
      village: row.buyer?.village || null,
      paid_at: row.paid_at || null,
      expires_at: row.expires_at || null,
      amount: row.amount || null,
    }));

    res.json(list);
  } catch (err) {
    console.error("getExpertSubscriptions error:", err);
    res.status(500).json({ message: "Failed to load subscriptions" });
  }
};

export const getVerificationRequests = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("expert_verification_requests")
      .select(`
        id,
        farmer_id,
        expertise_field,
        years_of_experience,
        status,
        reviewed_by,
        reviewed_at,
        rejection_reason,
        created_at,
        farmer:farmer_id (
          id,
          name,
          email,
          avatar,
          city,
          village
        ),
        documents:expert_verification_documents (
          id,
          doc_type,
          file_url,
          file_name,
          mime_type,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("getVerificationRequests error:", error);
    res.status(500).json({ message: "Failed to load verification requests" });
  }
};

export const approveVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id || null;

    const { data: requestRow, error: reqError } = await supabase
      .from("expert_verification_requests")
      .update({
        status: "approved",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null
      })
      .eq("id", id)
      .select()
      .single();

    if (reqError) throw reqError;

    await supabase
      .from("farmer")
      .update({
        is_expert: true,
        expert_verified: true,
        expert_verified_at: new Date().toISOString(),
        expert_field: requestRow.expertise_field,
        expert_years: requestRow.years_of_experience
      })
      .eq("id", requestRow.farmer_id);

    await supabase
      .from("experts")
      .upsert([{
        farmer_id: requestRow.farmer_id,
        specialization: requestRow.expertise_field,
        experience_years: requestRow.years_of_experience,
        status: "approved",
        approved_at: new Date().toISOString()
      }], { onConflict: "farmer_id" });

    res.json({ success: true });
  } catch (error) {
    console.error("approveVerification error:", error);
    res.status(500).json({ message: "Failed to approve verification" });
  }
};

export const rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const reviewerId = req.user?.id || null;

    const { data: requestRow, error: reqError } = await supabase
      .from("expert_verification_requests")
      .update({
        status: "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null
      })
      .eq("id", id)
      .select()
      .single();

    if (reqError) throw reqError;

    await supabase
      .from("experts")
      .update({ status: "rejected" })
      .eq("farmer_id", requestRow.farmer_id);

    res.json({ success: true });
  } catch (error) {
    console.error("rejectVerification error:", error);
    res.status(500).json({ message: "Failed to reject verification" });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from("store_orders")
      .select("id,buyer_id,total_price,payment_method,status,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const orderList = orders || [];
    const orderIds = orderList
      .map((o) => Number(o.id))
      .filter((id) => Number.isFinite(id));

    if (orderIds.length === 0) {
      return res.json([]);
    }

    const { data: orderItems, error: itemsErr } = await supabase
      .from("store_order_items")
      .select("id,order_id,item_id,quantity,price_each")
      .in("order_id", orderIds);

    if (itemsErr) throw itemsErr;

    const orderItemList = orderItems || [];
    if (orderItemList.length === 0) {
      return res.json([]);
    }

    const itemIds = [
      ...new Set(
        orderItemList
          .map((oi) => Number(oi.item_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];

    const { data: items, error: itemsError } = await supabase
      .from("store_items")
      .select("id,name,image_url,farmer_id,price_unit")
      .in("id", itemIds);

    if (itemsError) throw itemsError;

    const itemMap = new Map(
      (items || []).map((item) => [Number(item.id), item])
    );

    const orderMap = new Map(
      orderList.map((order) => [Number(order.id), order])
    );

    const buyerIds = [
      ...new Set(
        orderList
          .map((order) => Number(order.buyer_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];
    const sellerIds = [
      ...new Set(
        (items || [])
          .map((item) => Number(item.farmer_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];
    const farmerIds = [...new Set([...buyerIds, ...sellerIds])];
    let farmerMap = new Map();

    if (farmerIds.length > 0) {
      const { data: farmers, error: farmerErr } = await supabase
        .from("farmer")
        .select("id,name,email")
        .in("id", farmerIds);

      if (farmerErr) throw farmerErr;
      farmerMap = new Map(
        (farmers || []).map((farmer) => [Number(farmer.id), farmer])
      );
    }

    const rows = orderItemList
      .map((orderItem) => {
        const order = orderMap.get(Number(orderItem.order_id)) || {};
        const item = itemMap.get(Number(orderItem.item_id)) || null;
        const buyer = farmerMap.get(Number(order.buyer_id)) || null;
        const seller = farmerMap.get(Number(item.farmer_id)) || null;

        return {
          id: orderItem.id,
          order_id: orderItem.order_id,
          status: order.status,
          payment_method: order.payment_method,
          created_at: order.created_at,
          total_price: order.total_price,
          quantity: orderItem.quantity,
          price_each: orderItem.price_each,
          item: item
            ? {
                id: item.id,
                name: item.name,
                image_url: item.image_url,
                price_unit: item.price_unit,
              }
            : null,
          buyer,
          seller,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

    res.json(rows);
  } catch (error) {
    console.error("getAdminOrders error:", error);
    res.status(500).json({ message: "Failed to load orders" });
  }
};

export const getAdminRentals = async (req, res) => {
  try {
    const { data: rentals, error } = await supabase
      .from("store_rentals")
      .select(
        "id,renter_id,item_id,start_date,end_date,total_cost,status,created_at,returned_at,late,late_fee,damage_note,damage_fee"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rentalList = rentals || [];
    if (rentalList.length === 0) {
      return res.json([]);
    }

    const itemIds = [
      ...new Set(
        rentalList
          .map((rental) => Number(rental.item_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];

    const { data: items, error: itemsError } = await supabase
      .from("store_items")
      .select("id,name,image_url,farmer_id,rent_price_per_day,price_unit")
      .in("id", itemIds);

    if (itemsError) throw itemsError;

    const itemMap = new Map(
      (items || []).map((item) => [Number(item.id), item])
    );

    const renterIds = [
      ...new Set(
        rentalList
          .map((rental) => Number(rental.renter_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];
    const sellerIds = [
      ...new Set(
        (items || [])
          .map((item) => Number(item.farmer_id))
          .filter((id) => Number.isFinite(id))
      ),
    ];
    const farmerIds = [...new Set([...renterIds, ...sellerIds])];
    let farmerMap = new Map();

    if (farmerIds.length > 0) {
      const { data: farmers, error: farmerErr } = await supabase
        .from("farmer")
        .select("id,name,email")
        .in("id", farmerIds);

      if (farmerErr) throw farmerErr;
      farmerMap = new Map(
        (farmers || []).map((farmer) => [Number(farmer.id), farmer])
      );
    }

    const rows = rentalList
      .map((rental) => {
        const item = itemMap.get(Number(rental.item_id)) || null;
        const renter = farmerMap.get(Number(rental.renter_id)) || null;
        const seller = farmerMap.get(Number(item.farmer_id)) || null;

        return {
          id: rental.id,
          status: rental.status,
          created_at: rental.created_at,
          start_date: rental.start_date,
          end_date: rental.end_date,
          total_cost: rental.total_cost,
          returned_at: rental.returned_at,
          late: rental.late,
          late_fee: rental.late_fee,
          damage_note: rental.damage_note,
          damage_fee: rental.damage_fee,
          item: item
            ? {
                id: item.id,
                name: item.name,
                image_url: item.image_url,
                rent_price_per_day: item.rent_price_per_day,
                price_unit: item.price_unit,
              }
            : null,
          renter,
          seller,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

    res.json(rows);
  } catch (error) {
    console.error("getAdminRentals error:", error);
    res.status(500).json({ message: "Failed to load rentals" });
  }
};

export const getReports = async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from("user_reports")
      .select(`
        id,
        reporter_id,
        target_type,
        target_id,
        reason,
        description,
        status,
        admin_note,
        created_at,
        resolved_at,
        reporter:reporter_id (
          id,
          name,
          email,
          avatar
        )
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("getReports error:", error);
    res.status(500).json({ message: "Failed to load reports" });
  }
};

export const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = "resolved", adminNote } = req.body || {};
    const allowed = ["resolved", "dismissed", "reviewing"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const { error } = await supabase
      .from("user_reports")
      .update({
        status,
        admin_note: adminNote || null,
        resolved_at: status === "resolved" || status === "dismissed" ? new Date().toISOString() : null
      })
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("resolveReport error:", error);
    res.status(500).json({ message: "Failed to update report" });
  }
};
