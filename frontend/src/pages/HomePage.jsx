import { useNavigate } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import {
  Box,
  Container,
  Tabs,
  Text,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import React, { useEffect } from "react";

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (userInfo) {
      navigate("/chats");
    }
  }, [navigate]);

  return (
    <Box
      w="100vw"
      minH="100vh"
      bg="var(--wa-bg-deep)"
      display="flex"
      flexDir="column"
      alignItems="center"
      position="relative"
      overflowY="auto"
    >
      {/* WhatsApp Web Green Header Banner */}
      <Box
        position="absolute"
        top="0"
        left="0"
        w="100%"
        h="220px"
        bg="var(--wa-accent)"
        zIndex="0"
      />

      <Container maxW="lg" zIndex="1" pt="40px" pb="40px">
        {/* Brand Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap="10px"
          mb="24px"
        >
          <Text fontSize="28px" fontWeight="700" color="white" letterSpacing="0.5px">
            💬 ChatMe for Web
          </Text>
        </Box>

        {/* Auth Box */}
        <Box
          bg="var(--wa-bg-panel)"
          color="var(--wa-text-primary)"
          w="100%"
          borderRadius="8px"
          boxShadow="0 17px 50px 0 rgba(11,20,26,.19), 0 12px 15px 0 rgba(11,20,26,.24)"
          p="28px"
          border="1px solid var(--wa-border)"
        >
          <Tabs isFitted variant="enclosed">
            <TabList mb="20px" borderBottom="1px solid var(--wa-border)">
              <Tab
                fontWeight="600"
                color="var(--wa-text-secondary)"
                _selected={{
                  color: "var(--wa-accent-light)",
                  borderColor: "var(--wa-accent-light)",
                  borderBottom: "2px solid var(--wa-accent-light)",
                }}
              >
                Log In
              </Tab>
              <Tab
                fontWeight="600"
                color="var(--wa-text-secondary)"
                _selected={{
                  color: "var(--wa-accent-light)",
                  borderColor: "var(--wa-accent-light)",
                  borderBottom: "2px solid var(--wa-accent-light)",
                }}
              >
                Sign Up
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel p="0">
                <Login />
              </TabPanel>
              <TabPanel p="0">
                <Signup />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
