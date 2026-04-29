import express from "express";
import auth from "../middleware/authMiddleware.js";
import {
  getAllItems,
  getSingleItem,
  createItem,
  updateItem,
  deleteItem,
  createOrder,
  rentItem,
  getUserOrders,
  getUserRentals,
  getItemRentals,
  getUserItems, 
  getSellerOrders ,
    addToCart,
  getCart,
  updateCart,
  removeCartItem
   , updateOrderStatus
  ,getSellerRentals
  ,updateRentalStatus,
  getProductQuestions,
  addProductQuestion,
  addProductAnswer
}
   from "../controllers/storeController.js";


const router = express.Router();

// PUBLIC
router.get("/items", getAllItems);
router.get("/items/:id", getSingleItem);

// USER-OWNED ITEMS
router.get("/items/user/:id", getUserItems);   

// CRUD ITEM
router.post("/items", createItem);
router.put("/items/:id", updateItem);
router.delete("/items/:id", deleteItem);

// PRODUCT Q&A
router.get("/items/:id/questions", getProductQuestions);
router.post("/items/:id/questions", auth, addProductQuestion);
router.post("/questions/:id/answers", auth, addProductAnswer);

// ORDERS
router.post("/orders", createOrder);
router.get("/orders/user/:id", getUserOrders);

// RENTALS
router.post("/rent", rentItem);
router.get("/rentals/user/:id", getUserRentals);
router.get("/rentals/item/:id", getItemRentals);
router.get("/orders/seller/:id", getSellerOrders);
// CART ROUTES
router.get("/cart", getCart); // supports ?user_id=123
router.post("/cart", addToCart);
router.get("/cart/:id", getCart);
router.get("/cart/user/:id", getCart); // alias for compatibility
router.put("/cart/:id", updateCart);
router.delete("/cart/:id", removeCartItem);
router.put("/orders/:id/status", updateOrderStatus);
router.get("/rentals/seller/:id", getSellerRentals);
router.put("/rentals/:id/status", updateRentalStatus);


export default router;
