import React from "react";
import {
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";

const ImageLightbox = ({ isOpen, onClose, imageUrl, senderName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.85)" />
      <ModalContent bg="var(--wa-bg-panel)" color="var(--wa-text-primary)">
        <ModalHeader fontSize="16px" fontWeight="500">
          Photo from {senderName || "User"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p="10px" display="flex" justifyContent="center" alignItems="center">
          <Image
            src={imageUrl}
            maxH="75vh"
            maxW="100%"
            borderRadius="6px"
            objectFit="contain"
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ImageLightbox;
