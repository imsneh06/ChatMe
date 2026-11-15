import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import LeftNavRail from "../components/navigation/LeftNavRail.jsx";
import MyChats from "../components/MyChats.jsx";
import ChatBox from "../components/ChatBox.jsx";
import SideDrawer from "../components/miscellaneous/SideDrawer.jsx";

const ChatPage = () => {
  const { user } = ChatState();
  const [fetchAgain, setFetchAgain] = useState(false);

  return (
    <Box
      w="100vw"
      h="100vh"
      display="flex"
      flexDirection="row"
      overflow="hidden"
      bg="var(--wa-bg-deep)"
      position="relative"
    >
      {/* WhatsApp Web Left Vertical Navigation Rail */}
      {user && <LeftNavRail />}

      {/* WhatsApp Chat List Column */}
      {user && <MyChats fetchAgain={fetchAgain} />}

      {/* Active Conversation or Welcome Splash */}
      {user && <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />}

      {/* Contact Search Drawer (Slides from left on compose/search) */}
      {user && <SideDrawer />}
    </Box>
  );
};

export default ChatPage;
