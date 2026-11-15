import { ChatState } from "../../Context/ChatProvider.jsx";
import { ViewIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import React, { useState } from "react";
import UserBadgeItem from "../UserAvatar/UserBadgeItem.jsx";
import axios from "axios";
import UserListItem from "../UserAvatar/UserListItem.jsx";
import { getBackendUrl } from "../../config/api.js";

function UpdateGroupChatModal({ fetchAgain, setFetchAgain, fetchMessages }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);

  const apiUrl = getBackendUrl();
  const toast = useToast();
  const { selectedChat, setSelectedChat, user } = ChatState();

  const handleRemove = async (user1) => {
    const adminId = selectedChat.groupAdmin?._id || selectedChat.groupAdmin;
    if (String(adminId) !== String(user._id) && String(user1._id) !== String(user._id)) {
      toast({
        title: "Action Not Allowed",
        description: "Only group admins can remove other users!",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.put(
        `${apiUrl}/api/chat/groupremove`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        config
      );

      String(user1._id) === String(user._id) ? setSelectedChat(null) : setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      if (fetchMessages) fetchMessages();
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error removing user",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const handleAddUser = async (user1) => {
    if (selectedChat.users.some((u) => String(u._id) === String(user1._id))) {
      toast({
        title: "User Already in Group",
        description: `${user1.name} is already a member of this group.`,
        status: "info",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    const adminId = selectedChat.groupAdmin?._id || selectedChat.groupAdmin;
    if (String(adminId) !== String(user._id)) {
      toast({
        title: "Action Not Allowed",
        description: "Only group admins can add users!",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.put(
        `${apiUrl}/api/chat/groupadd`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        config
      );

      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error adding user",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const handleRename = async () => {
    if (!groupChatName) return;

    try {
      setRenameLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.put(
        `${apiUrl}/api/chat/rename`,
        {
          chatId: selectedChat._id,
          chatName: groupChatName,
        },
        config
      );

      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setRenameLoading(false);
      setGroupChatName("");
      toast({
        title: "Group Renamed",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      setRenameLoading(false);
      toast({
        title: "Error renaming group",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

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
        title: "Error searching users",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  return (
    <>
      <IconButton
        display={{ base: "flex" }}
        icon={<ViewIcon />}
        onClick={onOpen}
        aria-label="View group settings"
        variant="ghost"
        size="sm"
        color="var(--wa-text-secondary)"
        _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-text-primary)" }}
      />

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
            {selectedChat.chatName}
          </ModalHeader>
          <ModalCloseButton color="var(--wa-text-secondary)" _hover={{ color: "var(--wa-text-primary)" }} />
          <ModalBody display="flex" flexDir="column" alignItems="center">
            <Box w="100%" display="flex" flexWrap="wrap" pb={3}>
              {selectedChat.users.map((u) => (
                <UserBadgeItem
                  key={u._id}
                  user={u}
                  handleFunction={() => handleRemove(u)}
                />
              ))}
            </Box>

            <FormControl display="flex" mb={3}>
              <Input
                placeholder="New Group Name"
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
                bg="var(--wa-input-bg)"
                color="var(--wa-text-primary)"
                borderColor="var(--wa-border)"
                _placeholder={{ color: "var(--wa-text-muted)" }}
                _focus={{ borderColor: "var(--wa-accent)" }}
              />
              <Button
                variant="solid"
                bg="var(--wa-accent)"
                color="white"
                _hover={{ bg: "#008069" }}
                ml={2}
                isLoading={renameLoading}
                onClick={handleRename}
              >
                Update
              </Button>
            </FormControl>

            <FormControl mb={2}>
              <Input
                placeholder="Add User to group"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                bg="var(--wa-input-bg)"
                color="var(--wa-text-primary)"
                borderColor="var(--wa-border)"
                _placeholder={{ color: "var(--wa-text-muted)" }}
                _focus={{ borderColor: "var(--wa-accent)" }}
              />
            </FormControl>

            {loading ? (
              <Spinner size="lg" color="var(--wa-accent)" my={3} />
            ) : (
              searchResult?.map((u) => (
                <UserListItem
                  key={u._id}
                  user={u}
                  handleFunction={() => handleAddUser(u)}
                />
              ))
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              bg="#EF4444"
              color="white"
              _hover={{ bg: "#DC2626" }}
              borderRadius="8px"
              w="100%"
              onClick={() => handleRemove(user)}
            >
              Leave Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default UpdateGroupChatModal;
