const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Get messages for a specific room
router.get("/messages/:room", isAuthenticated, async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

module.exports = router;
