import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";
import { getBackendUrl } from "../config/api.js";

const ChatContext = createContext();

let socket;

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // AudioContext blocked or not allowed yet
  }
};

const ChatProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [selectedChat, setSelectedChat] = useState();
  const [chats, setChats] = useState([]);
  const [notification, setNotification] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("chatme_theme");
    return saved ? saved === "dark" : true; // WhatsApp dark mode by default
  });

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = getBackendUrl();

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("chatme_theme", next ? "dark" : "light");
      return next;
    });
  };

  useEffect(() => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      setUser(userInfo);

      if (!userInfo && location.pathname !== "/") {
        navigate("/");
      }
    } catch (err) {
      localStorage.removeItem("userInfo");
      navigate("/");
    }
  }, [navigate, location.pathname]);

  // Global socket for presence & live notifications
  useEffect(() => {
    if (!user?._id) return;

    if (!socket) {
      socket = io(apiUrl);
    }

    socket.emit("setup", user);

    socket.on("connected", () => setSocketConnected(true));

    socket.on("online users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("user online", (userId) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    socket.on("user offline", (userId) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    // Global Message Receiver: updates notification badge & chats list even when chat is not open
    const handleGlobalMessage = (newMessageRecieved) => {
      const activeChat = selectedChatRef.current;
      const incomingChatId = newMessageRecieved.chat?._id || newMessageRecieved.chat;

      // Update chats list with latest message
      setChats((prevChats) =>
        prevChats.map((c) =>
          String(c._id) === String(incomingChatId)
            ? { ...c, latestMessage: newMessageRecieved, updatedAt: new Date().toISOString() }
            : c
        )
      );

      // If user is NOT viewing this incoming chat, add notification & play sound
      if (!activeChat || String(activeChat._id) !== String(incomingChatId)) {
        setNotification((prev) => {
          if (!prev.some((n) => n._id === newMessageRecieved._id)) {
            playNotificationSound();
            return [newMessageRecieved, ...prev];
          }
          return prev;
        });
      }
    };

    socket.on("message recieved", handleGlobalMessage);

    return () => {
      socket.off("message recieved", handleGlobalMessage);
    };
  }, [user, apiUrl]);

  return (
    <ChatContext.Provider
      value={{
        user,
        setUser,
        selectedChat,
        setSelectedChat,
        chats,
        setChats,
        notification,
        setNotification,
        onlineUsers,
        darkMode,
        toggleDarkMode,
        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
