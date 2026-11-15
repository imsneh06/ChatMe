import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Avatar,
  Badge,
} from "@chakra-ui/react";
import {
  WaPhoneIcon,
  WaPhoneHangupIcon,
  WaVideoIcon,
  WaVideoOffIcon,
  WaMicIcon,
  WaMicMutedIcon,
} from "./icons/WhatsAppIcons.jsx";
import { FaLock } from "react-icons/fa";

const CallModal = ({
  callState,
  onAnswer,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  isMuted,
  isVideoOff,
}) => {
  const {
    isOpen,
    isReceivingCall,
    isCalling,
    callAccepted,
    callerName,
    callerPic,
    isVideo,
    localStream,
    remoteStream,
  } = callState;

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  // Attach local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isOpen]);

  // Attach remote video and audio streams
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callAccepted]);

  // Call timer
  useEffect(() => {
    let timer;
    if (callAccepted) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callAccepted]);

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      w="100vw"
      h="100vh"
      bg="rgba(11, 20, 26, 0.95)"
      backdropFilter="blur(14px)"
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="16px"
    >
      {/* Hidden audio element for remote stream in voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <Box
        position="relative"
        w="100%"
        maxW={isVideo && callAccepted ? "880px" : "420px"}
        h={isVideo && callAccepted ? "82vh" : "auto"}
        minH={isVideo && callAccepted ? "520px" : "460px"}
        bg="var(--wa-bg-panel, #111b21)"
        borderRadius="20px"
        overflow="hidden"
        boxShadow="0 24px 50px rgba(0, 0, 0, 0.75)"
        border="1px solid rgba(255, 255, 255, 0.08)"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
      >
        {/* Top Header */}
        <Flex
          justify="space-between"
          align="center"
          px="22px"
          py="16px"
          bg="rgba(17, 27, 33, 0.9)"
          borderBottom="1px solid rgba(255, 255, 255, 0.06)"
          zIndex={10}
        >
          <Flex align="center" gap="8px">
            <FaLock color="#25D366" fontSize="12px" />
            <Text fontSize="12.5px" color="var(--wa-text-secondary, #8696a0)" fontWeight="500">
              End-to-End Encrypted
            </Text>
          </Flex>

          {callAccepted ? (
            <Badge
              bg="rgba(37, 211, 102, 0.15)"
              color="#25D366"
              px="12px"
              py="4px"
              borderRadius="full"
              fontSize="12.5px"
              fontWeight="600"
              letterSpacing="0.5px"
            >
              {formatTime(callDuration)}
            </Badge>
          ) : (
            <Badge
              bg="rgba(255, 255, 255, 0.06)"
              color="var(--wa-text-secondary, #8696a0)"
              px="10px"
              py="3px"
              borderRadius="full"
              fontSize="11.5px"
            >
              {isVideo ? "Video" : "Voice"}
            </Badge>
          )}
        </Flex>

        {/* Center View */}
        <Box flex="1" position="relative" display="flex" alignItems="center" justifyContent="center">
          {/* Active Video Call */}
          {isVideo && callAccepted ? (
            <Box w="100%" h="100%" position="relative" bg="#000">
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />

              {/* Local Video Stream (Picture-in-Picture) */}
              <Box
                position="absolute"
                bottom="16px"
                right="16px"
                w="160px"
                h="115px"
                borderRadius="12px"
                overflow="hidden"
                boxShadow="0 8px 24px rgba(0,0,0,0.6)"
                border="2px solid #25D366"
                bg="#1a1a1a"
                zIndex={5}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    display: isVideoOff ? "none" : "block",
                  }}
                />
                {isVideoOff && (
                  <Flex w="100%" h="100%" align="center" justify="center" bg="#1f2c34">
                    <WaVideoOffIcon size={24} color="#8696a0" />
                  </Flex>
                )}
              </Box>
            </Box>
          ) : (
            /* Voice Call or Ringing State */
            <Flex
              direction="column"
              align="center"
              justify="center"
              py="36px"
              gap="18px"
              textAlign="center"
            >
              <Box position="relative">
                <Box
                  position="absolute"
                  top="-12px"
                  left="-12px"
                  right="-12px"
                  bottom="-12px"
                  borderRadius="full"
                  border="2px solid #25D366"
                  opacity={isReceivingCall || isCalling ? 0.6 : 0.2}
                  style={{
                    animation: isReceivingCall || isCalling ? "waPulseRing 2s infinite ease-out" : "none",
                  }}
                />
                <Avatar
                  size="2xl"
                  name={callerName || "User"}
                  src={callerPic}
                  border="3px solid #25D366"
                  boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                />
              </Box>

              <Box>
                <Text fontSize="22px" fontWeight="700" color="var(--wa-text-primary, #e9edef)" letterSpacing="-0.3px">
                  {callerName || "User"}
                </Text>
                <Flex align="center" justify="center" gap="6px" mt="6px">
                  {isVideo ? (
                    <WaVideoIcon size={14} color="#25D366" />
                  ) : (
                    <WaPhoneIcon size={13} color="#25D366" />
                  )}
                  <Text fontSize="13.5px" color="var(--wa-text-secondary, #8696a0)">
                    {isReceivingCall
                      ? isVideo
                        ? "Incoming WhatsApp Video Call..."
                        : "Incoming WhatsApp Voice Call..."
                      : isCalling
                      ? "Calling..."
                      : callAccepted
                      ? isVideo
                        ? "WhatsApp Video Call"
                        : "WhatsApp Voice Call"
                      : "Connecting..."}
                  </Text>
                </Flex>
              </Box>
            </Flex>
          )}
        </Box>

        {/* Bottom Control Bar */}
        <Flex
          justify="center"
          align="center"
          gap="28px"
          px="24px"
          py="24px"
          bg="rgba(17, 27, 33, 0.95)"
          borderTop="1px solid rgba(255, 255, 255, 0.06)"
          zIndex={10}
        >
          {isReceivingCall && !callAccepted ? (
            /* Incoming Call Controls: Decline and Accept Handsets with Labels */
            <>
              {/* Decline Call Button */}
              <Flex direction="column" align="center" gap="8px">
                <button
                  onClick={onReject}
                  aria-label="Decline Call"
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "#EA4335",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(234, 67, 53, 0.45)",
                    transition: "transform 0.15s ease, background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <WaPhoneHangupIcon size={26} color="#FFFFFF" />
                </button>
                <Text fontSize="12px" fontWeight="600" color="var(--wa-text-secondary, #8696a0)">
                  Decline
                </Text>
              </Flex>

              {/* Accept Call Button */}
              <Flex direction="column" align="center" gap="8px">
                <button
                  onClick={onAnswer}
                  aria-label="Answer Call"
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "#25D366",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(37, 211, 102, 0.5)",
                    transition: "transform 0.15s ease, background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <WaPhoneIcon size={26} color="#FFFFFF" />
                </button>
                <Text fontSize="12px" fontWeight="600" color="#25D366">
                  Accept
                </Text>
              </Flex>
            </>
          ) : (
            /* In-Call or Calling Controls: Mute, Camera, End Call */
            <>
              {callAccepted && (
                <Flex direction="column" align="center" gap="6px">
                  <button
                    onClick={onToggleMute}
                    aria-label="Toggle Microphone"
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      background: isMuted ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.1)",
                      border: isMuted ? "1px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.12)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isMuted ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isMuted ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.1)")}
                  >
                    {isMuted ? (
                      <WaMicMutedIcon size={22} color="#EF4444" />
                    ) : (
                      <WaMicIcon size={22} color="#e9edef" />
                    )}
                  </button>
                  <Text fontSize="11px" color={isMuted ? "#EF4444" : "var(--wa-text-secondary, #8696a0)"}>
                    {isMuted ? "Muted" : "Mute"}
                  </Text>
                </Flex>
              )}

              {isVideo && callAccepted && (
                <Flex direction="column" align="center" gap="6px">
                  <button
                    onClick={onToggleVideo}
                    aria-label="Toggle Camera"
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      background: isVideoOff ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.1)",
                      border: isVideoOff ? "1px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.12)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isVideoOff ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isVideoOff ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.1)")}
                  >
                    {isVideoOff ? (
                      <WaVideoOffIcon size={22} color="#EF4444" />
                    ) : (
                      <WaVideoIcon size={22} color="#e9edef" />
                    )}
                  </button>
                  <Text fontSize="11px" color={isVideoOff ? "#EF4444" : "var(--wa-text-secondary, #8696a0)"}>
                    {isVideoOff ? "Cam Off" : "Camera"}
                  </Text>
                </Flex>
              )}

              {/* End Call Button */}
              <Flex direction="column" align="center" gap="6px">
                <button
                  onClick={onEnd}
                  aria-label="End Call"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#EA4335",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(234, 67, 53, 0.45)",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <WaPhoneHangupIcon size={26} color="#FFFFFF" />
                </button>
                <Text fontSize="11.5px" fontWeight="600" color="#EF4444">
                  End
                </Text>
              </Flex>
            </>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default CallModal;
