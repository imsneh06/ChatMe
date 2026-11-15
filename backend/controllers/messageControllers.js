const asyncHandler = require("express-async-handler");
const storageService = require("../services/storageService.js");

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, messageType, fileUrl, replyTo } = req.body;

  if ((!content && !fileUrl) || !chatId) {
    return res.status(400).send({ message: "Invalid message data" });
  }

  try {
    const message = await storageService.createMessage({
      senderId: req.user._id,
      content,
      chatId,
      messageType: messageType || "text",
      fileUrl: fileUrl || null,
      replyTo: replyTo || null,
    });
    res.json(message);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }
});

const allMessages = asyncHandler(async (req, res) => {
  if (!req.params.chatId) {
    return res.status(400).send({ message: "chatId parameter missing" });
  }

  try {
    const messages = await storageService.getChatMessages(req.params.chatId);
    res.json(messages);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }
});

module.exports = { sendMessage, allMessages };
