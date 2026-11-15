const mongoose = require("mongoose");

const messageModel = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    messageType: { type: String, default: "text" },
    fileUrl: { type: String, default: null },
    replyTo: { type: Object, default: null },
    reactions: { type: Object, default: {} },
    isDeleted: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    isEncrypted: { type: Boolean, default: false },
    status: { type: String, default: "sent" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageModel);
module.exports = Message;
