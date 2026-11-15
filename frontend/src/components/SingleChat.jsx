import {
  Avatar,
  AvatarBadge,
  Box,
  CloseButton,
  FormControl,
  IconButton,
  Input,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import React, { useEffect, useState, useRef } from "react";
import {
  ArrowBackIcon,
  ArrowForwardIcon,
  AttachmentIcon,
  DeleteIcon,
  SearchIcon,
} from "@chakra-ui/icons";
import { getSender, getSenderDetails } from "../config/ChatLogics.jsx";
import Profile from "./miscellaneous/Profile.jsx";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal.jsx";
import axios from "axios";
import "./Css/styles.css";
import ScrollableChat from "./ScrollableChat.jsx";
import io from "socket.io-client";
import { getBackendUrl } from "../config/api.js";

const apiUrl = getBackendUrl();
let socket;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const { user, selectedChat, setSelectedChat, notification, setNotification, onlineUsers } =
    ChatState();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
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
    if (!user) return;

    socket = io(apiUrl);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));

    socket.on("typing", (room) => {
      if (selectedChatCompareRef.current?._id === room) {
        setIsTyping(true);
      }
    });

    socket.on("stop typing", (room) => {
      if (selectedChatCompareRef.current?._id === room) {
        setIsTyping(false);
      }
    });

    // Real-time Reaction Listener
    socket.on("message reaction", ({ messageId, emoji }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === messageId) {
            const rx = { ...(m.reactions || {}) };
            rx[emoji] = (rx[emoji] || 0) + 1;
            return { ...m, reactions: rx };
          }
          return m;
        })
      );
    });

    // Real-time Delete Listener
    socket.on("delete message", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true } : m))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Fetch messages on chat change
  useEffect(() => {
    fetchMessages();
    selectedChatCompareRef.current = selectedChat;
    setIsTyping(false);
    setReplyingTo(null);
  }, [selectedChat]);

  // Message receiver socket listener
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMessageRecieved) => {
      const currentChat = selectedChatCompareRef.current;
      if (!currentChat || currentChat._id !== newMessageRecieved.chat._id) {
        if (!notification.some((n) => n._id === newMessageRecieved._id)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages((prev) => [...prev, newMessageRecieved]);
      }
    };

    socket.on("message recieved", handleMessageReceived);

    return () => {
      socket.off("message recieved", handleMessageReceived);
    };
  }, [selectedChat, notification, fetchAgain]);

  // Send message API call
  const sendActualMessage = async ({ content, messageType = "text", fileUrl = null }) => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const payload = {
        content: content || "",
        chatId: selectedChat._id,
        messageType,
        fileUrl,
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
        socket.emit("stop typing", selectedChat._id);
      }
      await sendActualMessage({ content: newMessage, messageType: "text" });
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected || !selectedChat) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    const lastTypingTime = new Date().getTime();
    const timerLength = 3000;
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;

      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
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
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id === messageId) {
          const rx = { ...(m.reactions || {}) };
          rx[emoji] = (rx[emoji] || 0) + 1;
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
            p="10px 16px"
            bg="var(--wa-bg-panel)"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom="1px solid var(--wa-border)"
          >
            <Box display="flex" alignItems="center" gap="12px">
              <IconButton
                display={{ base: "flex", md: "none" }}
                icon={<ArrowBackIcon />}
                onClick={() => setSelectedChat(null)}
                variant="ghost"
                size="sm"
                color="var(--wa-text-secondary)"
                aria-label="Back to chats"
              />

              <Avatar
                size="sm"
                name={
                  !selectedChat.isGroupChat
                    ? getSender(user, selectedChat.users)
                    : selectedChat.chatName
                }
                src={otherUser?.pic}
              >
                {isOnline && (
                  <AvatarBadge boxSize="1em" bg="var(--wa-accent-light)" />
                )}
              </Avatar>

              <Box>
                <Text
                  fontSize="16px"
                  fontWeight="600"
                  color="var(--wa-text-primary)"
                  lineHeight="1.2"
                >
                  {!selectedChat.isGroupChat
                    ? getSender(user, selectedChat.users)
                    : selectedChat.chatName}
                </Text>

                <Text fontSize="12px" color="var(--wa-text-secondary)">
                  {isTyping ? (
                    <span style={{ color: "var(--wa-accent-light)", fontStyle: "italic", fontWeight: "600" }}>
                      typing...
                    </span>
                  ) : !selectedChat.isGroupChat ? (
                    isOnline ? (
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

            <Box display="flex" alignItems="center" gap="6px">
              <Tooltip label={showSearch ? "Close search" : "Search in chat"} hasArrow>
                <IconButton
                  aria-label="Search chat"
                  icon={<SearchIcon />}
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

              {!selectedChat.isGroupChat ? (
                <Profile user={getSenderDetails(user, selectedChat.users)} />
              ) : (
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchMessages={fetchMessages}
                />
              )}
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
              <ScrollableChat
                messages={displayedMessages}
                isGroupChat={selectedChat.isGroupChat}
                onReply={handleReplyMessage}
                onReaction={handleReaction}
                onDelete={handleDeleteMessage}
              />
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

          {/* WhatsApp Bottom Input Bar */}
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
                fontSize="18px"
                icon={<span>😀</span>}
                onClick={() => setShowEmojis(!showEmojis)}
                color="var(--wa-text-secondary)"
                _hover={{ color: "var(--wa-text-primary)", bg: "transparent" }}
                aria-label="Emojis"
              />
            </Tooltip>

            {/* Attachment Paperclip Button */}
            <Tooltip label="Attach photo" hasArrow>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<AttachmentIcon />}
                onClick={() => fileInputRef.current?.click()}
                color="var(--wa-text-secondary)"
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
                    icon={<DeleteIcon />}
                    onClick={() => stopRecording(false)}
                    aria-label="Cancel recording"
                  />
                  <IconButton
                    size="xs"
                    colorScheme="teal"
                    bg="var(--wa-accent)"
                    icon={<ArrowForwardIcon />}
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
                icon={<ArrowForwardIcon />}
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
                  icon={<span style={{ fontSize: "17px" }}>🎤</span>}
                  onClick={startRecording}
                  aria-label="Voice Note"
                />
              </Tooltip>
            ) : null}
          </Box>
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
