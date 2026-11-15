import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";
import { getBackendUrl } from "../config/api.js";

const ChatContext = createContext();

let socket;

const ChatProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [selectedChat, setSelectedChat] = useState();
  const [chats, setChats] = useState([]);
  const [notification, setNotification] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("chatme_theme");
    return saved ? saved === "dark" : true; // WhatsApp dark mode by default
  });

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

  // Global socket for presence & notifications
  useEffect(() => {
    if (!user?._id) return;

    socket = io(apiUrl);
    socket.emit("setup", user);

    socket.on("online users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("user online", (userId) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    socket.on("user offline", (userId) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      socket.disconnect();
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
