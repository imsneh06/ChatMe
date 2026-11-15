import MyChats from "../components/MyChats.jsx";
import SideDrawer from "../components/miscellaneous/SideDrawer.jsx";
import { ChatState } from "../Context/ChatProvider.jsx";
import { Box } from "@chakra-ui/react";
import ChatBox from "../components/ChatBox.jsx";
import { useState } from "react";

const ChatPage = () => {
  const { user } = ChatState();
  const [fetchAgain, setFetchAgain] = useState(false);

  return (
    <Box w="100vw" h="100vh" display="flex" flexDir="column" overflow="hidden" bg="var(--wa-bg-deep)">
      {user && <SideDrawer />}

      <Box
        display="flex"
        w="100%"
        flex="1"
        overflow="hidden"
        position="relative"
      >
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />}
      </Box>
    </Box>
  );
};

export default ChatPage;
