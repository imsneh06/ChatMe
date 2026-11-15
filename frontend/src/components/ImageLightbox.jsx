import React from "react";
import {
  Button,
  Flex,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { WaDownloadIcon } from "./icons/WhatsAppIcons.jsx";
import { downloadMedia } from "../utils/downloadMedia.js";

const ImageLightbox = ({ isOpen, onClose, imageUrl, senderName }) => {
  const handleDownload = () => {
    downloadMedia(imageUrl, `chatme-image-${Date.now()}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.88)" backdropFilter="blur(6px)" />
      <ModalContent bg="var(--wa-bg-panel, #202c33)" color="var(--wa-text-primary, #e9edef)" borderRadius="12px" overflow="hidden">
        <ModalHeader
          fontSize="15px"
          fontWeight="600"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          pr="48px"
          borderBottom="1px solid var(--wa-border)"
          py="12px"
        >
          <span>Photo from {senderName || "User"}</span>
          <Button
            size="xs"
            leftIcon={<WaDownloadIcon size={14} />}
            bg="var(--wa-accent, #00a884)"
            color="#FFFFFF"
            _hover={{ bg: "var(--wa-accent-light, #25D366)" }}
            onClick={handleDownload}
          >
            Download
          </Button>
        </ModalHeader>
        <ModalCloseButton top="10px" right="14px" color="var(--wa-text-primary)" />
        <ModalBody p="16px" display="flex" justifyContent="center" alignItems="center" bg="#0b141a">
          <Image
            src={imageUrl}
            maxH="75vh"
            maxW="100%"
            borderRadius="8px"
            objectFit="contain"
            boxShadow="0 4px 20px rgba(0,0,0,0.5)"
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ImageLightbox;
