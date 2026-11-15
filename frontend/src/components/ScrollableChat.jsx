import { ChatState } from "../Context/ChatProvider.jsx";
import React, { useEffect, useRef, useState } from "react";
import { formatMessageTime } from "../config/formatTime.js";
import VoiceNotePlayer from "./VoiceNotePlayer.jsx";
import ImageLightbox from "./ImageLightbox.jsx";
import { Image, Box, Text, Flex, IconButton } from "@chakra-ui/react";
import { FaLock, FaClock } from "react-icons/fa";
import { BsStars } from "react-icons/bs";
import { decryptE2EEMessage } from "../utils/crypto.js";
import {
  WaReplyIcon,
  WaDeleteIcon,
  WaDownloadIcon,
  WaSingleTickIcon,
  WaDoubleTickIcon,
} from "./icons/WhatsAppIcons.jsx";
import { downloadMedia } from "../utils/downloadMedia.js";

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

const ScrollableChat = ({
  messages,
  isGroupChat,
  onReply,
  onReaction,
  onDelete,
  onCancelDelete,
  pendingDeletions,
  otherUser,
  onlineUsers = [],
}) => {
  const { user, selectedChat, e2eeKeys } = ChatState();
  const bottomRef = useRef(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [lightboxSender, setLightboxSender] = useState("");
  const [activeMobileActionId, setActiveMobileActionId] = useState(null);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* End-to-End Encryption Banner */}
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
            (m.fileUrl && (m.fileUrl.endsWith(".webm") || m.fileUrl.startsWith("data:audio") || m.fileUrl.includes("audio")));

          const isVideo =
            m.messageType === "video" ||
            (m.fileUrl && (m.fileUrl.match(/\.(mp4|webm|mov|mkv|ogg)/i) || m.fileUrl.includes("video/upload") || m.fileUrl.startsWith("data:video")));

          const isImage =
            !isVideo &&
            (m.messageType === "image" ||
              m.content === "📷 Photo" ||
              (typeof m.content === "string" && m.content.startsWith("📷 Photo")) ||
              (m.fileUrl && (m.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || m.fileUrl.includes("image/upload") || m.fileUrl.startsWith("data:image"))));

          const isEncrypted =
            m.isEncrypted ||
            (typeof m.content === "string" && m.content.startsWith("E2EE::"));

          const isPendingDelete = pendingDeletions && pendingDeletions[m._id] !== undefined;
          const deleteCountdown = isPendingDelete ? pendingDeletions[m._id] : 0;

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
          const showActions = activeMobileActionId === m._id;

          return (
            <div
              key={m._id}
              className={`wa-message-row ${isSender ? "out" : "in"}`}
              onClick={() => setActiveMobileActionId(showActions ? null : m._id)}
            >
              {/* Message Bubble */}
              <div className={`wa-bubble ${isSender ? "out" : "in"}`}>
                {/* Action Bar (Hover on Desktop, Tap on Mobile) */}
                <div className={`wa-action-bar ${showActions ? "active" : ""}`} style={showActions ? { display: "flex" } : {}}>
                  <button
                    className="wa-action-btn"
                    title="React ❤️"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReaction && onReaction(m._id, "❤️");
                    }}
                  >
                    ❤️
                  </button>
                  <button
                    className="wa-action-btn"
                    title="React 👍"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReaction && onReaction(m._id, "👍")}
                    }
                  >
                    👍
                  </button>
                  <button
                    className="wa-action-btn"
                    title="React 😂"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReaction && onReaction(m._id, "😂");
                    }}
                  >
                    😂
                  </button>
                  <button
                    className="wa-action-btn"
                    title="Reply"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReply && onReply(m);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <WaReplyIcon size={14} color="var(--wa-text-secondary)" />
                  </button>

                  {/* Media Download Button in Action Bar */}
                  {(isImage || isVideo) && m.fileUrl && (
                    <button
                      className="wa-action-btn"
                      title="Download media"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadMedia(
                          m.fileUrl,
                          isVideo ? `chatme-video-${m._id}.mp4` : `chatme-image-${m._id}.jpg`
                        );
                      }}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <WaDownloadIcon size={14} color="var(--wa-text-primary)" />
                    </button>
                  )}

                  {/* Delete Button (with 5-second timer countdown) */}
                  {isSender && (
                    <button
                      className="wa-action-btn"
                      title="Delete message (5s timer)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete && onDelete(m._id);
                      }}
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

                {/* 5-Second Deletion Countdown State */}
                {isPendingDelete ? (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(239, 68, 68, 0.18)",
                      border: "1px dashed #EF4444",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                      minWidth: "210px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <WaDeleteIcon size={14} color="#EF4444" />
                      <span style={{ fontSize: "12px", color: "#EF4444", fontWeight: "600" }}>
                        Deleting in {deleteCountdown}s...
                      </span>
                    </div>
                    <button
                      onClick={() => onCancelDelete && onCancelDelete(m._id)}
                      style={{
                        background: "var(--wa-accent, #00a884)",
                        color: "#FFFFFF",
                        border: "none",
                        padding: "3px 12px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Undo
                    </button>
                  </div>
                ) : m.isDeleted ? (
                  /* Deleted state */
                  <span style={{ fontStyle: "italic", opacity: 0.7 }}>
                    🚫 This message was deleted
                  </span>
                ) : (
                  <>
                    {/* Image Message with Direct Download Overlay */}
                    {isImage && m.fileUrl && (
                      <Box position="relative" maxW="280px" mb="4px">
                        <Image
                          src={m.fileUrl}
                          alt="attachment"
                          className="wa-image-thumb"
                          maxH="280px"
                          borderRadius="8px"
                          cursor="pointer"
                          objectFit="cover"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImg(m.fileUrl);
                            setLightboxSender(m.sender?.name || "User");
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadMedia(m.fileUrl, `chatme-photo-${m._id}.jpg`);
                          }}
                          title="Download photo"
                          style={{
                            position: "absolute",
                            top: "6px",
                            right: "6px",
                            background: "rgba(17, 27, 33, 0.8)",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                            transition: "transform 0.15s ease",
                          }}
                          onMouseEnter={(ev) => (ev.currentTarget.style.transform = "scale(1.1)")}
                          onMouseLeave={(ev) => (ev.currentTarget.style.transform = "scale(1)")}
                        >
                          <WaDownloadIcon size={15} />
                        </button>
                      </Box>
                    )}

                    {/* Video Message with Native Controls & Direct Download Overlay */}
                    {isVideo && m.fileUrl && (
                      <Box position="relative" maxW="300px" mb="4px">
                        <video
                          controls
                          src={m.fileUrl}
                          style={{
                            width: "100%",
                            maxHeight: "260px",
                            borderRadius: "8px",
                            display: "block",
                            backgroundColor: "#000",
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadMedia(m.fileUrl, `chatme-video-${m._id}.mp4`);
                          }}
                          title="Download video"
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            background: "rgba(17, 27, 33, 0.82)",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                            zIndex: 2,
                            transition: "transform 0.15s ease",
                          }}
                          onMouseEnter={(ev) => (ev.currentTarget.style.transform = "scale(1.1)")}
                          onMouseLeave={(ev) => (ev.currentTarget.style.transform = "scale(1)")}
                        >
                          <WaDownloadIcon size={15} />
                        </button>
                      </Box>
                    )}

                    {/* Audio Voice Note Message */}
                    {isAudio && (
                      <VoiceNotePlayer audioUrl={m.fileUrl || ""} isSender={isSender} />
                    )}

                    {/* Text Content */}
                    {m.content &&
                      !isAudio &&
                      !isImage &&
                      !isVideo &&
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

                {/* Meta: Time, E2EE / Clock Icon, and Real-Time Status Ticks */}
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

                  {/* WhatsApp Status Tick Logic */}
                  {isSender && !m.isDeleted && !isPendingDelete && (
                    <span style={{ marginLeft: "4px", display: "inline-flex", verticalAlign: "middle" }}>
                      {(() => {
                        const peerId = peerUser?._id ? String(peerUser._id) : null;
                        const isPeerOnline = peerId && onlineUsers?.includes(peerId);

                        // 1. Sent and Seen (Read by peer): Double Blue Ticks
                        const isRead =
                          m.status === "read" ||
                          (m.readBy && (peerId ? m.readBy.some((id) => String(id) === peerId) : m.readBy.length > 0));

                        if (isRead) {
                          return <WaDoubleTickIcon size={16} isRead={true} title="Read / Seen" />;
                        }

                        // 2. Sent and Received (Delivered to peer): Double Grey Ticks
                        const isDelivered =
                          m.status === "delivered" ||
                          (m.deliveredTo && (peerId ? m.deliveredTo.some((id) => String(id) === peerId) : m.deliveredTo.length > 0)) ||
                          isPeerOnline;

                        if (isDelivered) {
                          return <WaDoubleTickIcon size={16} isRead={false} title="Delivered" />;
                        }

                        // 3. Sent but not received: Single Grey Tick
                        return <WaSingleTickIcon size={15} color="#8696a0" title="Sent" />;
                      })()}
                    </span>
                  )}
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

      {/* Image Lightbox Viewer with Download */}
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
