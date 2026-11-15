import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";
import { getBackendUrl } from "../config/api.js";
import { callSounds } from "../utils/callSounds.js";
import { getOrGenerateUserKeyPair } from "../utils/crypto.js";
import CallModal from "../components/CallModal.jsx";

const ChatContext = createContext();

let socket;

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

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
    // AudioContext blocked
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
    return saved ? saved === "dark" : true;
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Client-Side E2EE Keys
  const [e2eeKeys, setE2eeKeys] = useState(null);

  // WebRTC Call State
  const [callState, setCallState] = useState({
    isOpen: false,
    isReceivingCall: false,
    isCalling: false,
    callAccepted: false,
    callerId: null,
    callerName: "",
    callerPic: "",
    isVideo: false,
    localStream: null,
    remoteStream: null,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callPartnerIdRef = useRef(null);
  const incomingSignalRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);

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

  // Load User Info
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

  // Initialize E2EE Keys
  useEffect(() => {
    if (!user?._id) return;

    (async () => {
      try {
        const keys = await getOrGenerateUserKeyPair(user._id);
        if (keys) {
          setE2eeKeys(keys);

          // Sync public key to server if not already stored
          const pubString = JSON.stringify(keys.publicKeyJwk);
          if (user.publicKey !== pubString) {
            await axios.put(
              `${apiUrl}/api/user/keys`,
              { publicKey: pubString },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${user.token}`,
                },
              }
            );
          }
        }
      } catch (e) {
        console.warn("E2EE key sync notice:", e.message);
      }
    })();
  }, [user, apiUrl]);

  // Clean up WebRTC peer connection and streams
  const cleanupCall = () => {
    callSounds.stop();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    incomingSignalRef.current = null;
    callPartnerIdRef.current = null;
    iceCandidateQueueRef.current = [];

    setCallState({
      isOpen: false,
      isReceivingCall: false,
      isCalling: false,
      callAccepted: false,
      callerId: null,
      callerName: "",
      callerPic: "",
      isVideo: false,
      localStream: null,
      remoteStream: null,
    });
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // Create an RTCPeerConnection instance
  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && targetUserId) {
        socket.emit("call:ice-candidate", {
          to: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setCallState((prev) => ({
          ...prev,
          remoteStream: event.streams[0],
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        cleanupCall();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // Start outgoing call
  const startCall = async ({ userToCall, isVideo = false }) => {
    if (!socket || !user || !userToCall) return;

    try {
      cleanupCall();
      callPartnerIdRef.current = String(userToCall._id);

      // Acquire camera / microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });

      localStreamRef.current = stream;

      setCallState({
        isOpen: true,
        isReceivingCall: false,
        isCalling: true,
        callAccepted: false,
        callerId: String(userToCall._id),
        callerName: userToCall.name,
        callerPic: userToCall.pic,
        isVideo,
        localStream: stream,
        remoteStream: null,
      });

      callSounds.startOutgoingRing();

      const pc = createPeerConnection(String(userToCall._id));
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:user", {
        userToCall: String(userToCall._id),
        signalData: offer,
        from: user._id,
        fromName: user.name,
        fromPic: user.pic,
        isVideo,
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanupCall();
      alert("Unable to access camera or microphone: " + (err.message || "Permission denied"));
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    if (!socket || !incomingSignalRef.current || !callPartnerIdRef.current) return;

    try {
      callSounds.stop();
      const targetUserId = callPartnerIdRef.current;
      const isVideo = callState.isVideo;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });

      localStreamRef.current = stream;

      const pc = createPeerConnection(targetUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignalRef.current));

      // Process any queued ICE candidates
      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error adding queued ICE candidate:", e);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:accept", {
        to: targetUserId,
        signalData: answer,
      });

      setCallState((prev) => ({
        ...prev,
        isReceivingCall: false,
        isCalling: false,
        callAccepted: true,
        localStream: stream,
      }));
    } catch (err) {
      console.error("Failed to answer call:", err);
      rejectCall();
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (socket && callPartnerIdRef.current) {
      socket.emit("call:reject", { to: callPartnerIdRef.current });
    }
    callSounds.playCallEnd();
    cleanupCall();
  };

  // End active call
  const endCall = () => {
    if (socket && callPartnerIdRef.current) {
      socket.emit("call:end", { to: callPartnerIdRef.current });
    }
    callSounds.playCallEnd();
    cleanupCall();
  };

  // Toggle microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Global socket setup & WebRTC signaling listeners
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

    // Incoming WebRTC Call
    const handleIncomingCall = ({ signal, from, fromName, fromPic, isVideo }) => {
      incomingSignalRef.current = signal;
      callPartnerIdRef.current = String(from);

      setCallState({
        isOpen: true,
        isReceivingCall: true,
        isCalling: false,
        callAccepted: false,
        callerId: String(from),
        callerName: fromName || "Incoming Caller",
        callerPic: fromPic,
        isVideo: !!isVideo,
        localStream: null,
        remoteStream: null,
      });

      callSounds.startIncomingRing();
    };

    // Call Accepted by peer
    const handleCallAccepted = async ({ signal }) => {
      callSounds.stop();
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));

          // Process queued ICE candidates
          while (iceCandidateQueueRef.current.length > 0) {
            const candidate = iceCandidateQueueRef.current.shift();
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn("Error adding queued ICE candidate:", e);
            }
          }

          setCallState((prev) => ({
            ...prev,
            isCalling: false,
            callAccepted: true,
          }));
        } catch (err) {
          console.error("Error setting remote description on accept:", err);
        }
      }
    };

    // Remote ICE candidate received
    const handleIceCandidate = async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Failed to add ICE candidate:", err);
        }
      } else {
        iceCandidateQueueRef.current.push(candidate);
      }
    };

    // Call Ended or Rejected by peer
    const handleCallEnded = () => {
      callSounds.playCallEnd();
      cleanupCall();
    };

    // Global Message Receiver
    const handleGlobalMessage = (newMessageRecieved) => {
      const activeChat = selectedChatRef.current;
      const incomingChatId = newMessageRecieved.chat?._id || newMessageRecieved.chat;

      setChats((prevChats) =>
        prevChats.map((c) =>
          String(c._id) === String(incomingChatId)
            ? { ...c, latestMessage: newMessageRecieved, updatedAt: new Date().toISOString() }
            : c
        )
      );

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

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallEnded);
    socket.on("message recieved", handleGlobalMessage);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallEnded);
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
        e2eeKeys,
        startCall,
        callState,
        isSearchOpen,
        setIsSearchOpen,
      }}
    >
      {children}

      {/* Global Call Modal Overlay */}
      <CallModal
        callState={callState}
        onAnswer={answerCall}
        onReject={rejectCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
      />
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
