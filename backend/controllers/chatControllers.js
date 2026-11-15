const asyncHandler = require("express-async-handler");
const storageService = require("../services/storageService.js");

const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).send({ message: "UserId param not sent with request" });
  }

  try {
    const chat = await storageService.accessDirectChat(req.user._id, userId);
    res.status(200).send(chat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const fetchChats = asyncHandler(async (req, res) => {
  try {
    const chats = await storageService.getUserChats(req.user._id);
    res.status(200).send(chats);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Please fill all the fields" });
  }

  let users = req.body.users;
  if (typeof users === "string") {
    try {
      users = JSON.parse(users);
    } catch (e) {
      return res.status(400).send({ message: "Invalid users format" });
    }
  }

  if (!Array.isArray(users) || users.length < 2) {
    return res
      .status(400)
      .send({ message: "Select at least 2 other people for a group chat." });
  }

  try {
    const fullGroupChat = await storageService.createGroupChat({
      name: req.body.name,
      users: users,
      groupAdminId: req.user._id,
    });

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  if (!chatId || !chatName) {
    return res.status(400).send({ message: "chatId and chatName are required" });
  }

  try {
    const updatedChat = await storageService.renameGroupChat(chatId, chatName);
    res.json(updatedChat);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }
});

const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    return res.status(400).send({ message: "chatId and userId are required" });
  }

  try {
    const added = await storageService.addToGroup(chatId, userId);
    res.json(added);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }
});

const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    return res.status(400).send({ message: "chatId and userId are required" });
  }

  try {
    const removed = await storageService.removeFromGroup(chatId, userId);
    res.json(removed);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }
});

const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  try {
    await storageService.deleteChat(chatId, req.user._id);
    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message || "Failed to delete chat");
  }
});

const updateDisappearingTimer = asyncHandler(async (req, res) => {
  const { chatId, disappearingTimer } = req.body;

  if (!chatId || disappearingTimer === undefined) {
    return res.status(400).send({ message: "chatId and disappearingTimer are required" });
  }

  try {
    const updated = await storageService.updateChatDisappearing({
      chatId,
      disappearingTimer: Number(disappearingTimer),
    });

    const io = req.app.get("io");
    if (io) {
      io.to(String(chatId)).emit("chat:disappearing-updated", {
        chatId,
        disappearingTimer: Number(disappearingTimer),
        updatedBy: req.user.name,
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  deleteChat,
  updateDisappearingTimer,
};
