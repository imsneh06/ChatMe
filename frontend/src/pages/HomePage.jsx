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
    <Container maxW="xl" centerContent display="flex" justifyContent="center">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={3}
        bg={"rgba(42, 227, 165, 0.95)"}
        w="100%"
        m="40px 0 15px 0"
        borderRadius="2xl"
        borderWidth="3px"
        borderColor="teal.600"
        boxShadow="lg"
      >
        <Text
          fontSize="4xl"
          fontFamily="Work sans"
          color="black"
          fontWeight="bold"
        >
          💬 ChatMe
        </Text>
        <Text fontSize="xs" color="gray.800" fontWeight="500">
          Real-Time Messaging with Socket.io & Upstash / MongoDB
        </Text>
      </Box>
      <Box
        bg="rgba(42, 227, 165, 0.92)"
        w="100%"
        borderRadius="2xl"
        borderWidth="3px"
        borderColor="teal.600"
        p={4}
        boxShadow="lg"
      >
        <Tabs isFitted variant="enclosed">
          <TabList mb="1em">
            <Tab
              borderRadius="xl"
              borderWidth="2px"
              fontWeight={700}
              _selected={{ color: "teal.800", bg: "white" }}
            >
              Login
            </Tab>
            <Tab
              borderRadius="xl"
              borderWidth="2px"
              fontWeight={700}
              _selected={{ color: "teal.800", bg: "white" }}
            >
              Sign Up
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Login />
            </TabPanel>
            <TabPanel>
              <Signup />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
};

export default HomePage;
