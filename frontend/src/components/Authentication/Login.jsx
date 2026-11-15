import React, { useState } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  useToast,
  VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider.jsx";
import { getBackendUrl } from "../../config/api.js";

const Login = () => {
  const apiUrl = getBackendUrl();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { setUser } = ChatState();

  const handleClick = () => {
    setShow(!show);
  };

  const fillDemoCredentials = () => {
    setEmail("guest@example.com");
    setPassword("password123");
  };

  const submitHandler = async () => {
    setLoading(true);
    if (!email || !password) {
      toast({
        title: "Please fill all the fields",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };
      const { data } = await axios.post(
        `${apiUrl}/api/user/login`,
        { email, password },
        config
      );

      toast({
        title: "Login Successful",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      setLoading(false);
      navigate("/chats");
    } catch (error) {
      toast({
        title: "Login Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Could not connect to the server",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  return (
    <VStack spacing="14px">
      <FormControl id="login-email" isRequired>
        <FormLabel fontWeight="500" fontSize="14px" color="var(--wa-text-primary)">
          Email Address
        </FormLabel>
        <Input
          bg="var(--wa-input-bg)"
          color="var(--wa-text-primary)"
          borderColor="var(--wa-border)"
          type="email"
          placeholder="Enter Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          _focus={{ borderColor: "var(--wa-accent)" }}
        />
      </FormControl>

      <FormControl id="login-password" isRequired>
        <FormLabel fontWeight="500" fontSize="14px" color="var(--wa-text-primary)">
          Password
        </FormLabel>
        <InputGroup>
          <Input
            type={show ? "text" : "password"}
            bg="var(--wa-input-bg)"
            color="var(--wa-text-primary)"
            borderColor="var(--wa-border)"
            placeholder="Enter Your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            _focus={{ borderColor: "var(--wa-accent)" }}
          />
          <InputRightElement width="4.5rem">
            <Button
              h="1.75rem"
              size="xs"
              variant="ghost"
              color="var(--wa-text-secondary)"
              onClick={handleClick}
            >
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        bg="var(--wa-accent)"
        _hover={{ bg: "var(--wa-accent-light)" }}
        color="white"
        width="100%"
        mt="10px"
        onClick={submitHandler}
        isLoading={loading}
      >
        Log In
      </Button>

      <Button
        variant="outline"
        borderColor="var(--wa-accent)"
        color="var(--wa-accent-light)"
        _hover={{ bg: "rgba(0, 168, 132, 0.1)" }}
        width="100%"
        onClick={fillDemoCredentials}
      >
        Use Demo Guest Account
      </Button>
    </VStack>
  );
};

export default Login;
