import {
  Avatar,
  AvatarBadge,
  Box,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { AddIcon, SearchIcon } from "@chakra-ui/icons";
import ChatLoading from "./ChatLoading.jsx";
import { getSender, getSenderDetails } from "../config/ChatLogics.jsx";
import GroupChatModal from "./miscellaneous/GroupChatModal.jsx";
import { getBackendUrl } from "../config/api.js";
import { formatChatTime } from "../config/formatTime.js";

const MyChats = ({ fetchAgain }) => {
  const apiUrl = getBackendUrl();
  const [loggedUser, setLoggedUser] = useState();
  const [filterQuery, setFilterQuery] = useState("");
  const { user, setSelectedChat, selectedChat, chats, setChats, onlineUsers } =
    ChatState();
  const toast = useToast();

  const fetchChats = async () => {
    if (!user || !user.token) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(`${apiUrl}/api/chat`, config);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error loading chats",
        description: error.response?.data?.message || error.message,
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    if (user && user.token) {
      fetchChats();
    }
  }, [user, fetchAgain]);

  const filteredChats = chats?.filter((chat) => {
    if (!filterQuery.trim()) return true;
    const name = !chat.isGroupChat
      ? getSender(loggedUser || user, chat.users)
      : chat.chatName;
    return name.toLowerCase().includes(filterQuery.toLowerCase());
  });

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      bg="var(--wa-bg-main)"
      w={{ base: "100%", md: "380px", lg: "420px" }}
      h="100%"
      borderRight="1px solid var(--wa-border)"
      overflow="hidden"
    >
      {/* Header bar */}
      <Box
        p="10px 16px"
        bg="var(--wa-bg-panel)"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        borderBottom="1px solid var(--wa-border)"
      >
        <Text fontSize="19px" fontWeight="700" color="var(--wa-text-primary)">
          Chats
        </Text>
        <GroupChatModal>
          <IconButton
            size="sm"
            variant="ghost"
            color="var(--wa-text-secondary)"
            _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-accent)" }}
            icon={<AddIcon />}
            aria-label="New Group Chat"
            title="Create New Group"
          />
        </GroupChatModal>
      </Box>

      {/* WhatsApp Search Box */}
      <Box p="8px 12px" bg="var(--wa-bg-main)" borderBottom="1px solid var(--wa-border)">
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="var(--wa-text-muted)" />
          </InputLeftElement>
          <Input
            placeholder="Search or start new chat"
            borderRadius="8px"
            bg="var(--wa-search-bg)"
            color="var(--wa-text-primary)"
            border="none"
            _focus={{ boxShadow: "none", bg: "var(--wa-bg-hover)" }}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </InputGroup>
      </Box>

      {/* Chat List */}
      <Box flex="1" overflowY="auto">
        {filteredChats ? (
          <Stack spacing="0">
            {filteredChats.map((chat) => {
              const isSelected = selectedChat?._id === chat._id;
              const otherUser = !chat.isGroupChat
                ? getSenderDetails(loggedUser || user, chat.users)
                : null;
              const isOnline = otherUser && onlineUsers.includes(otherUser._id);
              const chatTitle = !chat.isGroupChat
                ? getSender(loggedUser || user, chat.users)
                : chat.chatName;

              return (
                <Box
                  onClick={() => setSelectedChat(chat)}
                  cursor="pointer"
                  bg={isSelected ? "var(--wa-bg-active)" : "transparent"}
                  _hover={{
                    bg: isSelected ? "var(--wa-bg-active)" : "var(--wa-bg-hover)",
                  }}
                  p="12px 16px"
                  display="flex"
                  alignItems="center"
                  borderBottom="1px solid var(--wa-border)"
                  key={chat._id}
                  transition="background 0.15s ease"
                >
                  <Avatar
                    size="md"
                    mr="12px"
                    name={chatTitle}
                    src={otherUser?.pic}
                  >
                    {isOnline && (
                      <AvatarBadge boxSize="1em" bg="var(--wa-accent-light)" />
                    )}
                  </Avatar>

                  <Box flex="1" minW="0">
                    <Box display="flex" justifyContent="space-between" alignItems="baseline">
                      <Text
                        fontWeight="600"
                        fontSize="16px"
                        color="var(--wa-text-primary)"
                        isTruncated
                      >
                        {chatTitle}
                      </Text>
                      <Text fontSize="12px" color="var(--wa-text-muted)" ml="8px">
                        {formatChatTime(
                          chat.latestMessage?.createdAt || chat.updatedAt
                        )}
                      </Text>
                    </Box>

                    <Box display="flex" alignItems="center" mt="2px">
                      <Text
                        fontSize="13.5px"
                        color="var(--wa-text-secondary)"
                        isTruncated
                      >
                        {otherUser?.isDeleted ? (
                          <span style={{ color: "#EF4444", fontStyle: "italic", fontSize: "12.5px" }}>
                            Account Deleted
                          </span>
                        ) : chat.latestMessage ? (
                          `${
                            chat.isGroupChat
                              ? `${chat.latestMessage.sender?.name || ""}: `
                              : ""
                          }${chat.latestMessage.content}`
                        ) : (
                          "Tap to chat"
                        )}
                      </Text>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
