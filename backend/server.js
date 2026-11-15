const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const colors = require("colors");

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

const connectDB = require("./config/db.js");
const storageService = require("./services/storageService.js");
const userRoutes = require("./routes/userRoutes.js");
const chatRoutes = require("./routes/chatRoutes.js");
const messageRoutes = require("./routes/messageRoutes.js");
const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");

const app = express();

// Connect DB (handles errors gracefully without crashing)
connectDB();

// Enable CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://chatme-frontend.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow dev origins gracefully
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// Health check and mode status
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "ChatMe API is running successfully",
    storageMode: storageService.getMode(),
  });
});

// Middleware for handling errors
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

const server = app.listen(
  PORT,
  () => {
    console.log(`Server started on port ${PORT}`.yellow.bold);
    console.log(`Active Storage Mode: ${storageService.getMode().toUpperCase()}`.cyan.bold);
  }
);

// Socket.io setup
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory online presence tracking (0 Redis commands used)
const onlineUsers = new Map(); // socket.id -> userId

io.on("connection", (socket) => {
  // Handles user setup and room creation
  socket.on("setup", (userData) => {
    if (userData && userData._id) {
      socket.join(userData._id);
      onlineUsers.set(socket.id, userData._id);
      socket.emit("connected");

      // Broadcast and synchronize online users
      const activeIds = Array.from(new Set(onlineUsers.values()));
      socket.emit("online users", activeIds);
      socket.broadcast.emit("user online", userData._id);
    }
  });

  // Handles user joining a chat room
  socket.on("join chat", (room) => {
    if (room) {
      socket.join(room);
    }
  });

  // Emits typing status to the room
  socket.on("typing", (room) => {
    if (room) socket.in(room).emit("typing", room);
  });
  socket.on("stop typing", (room) => {
    if (room) socket.in(room).emit("stop typing", room);
  });

  // Handles message delivery and read receipts
  socket.on("read message", ({ chatId, messageId, readerId }) => {
    if (chatId) {
      socket.in(chatId).emit("message read", { chatId, messageId, readerId });
    }
  });

  // Handles real-time emoji reactions
  socket.on("message reaction", ({ chatId, messageId, emoji, userId }) => {
    if (chatId) {
      socket.in(chatId).emit("message reaction", { messageId, emoji, userId });
    }
  });

  // Handles real-time message deletion
  socket.on("delete message", ({ chatId, messageId }) => {
    if (chatId) {
      socket.in(chatId).emit("delete message", { messageId });
    }
  });

  // Handles receiving a new message and notifying users in the chat
  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved && newMessageRecieved.chat;
    if (!chat || !chat.users) return;

    chat.users.forEach((user) => {
      const userId = typeof user === "object" ? user._id : user;
      const senderId =
        typeof newMessageRecieved.sender === "object"
          ? newMessageRecieved.sender._id
          : newMessageRecieved.sender;

      if (String(userId) === String(senderId)) return;
      socket.in(userId).emit("message recieved", newMessageRecieved);
    });
  });

  socket.on("disconnect", () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      onlineUsers.delete(socket.id);
      const isStillConnected = Array.from(onlineUsers.values()).includes(userId);
      if (!isStillConnected) {
        socket.broadcast.emit("user offline", userId);
      }
    }
  });
});
