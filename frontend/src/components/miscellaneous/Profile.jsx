import { ViewIcon } from "@chakra-ui/icons";
import {
  Button,
  IconButton,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import React from "react";

const Profile = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <IconButton
          display={{ base: "flex" }}
          icon={<ViewIcon />}
          onClick={onOpen}
          aria-label="View user profile"
          variant="ghost"
          size="sm"
          color="var(--wa-text-secondary)"
          _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-text-primary)" }}
        />
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay bg="rgba(11, 20, 26, 0.75)" backdropFilter="blur(3px)" />
        <ModalContent
          bg="var(--wa-bg-panel)"
          color="var(--wa-text-primary)"
          border="1px solid var(--wa-border)"
          borderRadius="16px"
          boxShadow="0 8px 32px rgba(0, 0, 0, 0.5)"
          p="8px"
        >
          <ModalHeader
            fontSize="22px"
            fontWeight="600"
            display="flex"
            justifyContent="center"
            color="var(--wa-text-primary)"
          >
            {user?.name || "User Profile"}
          </ModalHeader>
          <ModalCloseButton color="var(--wa-text-secondary)" _hover={{ color: "var(--wa-text-primary)" }} />
          <ModalBody
            display="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            py="20px"
          >
            <Image
              borderRadius="full"
              boxSize="130px"
              border="3px solid var(--wa-accent)"
              objectFit="cover"
              alt={
                user?.pic
                  ? `${user?.name}'s profile picture`
                  : `No profile photo`
              }
              src={user?.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"}
            />
            <Text
              fontSize="16px"
              fontWeight="500"
              color="var(--wa-text-secondary)"
              mt={5}
            >
              ✉️ {user?.email || "N/A"}
            </Text>
          </ModalBody>

          <ModalFooter justifyContent="center">
            <Button
              bg="var(--wa-accent)"
              color="white"
              _hover={{ bg: "#008069" }}
              borderRadius="8px"
              px="28px"
              onClick={onClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Profile;
