const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order route
app.post("/api/create-order", async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const options = {
    amount: amount * 100, // amount in paise
    currency: "INR",
    payment_capture: 1,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create order" });
  }
});

// Webhook route to verify payment signature
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(req.body);
  const digest = shasum.digest("hex");

  const signature = req.headers["x-razorpay-signature"];

  if (digest === signature) {
    const payload = JSON.parse(req.body);
    if (payload.event === "payment.captured") {
      console.log("Payment captured:", payload.payload.payment.entity);
      // You can update DB or send confirmation here
    }
    res.status(200).json({ status: "ok" });
  } else {
    res.status(400).json({ status: "Invalid signature" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
