import { Box, Button, Stack, Text, useToast } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { AddIcon } from "@chakra-ui/icons";
import ChatLoading from "./ChatLoading.jsx";
import { getSender } from "../config/ChatLogics.jsx";
import GroupChatModal from "./miscellaneous/GroupChatModal.jsx";

const MyChats = ({ fetchAgain }) => {
  const apiUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";
  const [loggedUser, setLoggedUser] = useState();
  const { user, setSelectedChat, selectedChat, chats, setChats } = ChatState();
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

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      alignItems="center"
      p={3}
      borderColor="rgb(14, 209, 134)"
      bg="rgba(255, 255, 255, 0.88)"
      w={{ base: "100%", md: "31%" }}
      borderRadius="lg"
      borderWidth="2px"
    >
      <Box
        pb={3}
        px={3}
        fontSize={{ base: "22px", md: "26px" }}
        fontFamily="Work sans"
        display="flex"
        w="100%"
        justifyContent="space-between"
        alignItems="center"
      >
        My Chats
        <GroupChatModal>
          <Button
            display="flex"
            fontSize={{ base: "14px", md: "12px", lg: "14px" }}
            rightIcon={<AddIcon />}
            colorScheme="teal"
            size="sm"
          >
            New Group
          </Button>
        </GroupChatModal>
      </Box>

      <Box
        display="flex"
        flexDir="column"
        p={3}
        bg="#F8F8F8"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {chats ? (
          <Stack overflowY="scroll">
            {chats.map((chat) => (
              <Box
                onClick={() => setSelectedChat(chat)}
                cursor="pointer"
                bg={selectedChat === chat ? "#38B2AC" : "#E8E8E8"}
                color={selectedChat === chat ? "white" : "black"}
                px={3}
                py={2}
                borderRadius="lg"
                key={chat._id}
              >
                <Text fontWeight="600">
                  {!chat.isGroupChat
                    ? getSender(loggedUser || user, chat.users)
                    : chat.chatName}
                </Text>
                {chat.latestMessage && (
                  <Text fontSize="xs" opacity={0.85}>
                    <b>
                      {chat.latestMessage.sender?.name || "Someone"}:{" "}
                    </b>
                    {chat.latestMessage.content &&
                    chat.latestMessage.content.length > 50
                      ? chat.latestMessage.content.substring(0, 51) + "..."
                      : chat.latestMessage.content}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
