const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/UserModel.js");
const Chat = require("../models/chatModel.js");
const Message = require("../models/MessageModel.js");

let Redis = null;
try {
  Redis = require("@upstash/redis").Redis;
} catch (e) {
  // @upstash/redis optional if not installed
}

class StorageService {
  constructor() {
    this.memoryUsers = new Map();
    this.memoryUsersByEmail = new Map();
    this.memoryChats = new Map();
    this.memoryMessages = new Map();
    this.memoryChatMessages = new Map();
    this.upstashClient = null;

    this.initUpstash();
    this.seedMemoryData();
  }

  initUpstash() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token && Redis) {
      try {
        this.upstashClient = new Redis({ url, token });
        console.log("Upstash Redis client initialized successfully.".green.bold);
      } catch (err) {
        console.log(`Failed to initialize Upstash Redis: ${err.message}`.red);
      }
    }
  }

  getMode() {
    if (this.upstashClient || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)) {
      if (!this.upstashClient && Redis) {
        this.initUpstash();
      }
      if (this.upstashClient) return "upstash";
    }
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      return "mongodb";
    }
    return "memory";
  }

  async seedMemoryData() {
    const defaultUsers = [
      {
        _id: "user_guest_1",
        name: "Guest User",
        email: "guest@example.com",
        password: "password123",
        pic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      },
      {
        _id: "user_narayan_2",
        name: "Narayan Dutta",
        email: "narayan@example.com",
        password: "password123",
        pic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      },
      {
        _id: "user_alex_3",
        name: "Alex Johnson",
        email: "alex@example.com",
        password: "password123",
        pic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      },
    ];

    for (const u of defaultUsers) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);
      const userObj = {
        _id: u._id,
        name: u.name,
        email: u.email.toLowerCase(),
        password: hashedPassword,
        pic: u.pic,
        createdAt: new Date().toISOString(),
      };
      this.memoryUsers.set(u._id, userObj);
      this.memoryUsersByEmail.set(u.email.toLowerCase(), u._id);
    }
  }

  async verifyPassword(enteredPassword, storedHashedPassword) {
    if (!enteredPassword || !storedHashedPassword) return false;
    return await bcrypt.compare(enteredPassword, storedHashedPassword);
  }

  // ================= USERS =================

  async createUser({ name, email, password, pic }) {
    const mode = this.getMode();
    const cleanEmail = email.toLowerCase().trim();

    if (mode === "mongodb") {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        const error = new Error("User Already Exists");
        error.statusCode = 400;
        throw error;
      }
      const user = await User.create({
        name,
        email: cleanEmail,
        password,
        pic: pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      });
      return {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        pic: user.pic,
      };
    }

    if (mode === "upstash") {
      const existingId = await this.upstashClient.get(`user:email:${cleanEmail}`);
      if (existingId) {
        const error = new Error("User Already Exists");
        error.statusCode = 400;
        throw error;
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const userId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const userObj = {
        _id: userId,
        name,
        email: cleanEmail,
        password: hashedPassword,
        pic: pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
        createdAt: new Date().toISOString(),
      };

      await this.upstashClient.set(`user:${userId}`, JSON.stringify(userObj));
      await this.upstashClient.set(`user:email:${cleanEmail}`, userId);
      await this.upstashClient.sadd("users:all", userId);

      return {
        _id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        pic: userObj.pic,
      };
    }

    // Memory mode
    if (this.memoryUsersByEmail.has(cleanEmail)) {
      const error = new Error("User Already Exists");
      error.statusCode = 400;
      throw error;
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const userObj = {
      _id: userId,
      name,
      email: cleanEmail,
      password: hashedPassword,
      pic: pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      createdAt: new Date().toISOString(),
    };
    this.memoryUsers.set(userId, userObj);
    this.memoryUsersByEmail.set(cleanEmail, userId);

    return {
      _id: userObj._id,
      name: userObj.name,
      email: userObj.email,
      pic: userObj.pic,
    };
  }

  async findUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    const mode = this.getMode();

    if (mode === "mongodb") {
      const user = await User.findOne({ email: cleanEmail });
      return user;
    }

    if (mode === "upstash") {
      const userId = await this.upstashClient.get(`user:email:${cleanEmail}`);
      if (!userId) return null;
      const rawUser = await this.upstashClient.get(`user:${userId}`);
      return typeof rawUser === "string" ? JSON.parse(rawUser) : rawUser;
    }

    const userId = this.memoryUsersByEmail.get(cleanEmail);
    if (!userId) return null;
    return this.memoryUsers.get(userId) || null;
  }

  async findUserById(id) {
    if (!id) return null;
    const mode = this.getMode();

    if (mode === "mongodb") {
      const user = await User.findById(id).select("-password");
      return user ? {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        pic: user.pic,
      } : null;
    }

    if (mode === "upstash") {
      const rawUser = await this.upstashClient.get(`user:${id}`);
      if (!rawUser) return null;
      const user = typeof rawUser === "string" ? JSON.parse(rawUser) : rawUser;
      return {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        pic: user.pic,
      };
    }

    const user = this.memoryUsers.get(String(id));
    if (!user) return null;
    return {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      pic: user.pic,
    };
  }

  async searchUsers(searchQuery, currentUserId) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      const keyword = searchQuery
        ? {
            $or: [
              { name: { $regex: searchQuery, $options: "i" } },
              { email: { $regex: searchQuery, $options: "i" } },
            ],
          }
        : {};
      return await User.find(keyword)
        .find({ _id: { $ne: currentUserId } })
        .select("-password");
    }

    const currentIdStr = String(currentUserId);
    const query = (searchQuery || "").toLowerCase().trim();

    let allUsers = [];
    if (mode === "upstash") {
      const userIds = await this.upstashClient.smembers("users:all") || [];
      for (const uid of userIds) {
        const raw = await this.upstashClient.get(`user:${uid}`);
        if (raw) {
          allUsers.push(typeof raw === "string" ? JSON.parse(raw) : raw);
        }
      }
    } else {
      allUsers = Array.from(this.memoryUsers.values());
    }

    return allUsers
      .filter((u) => {
        if (String(u._id) === currentIdStr) return false;
        if (!query) return true;
        return (
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
        );
      })
      .map((u) => ({
        _id: String(u._id),
        name: u.name,
        email: u.email,
        pic: u.pic,
      }));
  }

  // ================= CHATS =================

  async accessDirectChat(currentUserId, targetUserId) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      let isChat = await Chat.find({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: currentUserId } } },
          { users: { $elemMatch: { $eq: targetUserId } } },
        ],
      })
        .populate("users", "-password")
        .populate("latestMessage");

      isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "name pic email",
      });

      if (isChat.length > 0) {
        return isChat[0];
      }

      const createdChat = await Chat.create({
        chatName: "sender",
        isGroupChat: false,
        users: [currentUserId, targetUserId],
      });

      return await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
    }

    const cId = String(currentUserId);
    const tId = String(targetUserId);
    const directKey = [cId, tId].sort().join(":");

    if (mode === "upstash") {
      const existingChatId = await this.upstashClient.get(`chat:direct:${directKey}`);
      if (existingChatId) {
        const raw = await this.upstashClient.get(`chat:${existingChatId}`);
        if (raw) return typeof raw === "string" ? JSON.parse(raw) : raw;
      }

      const user1 = await this.findUserById(cId);
      const user2 = await this.findUserById(tId);
      const chatId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const chatObj = {
        _id: chatId,
        chatName: "sender",
        isGroupChat: false,
        users: [user1, user2].filter(Boolean),
        latestMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.upstashClient.set(`chat:${chatId}`, JSON.stringify(chatObj));
      await this.upstashClient.set(`chat:direct:${directKey}`, chatId);
      await this.upstashClient.sadd(`user:chats:${cId}`, chatId);
      await this.upstashClient.sadd(`user:chats:${tId}`, chatId);

      return chatObj;
    }

    // Memory mode
    for (const chat of this.memoryChats.values()) {
      if (!chat.isGroupChat) {
        const uids = chat.users.map((u) => String(u._id));
        if (uids.includes(cId) && uids.includes(tId)) {
          return chat;
        }
      }
    }

    const user1 = await this.findUserById(cId);
    const user2 = await this.findUserById(tId);
    const chatId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const chatObj = {
      _id: chatId,
      chatName: "sender",
      isGroupChat: false,
      users: [user1, user2].filter(Boolean),
      latestMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memoryChats.set(chatId, chatObj);
    return chatObj;
  }

  async getUserChats(currentUserId) {
    const mode = this.getMode();
    const cId = String(currentUserId);

    if (mode === "mongodb") {
      const results = await Chat.find({
        users: { $elemMatch: { $eq: currentUserId } },
      })
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate("latestMessage")
        .sort({ updatedAt: -1 });

      return await User.populate(results, {
        path: "latestMessage.sender",
        select: "name pic email",
      });
    }

    if (mode === "upstash") {
      const chatIds = await this.upstashClient.smembers(`user:chats:${cId}`) || [];
      const chats = [];
      for (const cid of chatIds) {
        const raw = await this.upstashClient.get(`chat:${cid}`);
        if (raw) {
          chats.push(typeof raw === "string" ? JSON.parse(raw) : raw);
        }
      }
      return chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    // Memory mode
    const chats = Array.from(this.memoryChats.values()).filter((chat) =>
      chat.users.some((u) => String(u._id) === cId)
    );
    return chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async createGroupChat({ name, users, groupAdminId }) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      const groupChat = await Chat.create({
        chatName: name,
        users: [...users, groupAdminId],
        isGroupChat: true,
        groupAdmin: groupAdminId,
      });

      return await Chat.findOne({ _id: groupChat._id })
        .populate("users", "-password")
        .populate("groupAdmin", "-password");
    }

    const admin = await this.findUserById(groupAdminId);
    const resolvedUsers = [admin];

    for (const u of users) {
      const uid = typeof u === "object" ? u._id : u;
      if (String(uid) !== String(groupAdminId)) {
        const fullUser = await this.findUserById(uid);
        if (fullUser) resolvedUsers.push(fullUser);
      }
    }

    const chatId = `c_grp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const groupChatObj = {
      _id: chatId,
      chatName: name,
      isGroupChat: true,
      users: resolvedUsers,
      groupAdmin: admin,
      latestMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (mode === "upstash") {
      await this.upstashClient.set(`chat:${chatId}`, JSON.stringify(groupChatObj));
      for (const u of resolvedUsers) {
        await this.upstashClient.sadd(`user:chats:${u._id}`, chatId);
      }
      return groupChatObj;
    }

    this.memoryChats.set(chatId, groupChatObj);
    return groupChatObj;
  }

  async renameGroupChat(chatId, newName) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        { chatName: newName },
        { new: true }
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

      if (!updatedChat) {
        const error = new Error("Chat Not Found");
        error.statusCode = 404;
        throw error;
      }
      return updatedChat;
    }

    const chat = await this.getChatById(chatId);
    if (!chat) {
      const error = new Error("Chat Not Found");
      error.statusCode = 404;
      throw error;
    }

    chat.chatName = newName;
    chat.updatedAt = new Date().toISOString();

    if (mode === "upstash") {
      await this.upstashClient.set(`chat:${chatId}`, JSON.stringify(chat));
    } else {
      this.memoryChats.set(chatId, chat);
    }
    return chat;
  }

  async addToGroup(chatId, userId) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      const added = await Chat.findByIdAndUpdate(
        chatId,
        { $push: { users: userId } },
        { new: true }
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

      if (!added) {
        const error = new Error("Chat Not Found");
        error.statusCode = 404;
        throw error;
      }
      return added;
    }

    const chat = await this.getChatById(chatId);
    if (!chat) {
      const error = new Error("Chat Not Found");
      error.statusCode = 404;
      throw error;
    }

    const userToAdd = await this.findUserById(userId);
    if (!userToAdd) {
      const error = new Error("User Not Found");
      error.statusCode = 404;
      throw error;
    }

    if (!chat.users.some((u) => String(u._id) === String(userId))) {
      chat.users.push(userToAdd);
      chat.updatedAt = new Date().toISOString();

      if (mode === "upstash") {
        await this.upstashClient.set(`chat:${chatId}`, JSON.stringify(chat));
        await this.upstashClient.sadd(`user:chats:${userId}`, chatId);
      } else {
        this.memoryChats.set(chatId, chat);
      }
    }
    return chat;
  }

  async removeFromGroup(chatId, userId) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      const removed = await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { users: userId } },
        { new: true }
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

      if (!removed) {
        const error = new Error("Chat Not Found");
        error.statusCode = 404;
        throw error;
      }
      return removed;
    }

    const chat = await this.getChatById(chatId);
    if (!chat) {
      const error = new Error("Chat Not Found");
      error.statusCode = 404;
      throw error;
    }

    chat.users = chat.users.filter((u) => String(u._id) !== String(userId));
    chat.updatedAt = new Date().toISOString();

    if (mode === "upstash") {
      await this.upstashClient.set(`chat:${chatId}`, JSON.stringify(chat));
      await this.upstashClient.srem(`user:chats:${userId}`, chatId);
    } else {
      this.memoryChats.set(chatId, chat);
    }
    return chat;
  }

  async getChatById(chatId) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      return await Chat.findById(chatId)
        .populate("users", "-password")
        .populate("groupAdmin", "-password");
    }

    if (mode === "upstash") {
      const raw = await this.upstashClient.get(`chat:${chatId}`);
      if (!raw) return null;
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    }

    return this.memoryChats.get(String(chatId)) || null;
  }

  // ================= MESSAGES =================

  async createMessage({ senderId, content, chatId }) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      let message = await Message.create({
        sender: senderId,
        content,
        chat: chatId,
      });

      message = await message.populate("sender", "name pic email");
      message = await message.populate("chat");
      message = await User.populate(message, {
        path: "chat.users",
        select: "name pic email",
      });

      await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
      return message;
    }

    const sender = await this.findUserById(senderId);
    const chat = await this.getChatById(chatId);
    if (!chat) {
      const error = new Error("Chat not found");
      error.statusCode = 404;
      throw error;
    }

    const messageId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const messageObj = {
      _id: messageId,
      sender: {
        _id: sender._id,
        name: sender.name,
        pic: sender.pic,
        email: sender.email,
      },
      content,
      chat: {
        _id: chat._id,
        chatName: chat.chatName,
        isGroupChat: chat.isGroupChat,
        users: chat.users,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    chat.latestMessage = messageObj;
    chat.updatedAt = messageObj.updatedAt;

    if (mode === "upstash") {
      await this.upstashClient.set(`message:${messageId}`, JSON.stringify(messageObj));
      await this.upstashClient.rpush(`chat:messages:${chatId}`, messageId);
      await this.upstashClient.set(`chat:${chatId}`, JSON.stringify(chat));
      return messageObj;
    }

    // Memory mode
    this.memoryMessages.set(messageId, messageObj);
    if (!this.memoryChatMessages.has(chatId)) {
      this.memoryChatMessages.set(chatId, []);
    }
    this.memoryChatMessages.get(chatId).push(messageObj);
    this.memoryChats.set(chatId, chat);

    return messageObj;
  }

  async getChatMessages(chatId) {
    const mode = this.getMode();

    if (mode === "mongodb") {
      return await Message.find({ chat: chatId })
        .populate("sender", "name pic email")
        .populate("chat");
    }

    if (mode === "upstash") {
      const messageIds = await this.upstashClient.lrange(`chat:messages:${chatId}`, 0, -1) || [];
      const messages = [];
      for (const mid of messageIds) {
        const raw = await this.upstashClient.get(`message:${mid}`);
        if (raw) {
          messages.push(typeof raw === "string" ? JSON.parse(raw) : raw);
        }
      }
      return messages;
    }

    return this.memoryChatMessages.get(String(chatId)) || [];
  }
}

const storageService = new StorageService();
module.exports = storageService;

