import { ChatState } from "../../Context/ChatProvider.jsx";
import {
  Box,
  Button,
  FormControl,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import React, { useState } from "react";
import UserListItem from "../UserAvatar/UserListItem";
import UserBadgeItem from "../UserAvatar/UserBadgeItem.jsx";
import { getBackendUrl } from "../../config/api.js";

const GroupChatModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const { user, chats, setChats } = ChatState();
  const apiUrl = getBackendUrl();

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query) {
      setSearchResult([]);
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(
        `${apiUrl}/api/user?search=${query}`,
        config
      );
      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Search Error",
        description: error.response?.data?.message || "Failed to search users",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  const handleGroup = (userToAdd) => {
    if (selectedUsers.some((u) => u._id === userToAdd._id)) {
      toast({
        title: "User already added",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    setSelectedUsers([...selectedUsers, userToAdd]);
  };

  const handleDelete = (delUser) => {
    setSelectedUsers(selectedUsers.filter((sel) => sel._id !== delUser._id));
  };

  const handleSubmit = async () => {
    if (!groupChatName || selectedUsers.length < 2) {
      toast({
        title: "Incomplete Group Info",
        description: "Please provide a group name and select at least 2 users.",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.post(
        `${apiUrl}/api/chat/group`,
        {
          name: groupChatName,
          users: JSON.stringify(selectedUsers.map((u) => u._id)),
        },
        config
      );

      setChats([data, ...chats]);
      onClose();
      setSelectedUsers([]);
      setGroupChatName("");
      setSearchResult([]);
      toast({
        title: "New group created!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Failed to create group",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  return (
    <>
      <span onClick={onOpen}>{children}</span>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="rgba(11, 20, 26, 0.75)" backdropFilter="blur(3px)" />
        <ModalContent
          bg="var(--wa-bg-panel)"
          color="var(--wa-text-primary)"
          border="1px solid var(--wa-border)"
          borderRadius="16px"
          boxShadow="0 8px 32px rgba(0, 0, 0, 0.5)"
          p="6px"
        >
          <ModalHeader
            fontSize="22px"
            fontWeight="600"
            display="flex"
            justifyContent="center"
            color="var(--wa-text-primary)"
          >
            Create Group Chat
          </ModalHeader>
          <ModalCloseButton color="var(--wa-text-secondary)" _hover={{ color: "var(--wa-text-primary)" }} />
          <ModalBody display="flex" flexDir="column" alignItems="center">
            <FormControl>
              <Input
                placeholder="Group Chat Name"
                mb={3}
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
                bg="var(--wa-input-bg)"
                color="var(--wa-text-primary)"
                borderColor="var(--wa-border)"
                _placeholder={{ color: "var(--wa-text-muted)" }}
                _focus={{ borderColor: "var(--wa-accent)" }}
              />
            </FormControl>
            <FormControl>
              <Input
                placeholder="Search users (e.g. Guest, Narayan)"
                mb={2}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                bg="var(--wa-input-bg)"
                color="var(--wa-text-primary)"
                borderColor="var(--wa-border)"
                _placeholder={{ color: "var(--wa-text-muted)" }}
                _focus={{ borderColor: "var(--wa-accent)" }}
              />
            </FormControl>

            <Box w="100%" display="flex" flexWrap="wrap" mb={2}>
              {selectedUsers.map((u) => (
                <UserBadgeItem
                  key={u._id}
                  user={u}
                  handleFunction={() => handleDelete(u)}
                />
              ))}
            </Box>

            {loading ? (
              <Box py={3} color="var(--wa-accent)">Loading...</Box>
            ) : (
              searchResult
                ?.slice(0, 4)
                .map((u) => (
                  <UserListItem
                    key={u._id}
                    user={u}
                    handleFunction={() => handleGroup(u)}
                  />
                ))
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              bg="var(--wa-accent)"
              color="white"
              _hover={{ bg: "#008069" }}
              borderRadius="8px"
              w="100%"
              onClick={handleSubmit}
            >
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GroupChatModal;
