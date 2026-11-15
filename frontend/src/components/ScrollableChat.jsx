import { ChatState } from "../Context/ChatProvider.jsx";
import React, { useEffect, useRef, useState } from "react";
import { formatMessageTime } from "../config/formatTime.js";
import VoiceNotePlayer from "./VoiceNotePlayer.jsx";
import ImageLightbox from "./ImageLightbox.jsx";
import { Image, Box, Text, Flex } from "@chakra-ui/react";
import { FaLock, FaClock } from "react-icons/fa";
import { BsStars } from "react-icons/bs";
import { decryptE2EEMessage } from "../utils/crypto.js";
import { WaReplyIcon, WaDeleteIcon } from "./icons/WhatsAppIcons.jsx";

const DecryptedTextMessage = ({ content, myPrivateKeyJwk, peerPublicKeyJwk }) => {
  const [displayText, setDisplayText] = useState(() => {
    if (typeof content === "string" && content.startsWith("E2EE::")) {
      return "🔒 Decrypting...";
    }
    return content;
  });

  useEffect(() => {
    let isMounted = true;
    if (typeof content === "string" && content.startsWith("E2EE::")) {
      decryptE2EEMessage(content, myPrivateKeyJwk, peerPublicKeyJwk).then((res) => {
        if (isMounted) setDisplayText(res);
      });
    } else {
      setDisplayText(content);
    }
    return () => {
      isMounted = false;
    };
  }, [content, myPrivateKeyJwk, peerPublicKeyJwk]);

  return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{displayText}</span>;
};

const ScrollableChat = ({ messages, isGroupChat, onReply, onReaction, onDelete }) => {
  const { user, selectedChat, e2eeKeys } = ChatState();
  const bottomRef = useRef(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [lightboxSender, setLightboxSender] = useState("");

  // Note: Scrolling is handled safely on the messages container in SingleChat

  // Find 1-on-1 peer user and their public key
  const peerUser =
    !isGroupChat && selectedChat?.users
      ? selectedChat.users.find((u) => String(u._id || u) !== String(user?._id))
      : null;

  let peerPublicKeyJwk = null;
  if (peerUser && peerUser.publicKey) {
    try {
      peerPublicKeyJwk =
        typeof peerUser.publicKey === "string"
          ? JSON.parse(peerUser.publicKey)
          : peerUser.publicKey;
    } catch (e) {
      peerPublicKeyJwk = null;
    }
  }

  const disappearingTimer = Number(selectedChat?.disappearingTimer) || 0;
  const disappearingLabel =
    disappearingTimer === 86400
      ? "24 hours"
      : disappearingTimer === 604800
      ? "7 days"
      : null;

  const DoubleTick = () => (
    <svg
      viewBox="0 0 16 11"
      width="16"
      height="11"
      className="wa-tick blue"
      fill="currentColor"
    >
      <path d="M11.07 1.34a.75.75 0 0 0-1.06-.02L4.85 6.3 2.5 3.96a.75.75 0 0 0-1.06 1.06l2.87 2.86a.75.75 0 0 0 1.08 0l5.66-5.48a.75.75 0 0 0 .02-1.06z" />
      <path d="M15.07 1.34a.75.75 0 0 0-1.06-.02L8.85 6.3l-.92-.93a.75.75 0 1 0-1.06 1.06l1.45 1.45a.75.75 0 0 0 1.08 0l5.66-5.48a.75.75 0 0 0 .02-1.06z" />
    </svg>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* WhatsApp End-to-End Encryption Banner */}
      <Box
        textAlign="center"
        my="8px"
        p="8px 16px"
        bg="rgba(17, 27, 33, 0.75)"
        borderRadius="8px"
        maxW="540px"
        mx="auto"
        border="1px solid rgba(255, 215, 0, 0.15)"
        boxShadow="0 1px 3px rgba(0,0,0,0.2)"
      >
        <Text
          fontSize="12px"
          color="#ffd279"
          fontWeight="500"
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap="6px"
        >
          <FaLock fontSize="11px" /> Messages and calls are end-to-end encrypted. No one outside of this chat, not even ChatMe, can read or listen to them.
        </Text>
      </Box>

      {/* Disappearing Messages Active Banner */}
      {disappearingLabel && (
        <Box
          textAlign="center"
          mb="6px"
          p="6px 14px"
          bg="rgba(17, 27, 33, 0.75)"
          borderRadius="8px"
          maxW="420px"
          mx="auto"
          border="1px solid rgba(255, 255, 255, 0.08)"
        >
          <Text
            fontSize="11px"
            color="var(--wa-text-secondary)"
            fontWeight="500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap="6px"
          >
            <FaClock fontSize="11px" color="var(--wa-accent-light)" />
            New messages in this chat will disappear after {disappearingLabel}.
          </Text>
        </Box>
      )}

      {messages &&
        messages.map((m) => {
          const senderId = String(m.sender?._id || m.sender);
          const isSender = senderId === String(user?._id);
          const isAi =
            senderId === "user_gemini_ai" ||
            m.sender?.email === "ai@chatme.internal" ||
            m.sender?.isAi;

          const isAudio =
            m.messageType === "audio" ||
            m.content === "🎤 Voice message" ||
            (typeof m.content === "string" && m.content.startsWith("🎤 Voice")) ||
            (m.fileUrl && (m.fileUrl.endsWith(".webm") || m.fileUrl.startsWith("data:audio") || m.fileUrl.includes("audio") || m.fileUrl.includes("video/upload")));

          const isImage =
            m.messageType === "image" ||
            m.content === "📷 Photo" ||
            (typeof m.content === "string" && m.content.startsWith("📷 Photo")) ||
            (m.fileUrl && (m.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || m.fileUrl.includes("image/upload") || m.fileUrl.startsWith("data:image")));

          const isEncrypted =
            m.isEncrypted ||
            (typeof m.content === "string" && m.content.startsWith("E2EE::"));

          // Group reactions by emoji from { [userId]: emoji }
          const reactionCounts = {};
          let myReaction = null;
          if (m.reactions && typeof m.reactions === "object") {
            Object.entries(m.reactions).forEach(([uid, em]) => {
              if (em) {
                if (typeof em === "number" && ["❤️", "👍", "😂", "🔥", "🎉", "🙏", "😍"].includes(uid)) {
                  reactionCounts[uid] = em;
                } else if (typeof em === "string") {
                  reactionCounts[em] = (reactionCounts[em] || 0) + 1;
                  if (String(uid) === String(user?._id)) {
                    myReaction = em;
                  }
                }
              }
            });
          }
          const hasReactions = Object.keys(reactionCounts).length > 0;

          return (
            <div
              key={m._id}
              className={`wa-message-row ${isSender ? "out" : "in"}`}
            >
              {/* Message Bubble */}
              <div className={`wa-bubble ${isSender ? "out" : "in"}`}>
                {/* Hover Action Bar */}
                <div className="wa-action-bar">
                  <button
                    className="wa-action-btn"
                    title="React ❤️"
                    onClick={() => onReaction && onReaction(m._id, "❤️")}
                  >
                    ❤️
                  </button>
                  <button
                    className="wa-action-btn"
                    title="React 👍"
                    onClick={() => onReaction && onReaction(m._id, "👍")}
                  >
                    👍
                  </button>
                  <button
                    className="wa-action-btn"
                    title="React 😂"
                    onClick={() => onReaction && onReaction(m._id, "😂")}
                  >
                    😂
                  </button>
                  <button
                    className="wa-action-btn"
                    title="Reply"
                    onClick={() => onReply && onReply(m)}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <WaReplyIcon size={14} color="var(--wa-text-secondary)" />
                  </button>
                  {isSender && (
                    <button
                      className="wa-action-btn"
                      title="Delete message"
                      onClick={() => onDelete && onDelete(m._id)}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <WaDeleteIcon size={14} color="#EF4444" />
                    </button>
                  )}
                </div>

                {/* Sender Name in group chats */}
                {isGroupChat && !isSender && (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: isAi ? "var(--wa-accent-light)" : "var(--wa-accent)",
                      marginBottom: "2px",
                    }}
                  >
                    {m.sender?.name || "Participant"}
                  </div>
                )}

                {/* Gemini AI Assistant Badge */}
                {isAi && (
                  <Flex
                    align="center"
                    gap="5px"
                    mb="6px"
                    px="7px"
                    py="2px"
                    bg="rgba(0, 168, 132, 0.18)"
                    borderRadius="4px"
                    w="fit-content"
                  >
                    <BsStars color="#25D366" fontSize="12px" />
                    <Text fontSize="11px" fontWeight="bold" color="#25D366">
                      Gemini AI Assistant
                    </Text>
                  </Flex>
                )}

                {/* Quoted / Replied message preview */}
                {m.replyTo && (
                  <div className="wa-quoted-container">
                    <div className="wa-quoted-sender">
                      {m.replyTo.senderName || "User"}
                    </div>
                    <div className="wa-quoted-text">{m.replyTo.content}</div>
                  </div>
                )}

                {/* Deleted state */}
                {m.isDeleted ? (
                  <span style={{ fontStyle: "italic", opacity: 0.7 }}>
                    🚫 This message was deleted
                  </span>
                ) : (
                  <>
                    {/* Image Message */}
                    {isImage ? (
                      m.fileUrl ? (
                        <Image
                          src={m.fileUrl}
                          alt="attachment"
                          className="wa-image-thumb"
                          maxH="280px"
                          borderRadius="8px"
                          cursor="pointer"
                          objectFit="cover"
                          onClick={() => {
                            setLightboxImg(m.fileUrl);
                            setLightboxSender(m.sender?.name || "User");
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 12px",
                            background: "rgba(0,0,0,0.18)",
                            borderRadius: "8px",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ fontSize: "20px" }}>📷</span>
                          <span style={{ fontSize: "13px", fontWeight: "500" }}>Photo Attachment</span>
                        </div>
                      )
                    ) : null}

                    {/* Audio Voice Note Message */}
                    {isAudio ? (
                      <VoiceNotePlayer audioUrl={m.fileUrl || ""} isSender={isSender} />
                    ) : null}

                    {/* Text Content */}
                    {m.content &&
                      !isAudio &&
                      !isImage &&
                      m.content !== "🎤 Voice message" &&
                      m.content !== "📷 Photo" && (
                        <DecryptedTextMessage
                          content={m.content}
                          myPrivateKeyJwk={e2eeKeys?.privateKeyJwk}
                          peerPublicKeyJwk={peerPublicKeyJwk}
                        />
                      )}
                  </>
                )}

                {/* Meta: Time, E2EE / Clock Icon, and Status Ticks */}
                <span className="wa-meta">
                  {isEncrypted && (
                    <FaLock
                      fontSize="9px"
                      color="var(--wa-accent-light)"
                      style={{ marginRight: "3px", display: "inline" }}
                      title="End-to-End Encrypted"
                    />
                  )}
                  {m.expiresAt && (
                    <FaClock
                      fontSize="9px"
                      color="var(--wa-text-secondary)"
                      style={{ marginRight: "3px", display: "inline" }}
                      title="Disappearing message"
                    />
                  )}
                  {formatMessageTime(m.createdAt || new Date())}
                  {isSender && !m.isDeleted && <DoubleTick />}
                </span>

                {/* Reaction badge under bubble */}
                {hasReactions && (
                  <div
                    className="wa-reaction-badge"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <span
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReaction && onReaction(m._id, emoji);
                        }}
                        style={{
                          padding: "1px 6px",
                          borderRadius: "10px",
                          backgroundColor:
                            myReaction === emoji
                              ? "rgba(0, 168, 132, 0.35)"
                              : "transparent",
                          border:
                            myReaction === emoji
                              ? "1px solid var(--wa-accent)"
                              : "1px solid transparent",
                        }}
                        title={
                          myReaction === emoji
                            ? "Click to remove reaction"
                            : `React ${emoji}`
                        }
                      >
                        {emoji} {count > 1 ? count : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      <div ref={bottomRef} />

      {/* Image Lightbox Viewer */}
      <ImageLightbox
        isOpen={Boolean(lightboxImg)}
        onClose={() => setLightboxImg(null)}
        imageUrl={lightboxImg}
        senderName={lightboxSender}
      />
    </div>
  );
};

export default ScrollableChat;
