const https = require("https");

const GEMINI_SYSTEM_PROMPT = `You are Gemini AI, the built-in intelligent assistant in ChatMe (a modern WhatsApp Web experience).
Respond helpfully, politely, and concisely with clean markdown formatting (bolding, lists, code blocks).
Keep your answers engaging, clear, and perfectly formatted for a messaging app interface.`;

/**
 * Call the Google Gemini API using native https (no extra dependencies required)
 */
async function callGeminiApi(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: GEMINI_SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const candidate = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidate) {
              resolve(candidate.trim());
            } else {
              resolve("I'm sorry, I couldn't generate a response for that prompt.");
            }
          } else {
            console.error("Gemini API error:", parsed.error?.message || data);
            resolve(fallbackResponse(prompt));
          }
        } catch (e) {
          console.error("Failed to parse Gemini API response:", e.message);
          resolve(fallbackResponse(prompt));
        }
      });
    });

    req.on("error", (err) => {
      console.error("Gemini request network error:", err.message);
      resolve(fallbackResponse(prompt));
    });

    req.on("timeout", () => {
      req.destroy();
      resolve("The AI request timed out. Please try asking again!");
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Intelligent built-in conversational assistant when GEMINI_API_KEY is not configured
 */
function fallbackResponse(prompt) {
  const p = prompt.toLowerCase().trim();

  if (/^(hi|hello|hey|hola|greetings)/i.test(p)) {
    return "👋 Hello! I am **Gemini AI**, your built-in ChatMe assistant. How can I help you today? You can ask me questions, request code snippets, ask for summaries, or chat with me anytime!";
  }

  if (/who are you|what are you|what is this/i.test(p)) {
    return "🤖 I am **Gemini AI**, an intelligent chatbot integrated directly into ChatMe. You can mention me with `@ai <question>` in any chat or talk to me directly in this 1-on-1 thread!";
  }

  if (/what can you do|features|help/i.test(p)) {
    return `✨ Here is what I can help you with in ChatMe:
- 💡 **Instant Answers**: Ask me anything from tech to general knowledge.
- 💻 **Code & Debugging**: Ask for code snippets in JavaScript, React, Python, etc.
- 📝 **Writing & Summarizing**: Draft messages, summarize threads, or rewrite text.
- 🔒 **Privacy Aware**: ChatMe supports Client-Side E2EE and Disappearing Messages.
- 📞 **Voice & Video**: You can start WebRTC audio/video calls with contacts!

*(Admin note: Set \`GEMINI_API_KEY\` in \`backend/.env\` to enable live Gemini 2.5 Flash API generation)*`;
  }

  if (/time|date/i.test(p)) {
    return `🕒 Current UTC time: **${new Date().toUTCString()}**`;
  }

  if (/tell me a joke|joke/i.test(p)) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "There are 10 types of people in the world: those who understand binary, and those who don't.",
      "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?' 🍺",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  if (/webrtc|call/i.test(p)) {
    return "📞 ChatMe uses native WebRTC with Google STUN servers (`stun.l.google.com:19302`) for peer-to-peer voice and video calls with zero server media overhead!";
  }

  if (/e2ee|encryption|security/i.test(p)) {
    return "🔒 ChatMe features client-side End-to-End Encryption (E2EE) powered by the browser's native **Web Crypto API** (ECDH P-256 + AES-GCM-256). Only you and your chat partner hold the decryption keys!";
  }

  if (/disappearing|expire/i.test(p)) {
    return "⏱️ Disappearing messages can be enabled per-chat (Off, 24 Hours, or 7 Days). Expired messages are automatically purged from storage with native Upstash TTL!";
  }

  return `🤖 **Gemini AI Assistant**:
I received your request: *"${prompt}"*

I'm ready to assist! For deeper reasoning across all topics, make sure \`GEMINI_API_KEY\` is added to your environment. In the meantime, feel free to ask me about coding, chat features, or general guidance!`;
}

/**
 * Main AI handler
 */
async function generateAIResponse(prompt) {
  const cleanPrompt = prompt.replace(/^@ai\s*/i, "").trim();
  if (!cleanPrompt) {
    return "👋 Hi! You mentioned `@ai`. Ask me a question like `@ai explain WebRTC` or `@ai write a haiku about coding`!";
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 0) {
    return await callGeminiApi(cleanPrompt, apiKey.trim());
  }

  return fallbackResponse(cleanPrompt);
}

module.exports = { generateAIResponse };
