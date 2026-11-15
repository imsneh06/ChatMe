const asyncHandler = require("express-async-handler");
const storageService = require("../services/storageService.js");
const { generateAIResponse } = require("../services/aiService.js");

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, messageType, fileUrl, replyTo, isEncrypted } = req.body;

  if ((!content && !fileUrl) || !chatId) {
    return res.status(400).send({ message: "Invalid message data" });
  }

  try {
    const message = await storageService.createMessage({
      senderId: req.user._id,
      content,
      chatId,
      messageType: messageType || "text",
      fileUrl: fileUrl || null,
      replyTo: replyTo || null,
      isEncrypted: !!isEncrypted,
    });

    res.json(message);

    // Check if message mentions @ai or is sent in a chat with Gemini AI
    const rawContent = typeof content === "string" ? content : "";
    const isAiChat = message.chat?.users?.some(
      (u) => String(typeof u === "object" ? u._id : u) === "user_gemini_ai"
    );
    const mentionsAi = /@ai\b/i.test(rawContent);

    if (mentionsAi || isAiChat) {
      const io = req.app.get("io");

      // Generate response in background without blocking caller
      setTimeout(async () => {
        try {
          if (io) {
            io.to(String(chatId)).emit("typing", {
              room: String(chatId),
              userId: "user_gemini_ai",
              name: "Gemini AI",
            });
          }

          const promptText = rawContent.replace(/@ai/gi, "").trim() || rawContent;
          const aiReply = await generateAIResponse(promptText);

          const aiMessage = await storageService.createMessage({
            senderId: "user_gemini_ai",
            content: aiReply,
            chatId,
            messageType: "text",
            replyTo: {
              _id: message._id,
              content: message.content,
              sender: message.sender,
            },
          });

          if (io) {
            io.to(String(chatId)).emit("stop typing", {
              room: String(chatId),
              userId: "user_gemini_ai",
            });
            io.to(String(chatId)).emit("message recieved", aiMessage);

            if (message.chat?.users) {
              message.chat.users.forEach((u) => {
                const uid = String(typeof u === "object" ? u._id : u);
                if (uid !== "user_gemini_ai") {
                  io.to(uid).emit("message recieved", aiMessage);
                }
              });
            }
          }
        } catch (aiErr) {
          console.error("AI Generation error:", aiErr.message);
          if (io) {
            io.to(String(chatId)).emit("stop typing", {
              room: String(chatId),
              userId: "user_gemini_ai",
            });
          }
        }
      }, 500);
    }
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }
});

const allMessages = asyncHandler(async (req, res) => {
  if (!req.params.chatId) {
    return res.status(400).send({ message: "chatId parameter missing" });
  }

  try {
    const messages = await storageService.getChatMessages(req.params.chatId);
    res.json(messages);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }
});

module.exports = { sendMessage, allMessages };
