import {
  Avatar,
  AvatarBadge,
  Box,
  CloseButton,
  FormControl,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import React, { useEffect, useState, useRef } from "react";
import {
  ArrowBackIcon,
  DeleteIcon,
} from "@chakra-ui/icons";
import {
  WaPhoneIcon,
  WaVideoIcon,
  WaClockIcon,
  WaSearchIcon,
  WaDeleteIcon,
  WaSmileyIcon,
  WaAttachIcon,
  WaSendIcon,
  WaMicIcon,
} from "./icons/WhatsAppIcons.jsx";
import { getSender, getSenderDetails } from "../config/ChatLogics.jsx";
import Profile from "./miscellaneous/Profile.jsx";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal.jsx";
import axios from "axios";
import "./Css/styles.css";
import ScrollableChat from "./ScrollableChat.jsx";
import io from "socket.io-client";
import { getBackendUrl } from "../config/api.js";
import { encryptE2EEMessage } from "../utils/crypto.js";

const apiUrl = getBackendUrl();

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const {
    user,
    selectedChat,
    setSelectedChat,
    notification,
    setNotification,
    onlineUsers,
    socket,
    startCall,
    e2eeKeys,
  } = ChatState();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const selectedChatCompareRef = useRef();
  const toast = useToast();

  const commonEmojis = ["😀", "😂", "❤️", "👍", "🔥", "🎉", "🙏", "😍", "👏", "😊"];

  const otherUser =
    selectedChat && !selectedChat.isGroupChat
      ? getSenderDetails(user, selectedChat.users)
      : null;
  const isOnline = otherUser && onlineUsers.includes(otherUser._id);

  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : messages;

  const fetchMessages = async () => {
    if (!selectedChat || !user?.token) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      setLoading(true);
      const { data } = await axios.get(
        `${apiUrl}/api/message/${selectedChat._id}`,
        config
      );

      setMessages(data);
      setLoading(false);

      if (socket) {
        socket.emit("join chat", selectedChat._id);
      }
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error!",
        description: error.response?.data?.message || "Failed to load messages",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  // Socket setup and listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleTyping = (data) => {
      const room = typeof data === "object" ? data.room : data;
      const typerId = typeof data === "object" ? data.userId : null;
      if (selectedChatCompareRef.current?._id === room && String(typerId) !== String(user._id)) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = (data) => {
      const room = typeof data === "object" ? data.room : data;
      if (selectedChatCompareRef.current?._id === room) {
        setIsTyping(false);
      }
    };

    const handleReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, reactions: reactions || {} } : m
        )
      );
    };

    const handleDelete = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true } : m))
      );
    };

    const handleMessageReceived = (newMessageRecieved) => {
      const currentChat = selectedChatCompareRef.current;
      const incomingChatId =
        newMessageRecieved.chat?._id || newMessageRecieved.chat;

      if (currentChat && String(currentChat._id) === String(incomingChatId)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessageRecieved._id)) return prev;
          return [...prev, newMessageRecieved];
        });
      }
    };

    const handleDisappearingUpdated = ({ chatId, disappearingTimer }) => {
      if (selectedChatCompareRef.current?._id === chatId) {
        setSelectedChat((prev) => ({ ...prev, disappearingTimer }));
      }
    };

    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);
    socket.on("message reaction", handleReaction);
    socket.on("delete message", handleDelete);
    socket.on("message recieved", handleMessageReceived);
    socket.on("chat:disappearing-updated", handleDisappearingUpdated);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
      socket.off("message reaction", handleReaction);
      socket.off("delete message", handleDelete);
      socket.off("message recieved", handleMessageReceived);
      socket.off("chat:disappearing-updated", handleDisappearingUpdated);
    };
  }, [socket, user]);

  // Fetch messages and join chat room on chat change
  useEffect(() => {
    fetchMessages();
    selectedChatCompareRef.current = selectedChat;
    setIsTyping(false);
    setReplyingTo(null);

    if (socket && selectedChat?._id) {
      socket.emit("join chat", selectedChat._id);
    }
  }, [selectedChat, socket]);

  // Disappearing messages handler
  const handleSetDisappearing = async (seconds) => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.put(
        `${apiUrl}/api/chat/disappearing`,
        { chatId: selectedChat._id, disappearingTimer: seconds },
        config
      );
      setSelectedChat((prev) => ({ ...prev, disappearingTimer: seconds }));
      toast({
        title: "Disappearing Messages",
        description:
          seconds > 0
            ? `Messages will disappear after ${seconds === 86400 ? "24 hours" : "7 days"}`
            : "Disappearing messages turned off",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } catch (err) {
      toast({
        title: "Failed to update timer",
        description: err.response?.data?.message || err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  // Send message API call
  const sendActualMessage = async ({ content, messageType = "text", fileUrl = null }) => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      let finalContent = content || "";
      let isEncrypted = false;

      // Encrypt 1-on-1 text messages if recipient has public key registered
      if (
        messageType === "text" &&
        !selectedChat.isGroupChat &&
        otherUser?.publicKey &&
        e2eeKeys?.privateKeyJwk
      ) {
        try {
          const peerPub =
            typeof otherUser.publicKey === "string"
              ? JSON.parse(otherUser.publicKey)
              : otherUser.publicKey;
          const cipher = await encryptE2EEMessage(
            finalContent,
            e2eeKeys.privateKeyJwk,
            peerPub
          );
          if (cipher && cipher.startsWith("E2EE::")) {
            finalContent = cipher;
            isEncrypted = true;
          }
        } catch (encErr) {
          console.warn("E2EE encryption warning:", encErr);
        }
      }

      const payload = {
        content: finalContent,
        chatId: selectedChat._id,
        messageType,
        fileUrl,
        isEncrypted,
        replyTo: replyingTo
          ? {
              _id: replyingTo._id,
              senderName: replyingTo.sender?.name || "User",
              content: replyingTo.content,
            }
          : null,
      };

      setNewMessage("");
      setShowEmojis(false);
      setReplyingTo(null);

      const { data } = await axios.post(`${apiUrl}/api/message`, payload, config);

      if (socket) {
        socket.emit("new message", data);
      }
      setMessages((prev) => [...prev, data]);
      setFetchAgain(!fetchAgain);
    } catch (error) {
      toast({
        title: "Error!",
        description: error.response?.data?.message || "Failed to send message",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (event) => {
    if ((event.key === "Enter" || event.type === "click") && newMessage.trim()) {
      if (socket && selectedChat) {
        socket.emit("stop typing", {
          room: selectedChat._id,
          userId: user._id,
        });
        setTyping(false);
      }
      await sendActualMessage({ content: newMessage, messageType: "text" });
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !selectedChat) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", {
        room: selectedChat._id,
        userId: user._id,
        userName: user.name,
      });
    }
    const lastTypingTime = new Date().getTime();
    const timerLength = 2500;
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;

      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", {
          room: selectedChat._id,
          userId: user._id,
        });
        setTyping(false);
      }
    }, timerLength);
  };

  const handleAddEmoji = (emoji) => {
    setNewMessage((prev) => prev + emoji);
  };

  // ================= VOICE RECORDING =================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone permission in your browser.",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  // Helper to upload media file to Cloudinary with fallback
  const uploadToCloudinary = async (fileOrBlob, resourceType = "image") => {
    try {
      const data = new FormData();
      data.append("file", fileOrBlob);
      data.append("upload_preset", "ChatMe");
      data.append("cloud_name", "dsdwziwqb");

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/dsdwziwqb/${resourceType}/upload`,
        data
      );
      return res.data?.secure_url || res.data?.url || null;
    } catch (err) {
      console.warn("Cloudinary upload failed, will fallback to inline media:", err.message);
      return null;
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (!mediaRecorderRef.current) return;

    clearInterval(recordingTimerRef.current);
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((track) => track.stop());

      if (shouldSend && audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        toast({
          title: "Sending voice note...",
          status: "info",
          duration: 1500,
          isClosable: true,
          position: "bottom",
        });

        const cloudUrl = await uploadToCloudinary(audioBlob, "auto");
        if (cloudUrl) {
          await sendActualMessage({
            content: "🎤 Voice message",
            messageType: "audio",
            fileUrl: cloudUrl,
          });
        } else {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            await sendActualMessage({
              content: "🎤 Voice message",
              messageType: "audio",
              fileUrl: reader.result,
            });
          };
        }
      }
    };

    recorder.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // ================= IMAGE ATTACHMENT =================
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    toast({
      title: "Uploading photo...",
      status: "info",
      duration: 1500,
      isClosable: true,
      position: "bottom",
    });

    const cloudUrl = await uploadToCloudinary(file, "image");
    if (cloudUrl) {
      await sendActualMessage({
        content: "📷 Photo",
        messageType: "image",
        fileUrl: cloudUrl,
      });
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        await sendActualMessage({
          content: "📷 Photo",
          messageType: "image",
          fileUrl: reader.result,
        });
      };
    }
    e.target.value = "";
  };

  // ================= REACTIONS & ACTIONS =================
  const handleReaction = (messageId, emoji) => {
    const uId = String(user?._id);

    setMessages((prev) =>
      prev.map((m) => {
        if (m._id === messageId) {
          const rx = { ...(m.reactions || {}) };
          if (rx[uId] === emoji) {
            delete rx[uId]; // toggle off if same reaction clicked
          } else {
            rx[uId] = emoji; // set or replace with new reaction
          }
          return { ...m, reactions: rx };
        }
        return m;
      })
    );

    if (socket && selectedChat) {
      socket.emit("message reaction", {
        chatId: selectedChat._id,
        messageId,
        emoji,
        userId: user._id,
      });
    }
  };

  const handleDeleteMessage = (messageId) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true } : m))
    );

    if (socket && selectedChat) {
      socket.emit("delete message", {
        chatId: selectedChat._id,
        messageId,
      });
    }
  };

  const handleReplyMessage = (message) => {
    setReplyingTo(message);
  };

  const handleDeleteChat = async () => {
    if (!selectedChat || !user?.token) return;
    if (!window.confirm("Are you sure you want to permanently delete this chat?")) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.delete(`${apiUrl}/api/chat/${selectedChat._id}`, config);
      setSelectedChat(null);
      setChats((prev) => prev.filter((c) => String(c._id) !== String(selectedChat._id)));
      setFetchAgain(!fetchAgain);
      toast({
        title: "Chat deleted",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (err) {
      toast({
        title: "Error deleting chat",
        description: err.response?.data?.message || err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const formatRecSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <>
      {selectedChat ? (
        <Box display="flex" flexDir="column" w="100%" h="100%" overflow="hidden">
          {/* WhatsApp Chat Header */}
          <Box
            p={{ base: "8px 10px", md: "10px 16px" }}
            bg="var(--wa-bg-panel)"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom="1px solid var(--wa-border)"
            w="100%"
            minW="0"
          >
            <Box display="flex" alignItems="center" gap={{ base: "8px", md: "12px" }} minW="0" flex="1" mr="6px">
              <IconButton
                display={{ base: "flex", md: "none" }}
                icon={<ArrowBackIcon />}
                onClick={() => setSelectedChat(null)}
                variant="ghost"
                size="sm"
                color="var(--wa-text-secondary)"
                aria-label="Back to chats"
                minW="28px"
                p="0"
              />

              <Avatar
                size="sm"
                name={
                  !selectedChat.isGroupChat
                    ? getSender(user, selectedChat.users)
                    : selectedChat.chatName
                }
                src={otherUser?.pic}
                flexShrink={0}
              >
                {isOnline && (
                  <AvatarBadge boxSize="1em" bg="var(--wa-accent-light)" />
                )}
              </Avatar>

              <Box minW="0" flex="1">
                <Text
                  fontSize={{ base: "15px", md: "16px" }}
                  fontWeight="600"
                  color="var(--wa-text-primary)"
                  lineHeight="1.2"
                  isTruncated
                >
                  {!selectedChat.isGroupChat
                    ? getSender(user, selectedChat.users)
                    : selectedChat.chatName}
                </Text>

                <Text fontSize="12px" color="var(--wa-text-secondary)" isTruncated>
                  {isTyping ? (
                    <span style={{ color: "var(--wa-accent-light)", fontStyle: "italic", fontWeight: "600" }}>
                      typing...
                    </span>
                  ) : !selectedChat.isGroupChat ? (
                    otherUser?.isDeleted ? (
                      <span style={{ color: "#EF4444", fontStyle: "italic", fontWeight: "500" }}>
                        Account deleted
                      </span>
                    ) : isOnline ? (
                      <span style={{ color: "var(--wa-accent-light)", fontWeight: "500" }}>online</span>
                    ) : (
                      "offline"
                    )
                  ) : (
                    `${selectedChat.users?.length || 0} participants`
                  )}
                </Text>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={{ base: "2px", md: "4px" }} flexShrink={0}>
              {/* 1-on-1 WebRTC Voice & Video Calling (Always visible for 1-on-1 chats) */}
              {!selectedChat.isGroupChat && !otherUser?.isDeleted && (
                <>
                  <Tooltip label="Voice Call" hasArrow>
                    <IconButton
                      aria-label="Voice Call"
                      icon={<WaPhoneIcon size={18} />}
                      size="sm"
                      variant="ghost"
                      color="var(--wa-icon-gray)"
                      _hover={{ bg: "var(--wa-hover-bg)", color: "var(--wa-accent-light)" }}
                      onClick={() => startCall({ userToCall: otherUser, isVideo: false })}
                    />
                  </Tooltip>

                  <Tooltip label="Video Call" hasArrow>
                    <IconButton
                      aria-label="Video Call"
                      icon={<WaVideoIcon size={19} />}
                      size="sm"
                      variant="ghost"
                      color="var(--wa-icon-gray)"
                      _hover={{ bg: "var(--wa-hover-bg)", color: "var(--wa-accent-light)" }}
                      onClick={() => startCall({ userToCall: otherUser, isVideo: true })}
                    />
                  </Tooltip>
                </>
              )}

              {/* Desktop Direct Buttons */}
              <Box display={{ base: "none", md: "flex" }} alignItems="center" gap="4px">
                {/* Disappearing Messages menu */}
                <Menu>
                  <Tooltip
                    label={`Disappearing messages: ${
                      selectedChat.disappearingTimer === 86400
                        ? "24 hours"
                        : selectedChat.disappearingTimer === 604800
                        ? "7 days"
                        : "Off"
                    }`}
                    hasArrow
                  >
                    <MenuButton
                      as={IconButton}
                      aria-label="Disappearing Messages"
                      icon={<WaClockIcon size={18} />}
                      size="sm"
                      variant="ghost"
                      color={
                        selectedChat.disappearingTimer > 0
                          ? "var(--wa-accent-light)"
                          : "var(--wa-icon-gray)"
                      }
                      _hover={{ bg: "var(--wa-hover-bg)" }}
                    />
                  </Tooltip>
                  <MenuList bg="var(--wa-bg-panel)" borderColor="var(--wa-border)">
                    <MenuItem
                      bg="var(--wa-bg-panel)"
                      color="var(--wa-text-primary)"
                      _hover={{ bg: "var(--wa-bg-hover)" }}
                      onClick={() => handleSetDisappearing(0)}
                    >
                      Off {!selectedChat.disappearingTimer && " ✓"}
                    </MenuItem>
                    <MenuItem
                      bg="var(--wa-bg-panel)"
                      color="var(--wa-text-primary)"
                      _hover={{ bg: "var(--wa-bg-hover)" }}
                      onClick={() => handleSetDisappearing(86400)}
                    >
                      24 Hours {selectedChat.disappearingTimer === 86400 && " ✓"}
                    </MenuItem>
                    <MenuItem
                      bg="var(--wa-bg-panel)"
                      color="var(--wa-text-primary)"
                      _hover={{ bg: "var(--wa-bg-hover)" }}
                      onClick={() => handleSetDisappearing(604800)}
                    >
                      7 Days {selectedChat.disappearingTimer === 604800 && " ✓"}
                    </MenuItem>
                  </MenuList>
                </Menu>

                <Tooltip label={showSearch ? "Close search" : "Search in chat"} hasArrow>
                  <IconButton
                    aria-label="Search chat"
                    icon={<WaSearchIcon size={18} />}
                    size="sm"
                    variant="ghost"
                    color={showSearch ? "var(--wa-accent)" : "var(--wa-icon-gray)"}
                    _hover={{ bg: "var(--wa-hover-bg)" }}
                    onClick={() => {
                      setShowSearch(!showSearch);
                      if (showSearch) setSearchQuery("");
                    }}
                  />
                </Tooltip>

                <Tooltip label="Delete Chat" hasArrow>
                  <IconButton
                    aria-label="Delete chat"
                    icon={<WaDeleteIcon size={18} />}
                    size="sm"
                    variant="ghost"
                    color="var(--wa-icon-gray)"
                    _hover={{ bg: "var(--wa-hover-bg)", color: "#EF4444" }}
                    onClick={handleDeleteChat}
                  />
                </Tooltip>
              </Box>

              {!selectedChat.isGroupChat ? (
                <Box display={{ base: "none", md: "block" }}>
                  <Profile user={getSenderDetails(user, selectedChat.users)} />
                </Box>
              ) : (
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchMessages={fetchMessages}
                />
              )}

              {/* Mobile 3-Dots Overflow Menu (WhatsApp Mobile style) */}
              <Box display={{ base: "block", md: "none" }}>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="More options"
                    icon={<Text fontSize="18px" fontWeight="bold">⋮</Text>}
                    size="sm"
                    variant="ghost"
                    color="var(--wa-icon-gray)"
                    _hover={{ bg: "var(--wa-hover-bg)" }}
                  />
                  <MenuList bg="var(--wa-bg-panel)" borderColor="var(--wa-border)" minW="190px">
                    <MenuItem
                      bg="var(--wa-bg-panel)"
                      color="var(--wa-text-primary)"
                      _hover={{ bg: "var(--wa-bg-hover)" }}
                      onClick={() => {
                        setShowSearch(!showSearch);
                        if (showSearch) setSearchQuery("");
                      }}
                    >
                      {showSearch ? "Close search" : "Search in chat"}
                    </MenuItem>
                    <MenuItem
                      bg="var(--wa-bg-panel)"
                      color="var(--wa-text-primary)"
                      _hover={{ bg: "var(--wa-bg-hover)" }}
                      onClick={() => handleSetDisappearing(selectedChat.disappearingTimer === 86400 ? 0 : 86400)}
                    >
                      Disappearing ({selectedChat.disappearingTimer === 86400 ? "24h" : selectedChat.disappearingTimer === 604800 ? "7d" : "Off"})
                    </MenuItem>
                    <MenuItem
                      bg="var(--wa-bg-panel)"
                      color="#EF4444"
                      _hover={{ bg: "var(--wa-bg-hover)" }}
                      onClick={handleDeleteChat}
                    >
                      Delete Chat
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Box>
            </Box>
          </Box>

          {/* In-chat search bar */}
          {showSearch && (
            <Box
              p="8px 16px"
              bg="var(--wa-bg-panel)"
              borderBottom="1px solid var(--wa-border)"
              display="flex"
              alignItems="center"
              gap="10px"
              boxShadow="0 2px 6px rgba(0,0,0,0.15)"
            >
              <SearchIcon color="var(--wa-icon-gray)" />
              <Input
                placeholder="Search in chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="unstyled"
                color="var(--wa-text-primary)"
                fontSize="14px"
                autoFocus
              />
              {searchQuery && (
                <Text fontSize="12px" color="var(--wa-text-secondary)" whiteSpace="nowrap">
                  {displayedMessages.length} {displayedMessages.length === 1 ? "match" : "matches"}
                </Text>
              )}
              <CloseButton
                size="sm"
                color="var(--wa-icon-gray)"
                onClick={() => {
                  setSearchQuery("");
                  setShowSearch(false);
                }}
              />
            </Box>
          )}

          {/* Messages Feed Area with WhatsApp Doodle Wallpaper */}
          <Box
            flex="1"
            className="wa-chat-bg messages"
            position="relative"
            overflowY="auto"
          >
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" h="100%">
                <Spinner size="xl" color="var(--wa-accent)" />
              </Box>
            ) : (
              <>
                <ScrollableChat
                  messages={displayedMessages}
                  isGroupChat={selectedChat.isGroupChat}
                  onReply={handleReplyMessage}
                  onReaction={handleReaction}
                  onDelete={handleDeleteMessage}
                />
                {isTyping && (
                  <Box px="16px" py="6px" display="flex" alignItems="center">
                    <div className="wa-typing-bubble">
                      <span className="wa-typing-dot"></span>
                      <span className="wa-typing-dot"></span>
                      <span className="wa-typing-dot"></span>
                    </div>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Quoted Reply Preview Bar */}
          {replyingTo && (
            <Box className="wa-reply-bar">
              <Box minW="0" flex="1">
                <Text fontSize="12px" fontWeight="600" color="var(--wa-accent)">
                  Replying to {replyingTo.sender?.name || "User"}
                </Text>
                <Text fontSize="13px" color="var(--wa-text-secondary)" isTruncated>
                  {replyingTo.content}
                </Text>
              </Box>
              <CloseButton
                size="sm"
                color="var(--wa-text-secondary)"
                onClick={() => setReplyingTo(null)}
              />
            </Box>
          )}

          {/* Quick Emoji Bar */}
          {showEmojis && (
            <Box
              bg="var(--wa-bg-panel)"
              p="6px 16px"
              display="flex"
              gap="10px"
              borderTop="1px solid var(--wa-border)"
              alignItems="center"
            >
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "20px",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                  onClick={() => handleAddEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </Box>
          )}

          {/* WhatsApp Bottom Input Bar or Deleted Account Notice */}
          {!selectedChat.isGroupChat && otherUser?.isDeleted ? (
            <Box
              p="16px"
              bg="var(--wa-bg-panel)"
              borderTop="1px solid var(--wa-border)"
              display="flex"
              flexDir="column"
              alignItems="center"
              justifyContent="center"
              gap="10px"
            >
              <Text fontSize="13.5px" color="var(--wa-text-secondary)" textAlign="center">
                🚫 You can no longer send messages to this conversation because the account was deleted.
              </Text>
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                leftIcon={<DeleteIcon />}
                onClick={handleDeleteChat}
              >
                Delete Chat Conversation
              </Button>
            </Box>
          ) : (
            <Box
              p="8px 16px"
              bg="var(--wa-bg-panel)"
              display="flex"
              alignItems="center"
              gap="8px"
              borderTop="1px solid var(--wa-border)"
            >
              {/* Hidden File Input for Image Attachment */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageSelect}
              />

              {/* Emoji Trigger */}
              <Tooltip label="Emojis" hasArrow>
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={<WaSmileyIcon size={22} color="var(--wa-text-secondary)" />}
                  onClick={() => setShowEmojis(!showEmojis)}
                  _hover={{ color: "var(--wa-text-primary)", bg: "transparent" }}
                  aria-label="Emojis"
                />
              </Tooltip>

              {/* Attachment Paperclip Button */}
              <Tooltip label="Attach photo" hasArrow>
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={<WaAttachIcon size={21} color="var(--wa-text-secondary)" />}
                  onClick={() => fileInputRef.current?.click()}
                  _hover={{ color: "var(--wa-text-primary)", bg: "transparent" }}
                  aria-label="Attach photo"
                />
              </Tooltip>

              {/* If Recording: Show Audio Recording Controls */}
              {isRecording ? (
                <Box
                  flex="1"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  bg="var(--wa-input-bg)"
                  borderRadius="8px"
                  px="14px"
                  py="6px"
                >
                  <Box display="flex" alignItems="center">
                    <span className="wa-rec-dot" />
                    <Text fontSize="14px" fontWeight="600" color="#EF4444">
                      {formatRecSeconds(recordingSeconds)}
                    </Text>
                  </Box>
                  <Box display="flex" gap="8px">
                    <IconButton
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      icon={<WaDeleteIcon size={16} />}
                      onClick={() => stopRecording(false)}
                      aria-label="Cancel recording"
                    />
                    <IconButton
                      size="xs"
                      colorScheme="teal"
                      bg="var(--wa-accent)"
                      icon={<WaSendIcon size={14} color="#FFFFFF" />}
                      onClick={() => stopRecording(true)}
                      aria-label="Send voice note"
                    />
                  </Box>
                </Box>
              ) : (
                /* Regular Text Input */
                <FormControl onKeyDown={sendMessage} flex="1">
                  <Input
                    placeholder="Type a message"
                    value={newMessage}
                    onChange={typingHandler}
                    bg="var(--wa-input-bg)"
                    color="var(--wa-text-primary)"
                    border="none"
                    borderRadius="8px"
                    size="md"
                    _focus={{ boxShadow: "none" }}
                  />
                </FormControl>
              )}

              {/* Send or Mic Button */}
              {newMessage.trim() ? (
                <IconButton
                  size="md"
                  borderRadius="full"
                  colorScheme="teal"
                  bg="var(--wa-accent)"
                  _hover={{ bg: "var(--wa-accent-light)" }}
                  icon={<WaSendIcon size={18} color="#FFFFFF" />}
                  onClick={sendMessage}
                  aria-label="Send message"
                />
              ) : !isRecording ? (
                <Tooltip label="Hold or click to record voice note" hasArrow>
                  <IconButton
                    size="md"
                    borderRadius="full"
                    variant="ghost"
                    color="var(--wa-text-secondary)"
                    _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-accent)" }}
                    icon={<WaMicIcon size={21} />}
                    onClick={startRecording}
                    aria-label="Voice Note"
                  />
                </Tooltip>
              ) : null}
            </Box>
          )}
        </Box>
      ) : (
        /* Empty Chat Placeholder (WhatsApp Web style) */
        <Box
          display="flex"
          flexDir="column"
          alignItems="center"
          justifyContent="center"
          h="100%"
          w="100%"
          bg="var(--wa-bg-panel)"
          borderBottom="6px solid var(--wa-accent)"
          textAlign="center"
          p="20px"
        >
          <Text fontSize="32px" fontWeight="300" color="var(--wa-text-primary)" mb="12px">
            ChatMe for Web
          </Text>
          <Text fontSize="14px" color="var(--wa-text-secondary)" maxW="420px" lineHeight="1.6">
            Send and receive messages in real time with Socket.io and Upstash Redis.
            Select a chat from the sidebar to start a conversation.
          </Text>
          <Text fontSize="12px" color="var(--wa-text-muted)" mt="32px">
            🔒 In-Memory & Upstash Cloud Protected
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
