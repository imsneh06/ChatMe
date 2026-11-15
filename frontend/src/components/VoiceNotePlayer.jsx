import React, { useState, useRef, useEffect } from "react";
import { Box, IconButton, Text } from "@chakra-ui/react";

const VoiceNotePlayer = ({ audioUrl, isSender }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setCurrentTime(audio.currentTime || 0);
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime || 0);
      if (audio.duration && isFinite(audio.duration) && !duration) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("canplay", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("canplay", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Audio playback failed:", err);
          setIsPlaying(false);
        });
    }
  };

  const toggleSpeed = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const clickX = e.nativeEvent.offsetX;
    const width = e.currentTarget.offsetWidth;
    const newTime = (clickX / width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSecs = (secs) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Box display="flex" alignItems="center" gap="10px" py="4px" minW="220px">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Play / Pause circular button */}
      <IconButton
        size="sm"
        borderRadius="full"
        bg={isSender ? "rgba(255, 255, 255, 0.2)" : "var(--wa-accent)"}
        color="white"
        opacity={audioUrl ? 1 : 0.6}
        cursor={audioUrl ? "pointer" : "not-allowed"}
        _hover={audioUrl ? { opacity: 0.9 } : {}}
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        icon={
          isPlaying ? (
            <span style={{ fontSize: "13px" }}>⏸</span>
          ) : (
            <span style={{ fontSize: "13px", marginLeft: "2px" }}>▶</span>
          )
        }
      />

      {/* Progress Track & Simulated Waveform */}
      <Box flex="1" display="flex" flexDir="column" gap="4px">
        <Box
          h="6px"
          bg="rgba(134, 150, 160, 0.3)"
          borderRadius="3px"
          cursor="pointer"
          position="relative"
          onClick={handleSeek}
        >
          <Box
            h="100%"
            w={`${progressPercent}%`}
            bg={isSender ? "white" : "var(--wa-accent-light)"}
            borderRadius="3px"
            transition="width 0.1s linear"
          />
        </Box>

        <Box display="flex" justifyContent="space-between" fontSize="11px" color="var(--wa-text-secondary)">
          <Text>{formatSecs(currentTime || duration)}</Text>
          <span
            style={{
              cursor: "pointer",
              fontWeight: "600",
              background: "rgba(134, 150, 160, 0.2)",
              borderRadius: "4px",
              padding: "0 4px",
              userSelect: "none",
            }}
            onClick={toggleSpeed}
          >
            {playbackSpeed}x
          </span>
        </Box>
      </Box>
    </Box>
  );
};

export default VoiceNotePlayer;
