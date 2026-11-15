import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
} from "@chakra-ui/react";

const ImageCropModal = ({ isOpen, onClose, imageSrc, onCropComplete }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // Load image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      setZoom(1);
      setPan({ x: 0, y: 0 });
      drawCanvas(1, { x: 0, y: 0 });
    };
  }, [imageSrc]);

  const drawCanvas = (currentZoom, currentPan) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    const size = canvas.width; // 300px
    ctx.clearRect(0, 0, size, size);

    // Calculate dimensions to maintain aspect ratio
    const scale = Math.max(size / img.width, size / img.height) * currentZoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const drawX = (size - drawWidth) / 2 + currentPan.x;
    const drawY = (size - drawHeight) / 2 + currentPan.y;

    // Save and draw image
    ctx.save();
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Draw circular dark vignette overlay
    ctx.fillStyle = "rgba(11, 20, 26, 0.65)";
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw circular border
    ctx.strokeStyle = "#00a884";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextPan = {
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    };
    setPan(nextPan);
    drawCanvas(zoom, nextPan);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (val) => {
    setZoom(val);
    drawCanvas(val, pan);
  };

  const handleApplyCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    // Create high-res 300x300 export canvas
    const exportCanvas = document.createElement("canvas");
    const exportSize = 300;
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const exportCtx = exportCanvas.getContext("2d");

    // Clip to circle
    exportCtx.beginPath();
    exportCtx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
    exportCtx.clip();

    const scale = Math.max(exportSize / img.width, exportSize / img.height) * zoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const drawX = (exportSize - drawWidth) / 2 + pan.x;
    const drawY = (exportSize - drawHeight) / 2 + pan.y;

    exportCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    exportCanvas.toBlob(
      (blob) => {
        const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.9);
        if (onCropComplete) {
          onCropComplete(blob, dataUrl);
        }
        onClose();
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay bg="rgba(11, 20, 26, 0.75)" backdropFilter="blur(3px)" />
      <ModalContent
        bg="var(--wa-bg-panel)"
        color="var(--wa-text-primary)"
        border="1px solid var(--wa-border)"
        borderRadius="16px"
        p="6px"
      >
        <ModalHeader fontSize="20px" fontWeight="600" textAlign="center">
          Crop Profile Photo
        </ModalHeader>
        <ModalCloseButton color="var(--wa-text-secondary)" />

        <ModalBody display="flex" flexDir="column" alignItems="center">
          <Text fontSize="13px" color="var(--wa-text-secondary)" mb={3}>
            Drag image to reposition face, slider to zoom in/out
          </Text>

          <Box
            w="300px"
            h="300px"
            borderRadius="full"
            overflow="hidden"
            cursor={isDragging ? "grabbing" : "grab"}
            boxShadow="0 4px 16px rgba(0,0,0,0.4)"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              style={{ display: "block", userSelect: "none" }}
            />
          </Box>

          {/* Zoom Slider */}
          <Box w="80%" mt={5} display="flex" alignItems="center" gap={3}>
            <Text fontSize="12px" color="var(--wa-text-secondary)">
              🔍-
            </Text>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={handleZoomChange}
            >
              <SliderTrack bg="var(--wa-input-bg)">
                <SliderFilledTrack bg="var(--wa-accent)" />
              </SliderTrack>
              <SliderThumb boxSize={4} bg="var(--wa-accent)" />
            </Slider>
            <Text fontSize="12px" color="var(--wa-text-secondary)">
              🔍+
            </Text>
          </Box>
        </ModalBody>

        <ModalFooter display="flex" gap={2} justifyContent="flex-end">
          <Button variant="ghost" color="var(--wa-text-secondary)" onClick={onClose}>
            Cancel
          </Button>
          <Button
            bg="var(--wa-accent)"
            color="white"
            _hover={{ bg: "#008069" }}
            onClick={handleApplyCrop}
          >
            Apply & Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ImageCropModal;
