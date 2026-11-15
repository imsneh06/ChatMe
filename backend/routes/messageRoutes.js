const express = require("express");
const {
  sendMessage,
  allMessages,
  deleteMessage,
  markRead,
} = require("../controllers/messageControllers.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/:chatId").get(protect, allMessages);
router.route("/read/:chatId").put(protect, markRead);
router.route("/:messageId").delete(protect, deleteMessage);

module.exports = router;
