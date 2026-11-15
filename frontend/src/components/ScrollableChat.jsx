import { ChatState } from "../Context/ChatProvider.jsx";
import React, { useEffect, useRef, useState } from "react";
import { formatMessageTime } from "../config/formatTime.js";
import VoiceNotePlayer from "./VoiceNotePlayer.jsx";
import ImageLightbox from "./ImageLightbox.jsx";
import { Image, Box } from "@chakra-ui/react";

const ScrollableChat = ({ messages, isGroupChat, onReply, onReaction, onDelete }) => {
  const { user } = ChatState();
  const bottomRef = useRef(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [lightboxSender, setLightboxSender] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      {messages &&
        messages.map((m) => {
          const isSender = String(m.sender?._id || m.sender) === String(user?._id);
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
                  >
                    ↩
                  </button>
                  {isSender && (
                    <button
                      className="wa-action-btn"
                      title="Delete"
                      onClick={() => onDelete && onDelete(m._id)}
                    >
                      🗑
                    </button>
                  )}
                </div>

                {/* Sender Name in Group Chat */}
                {!isSender && isGroupChat && (
                  <div className="wa-group-sender">
                    {m.sender?.name || "Participant"}
                  </div>
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
                        <span>{m.content}</span>
                      )}
                  </>
                )}

                {/* Meta: Time and Status Ticks */}
                <span className="wa-meta">
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
