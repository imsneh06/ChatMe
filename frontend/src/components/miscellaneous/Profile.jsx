import { DeleteIcon, ViewIcon } from "@chakra-ui/icons";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Box,
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
  useToast,
} from "@chakra-ui/react";
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider.jsx";
import { getBackendUrl } from "../../config/api.js";

const Profile = ({ user: profileUser, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user: currentUser, setUser, setSelectedChat, socket } = ChatState();
  const [alertOpen, setAlertOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const cancelRef = useRef();
  const toast = useToast();
  const navigate = useNavigate();
  const apiUrl = getBackendUrl();

  const isOwnProfile =
    currentUser &&
    profileUser &&
    String(currentUser._id) === String(profileUser._id);

  const isDeletedAccount = profileUser?.isDeleted || profileUser?.name === "Deleted User";

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      };

      await axios.delete(`${apiUrl}/api/user/profile`, config);

      toast({
        title: "Account Deleted",
        description: "Your account and profile have been permanently deleted.",
        status: "info",
        duration: 4000,
        isClosable: true,
        position: "top",
      });

      localStorage.removeItem("userInfo");
      if (socket) socket.disconnect();
      setUser(null);
      setSelectedChat(null);
      setAlertOpen(false);
      onClose();
      navigate("/");
    } catch (err) {
      setDeleteLoading(false);
      toast({
        title: "Error deleting account",
        description: err.response?.data?.message || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

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
            {isDeletedAccount ? "Deleted Account" : profileUser?.name || "User Profile"}
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
              border={`3px solid ${isDeletedAccount ? "#EF4444" : "var(--wa-accent)"}`}
              objectFit="cover"
              alt={profileUser?.name}
              src={
                isDeletedAccount
                  ? "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
                  : profileUser?.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
              }
            />
            <Text
              fontSize="16px"
              fontWeight="500"
              color={isDeletedAccount ? "#EF4444" : "var(--wa-text-secondary)"}
              mt={5}
            >
              {isDeletedAccount
                ? "🚫 This account has been deleted"
                : `✉️ ${profileUser?.email || "N/A"}`}
            </Text>
          </ModalBody>

          <ModalFooter justifyContent="space-between">
            {isOwnProfile ? (
              <Button
                colorScheme="red"
                variant="ghost"
                leftIcon={<DeleteIcon />}
                onClick={() => setAlertOpen(true)}
              >
                Delete Account
              </Button>
            ) : (
              <Box />
            )}

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

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        isOpen={alertOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setAlertOpen(false)}
        isCentered
      >
        <AlertDialogOverlay bg="rgba(11, 20, 26, 0.75)" backdropFilter="blur(3px)">
          <AlertDialogContent
            bg="var(--wa-bg-panel)"
            color="var(--wa-text-primary)"
            border="1px solid var(--wa-border)"
            borderRadius="16px"
          >
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Permanently Delete Account?
            </AlertDialogHeader>

            <AlertDialogBody color="var(--wa-text-secondary)">
              Are you sure you want to delete your profile? This will permanently
              remove your account, profile picture, and all personal data. Other
              users will see your messages as "Deleted User". This action cannot
              be undone.
            </AlertDialogBody>

            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} variant="ghost" onClick={() => setAlertOpen(false)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteAccount}
                isLoading={deleteLoading}
              >
                Yes, Delete My Account
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default Profile;
