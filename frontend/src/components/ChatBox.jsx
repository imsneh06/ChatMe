import { Box } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import React from "react";
import SingleChat from "./SingleChat.jsx";

const ChatBox = ({ fetchAgain, setFetchAgain }) => {
  const { selectedChat } = ChatState();

  return (
    <Box
      display={{ base: selectedChat ? "flex" : "none", md: "flex" }}
      flex="1"
      minW="0"
      w={{ base: "100%", md: "auto" }}
      h="100%"
      overflow="hidden"
      flexDir="column"
      position="relative"
    >
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
    </Box>
  );
};

export default ChatBox;
