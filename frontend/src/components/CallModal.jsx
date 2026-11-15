import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Avatar,
  IconButton,
  Button,
  Badge,
} from "@chakra-ui/react";
import {
  FaPhoneAlt,
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaLock,
} from "react-icons/fa";

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
      bg="rgba(11, 20, 26, 0.94)"
      backdropFilter="blur(10px)"
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="20px"
    >
      {/* Hidden audio element for remote stream in voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <Box
        position="relative"
        w="100%"
        maxW={isVideo && callAccepted ? "860px" : "440px"}
        h={isVideo && callAccepted ? "80vh" : "auto"}
        minH={isVideo && callAccepted ? "500px" : "420px"}
        bg="var(--wa-bg-panel, #111b21)"
        borderRadius="16px"
        overflow="hidden"
        boxShadow="0 20px 40px rgba(0,0,0,0.6)"
        border="1px solid var(--wa-border, rgba(255,255,255,0.1))"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
      >
        {/* Top Header */}
        <Flex
          justify="space-between"
          align="center"
          p="16px 20px"
          bg="rgba(17, 27, 33, 0.85)"
          borderBottom="1px solid rgba(255, 255, 255, 0.06)"
          zIndex={10}
        >
          <Flex align="center" gap="10px">
            <FaLock color="var(--wa-accent-light, #25D366)" fontSize="13px" />
            <Text fontSize="12px" color="var(--wa-text-secondary, #8696a0)" fontWeight="500">
              End-to-End Encrypted
            </Text>
          </Flex>

          {callAccepted && (
            <Badge
              bg="rgba(37, 211, 102, 0.15)"
              color="var(--wa-accent-light, #25D366)"
              px="10px"
              py="3px"
              borderRadius="full"
              fontSize="12px"
            >
              {formatTime(callDuration)}
            </Badge>
          )}
        </Flex>

        {/* Center Content: Video or Voice View */}
        <Box flex="1" position="relative" display="flex" alignItems="center" justifyContent="center">
          {/* Active Video Call */}
          {isVideo && callAccepted ? (
            <Box w="100%" h="100%" position="relative" bg="#000">
              {/* Remote Video (Main) */}
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

              {/* Local Video (Picture-in-Picture) */}
              <Box
                position="absolute"
                bottom="16px"
                right="16px"
                w="160px"
                h="110px"
                borderRadius="10px"
                overflow="hidden"
                boxShadow="0 4px 12px rgba(0,0,0,0.5)"
                border="2px solid var(--wa-accent-light, #25D366)"
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
                    transform: "scaleX(-1)", // Mirror effect
                    display: isVideoOff ? "none" : "block",
                  }}
                />
                {isVideoOff && (
                  <Flex w="100%" h="100%" align="center" justify="center" bg="#1f2c34">
                    <FaVideoSlash color="#8696a0" fontSize="20px" />
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
              py="30px"
              gap="16px"
              textAlign="center"
            >
              <Box position="relative">
                <Box
                  position="absolute"
                  top="-10px"
                  left="-10px"
                  right="-10px"
                  bottom="-10px"
                  borderRadius="full"
                  border="2px solid var(--wa-accent-light, #25D366)"
                  opacity={callAccepted || isReceivingCall ? 0.7 : 0.2}
                  animation="pulse 2s infinite"
                />
                <Avatar
                  size="2xl"
                  name={callerName || "User"}
                  src={callerPic}
                  border="3px solid var(--wa-accent-light, #25D366)"
                  boxShadow="0 8px 24px rgba(0,0,0,0.4)"
                />
              </Box>

              <Box>
                <Text fontSize="22px" fontWeight="700" color="var(--wa-text-primary, #e9edef)">
                  {callerName || "User"}
                </Text>
                <Text fontSize="14px" color="var(--wa-text-secondary, #8696a0)" mt="4px">
                  {isReceivingCall
                    ? isVideo
                      ? "Incoming Video Call..."
                      : "Incoming Voice Call..."
                    : isCalling
                    ? "Calling..."
                    : callAccepted
                    ? isVideo
                      ? "Video Call"
                      : "Voice Call"
                    : "Connecting..."}
                </Text>
              </Box>
            </Flex>
          )}
        </Box>

        {/* Bottom Control Bar */}
        <Flex
          justify="center"
          align="center"
          gap="18px"
          p="20px"
          bg="rgba(17, 27, 33, 0.9)"
          borderTop="1px solid rgba(255, 255, 255, 0.06)"
          zIndex={10}
        >
          {isReceivingCall && !callAccepted ? (
            /* Incoming Call Controls: Answer or Decline */
            <>
              <IconButton
                isRound
                size="lg"
                bg="#EF4444"
                _hover={{ bg: "#DC2626" }}
                color="white"
                icon={<FaPhoneSlash fontSize="22px" />}
                onClick={onReject}
                aria-label="Decline Call"
                boxShadow="0 4px 14px rgba(239, 68, 68, 0.4)"
              />
              <IconButton
                isRound
                size="lg"
                bg="#25D366"
                _hover={{ bg: "#22c35e" }}
                color="white"
                icon={<FaPhoneAlt fontSize="22px" />}
                onClick={onAnswer}
                aria-label="Answer Call"
                boxShadow="0 4px 14px rgba(37, 211, 102, 0.4)"
              />
            </>
          ) : (
            /* In-Call or Calling Controls: Mute, Video Toggle, End Call */
            <>
              {callAccepted && (
                <IconButton
                  isRound
                  size="md"
                  variant="ghost"
                  bg={isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.1)"}
                  color={isMuted ? "#EF4444" : "var(--wa-text-primary, #e9edef)"}
                  _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
                  icon={isMuted ? <FaMicrophoneSlash fontSize="18px" /> : <FaMicrophone fontSize="18px" />}
                  onClick={onToggleMute}
                  aria-label="Toggle Mute"
                />
              )}

              {isVideo && callAccepted && (
                <IconButton
                  isRound
                  size="md"
                  variant="ghost"
                  bg={isVideoOff ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.1)"}
                  color={isVideoOff ? "#EF4444" : "var(--wa-text-primary, #e9edef)"}
                  _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
                  icon={isVideoOff ? <FaVideoSlash fontSize="18px" /> : <FaVideo fontSize="18px" />}
                  onClick={onToggleVideo}
                  aria-label="Toggle Camera"
                />
              )}

              <IconButton
                isRound
                size="lg"
                bg="#EF4444"
                _hover={{ bg: "#DC2626" }}
                color="white"
                icon={<FaPhoneSlash fontSize="22px" />}
                onClick={onEnd}
                aria-label="End Call"
                boxShadow="0 4px 14px rgba(239, 68, 68, 0.4)"
              />
            </>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default CallModal;
