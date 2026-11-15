import {
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  VStack,
  useToast,
} from "@chakra-ui/react";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider.jsx";
import { getBackendUrl } from "../../config/api.js";

const Signup = () => {
  const apiUrl = getBackendUrl();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");
  const [pic, setPic] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { setUser } = ChatState();

  const handleClick = () => {
    setShow(!show);
  };

  const postDetails = (pics) => {
    setLoading(true);
    if (!pics) {
      toast({
        title: "Please select an image!",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    if (pics.type === "image/jpeg" || pics.type === "image/png") {
      const data = new FormData();
      data.append("file", pics);
      data.append("upload_preset", "ChatMe");
      data.append("cloud_name", "dsdwziwqb");
      axios
        .post("https://api.cloudinary.com/v1_1/dsdwziwqb/image/upload", data)
        .then((res) => {
          setPic(res.data.url.toString());
          setLoading(false);
          toast({
            title: "Image uploaded successfully!",
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "bottom",
          });
        })
        .catch(() => {
          setLoading(false);
          toast({
            title: "Upload note",
            description: "Default avatar will be used.",
            status: "info",
            duration: 3000,
            isClosable: true,
            position: "bottom",
          });
        });
    } else {
      toast({
        title: "Please select a JPEG or PNG image!",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  const submitHandler = async () => {
    setLoading(true);
    if (!name || !email || !password || !confirmpassword) {
      toast({
        title: "Please fill all the required fields",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    if (password !== confirmpassword) {
      toast({
        title: "Passwords do not match!",
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
        `${apiUrl}/api/user`,
        { name, email, password, pic },
        config
      );

      toast({
        title: "Signup Successful",
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
        title: "Signup Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Could not register user",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  return (
    <VStack spacing="12px">
      <FormControl id="signup-name" isRequired>
        <FormLabel fontWeight="500" fontSize="14px" color="var(--wa-text-primary)">
          Full Name
        </FormLabel>
        <Input
          bg="var(--wa-input-bg)"
          color="var(--wa-text-primary)"
          borderColor="var(--wa-border)"
          placeholder="Enter Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          _focus={{ borderColor: "var(--wa-accent)" }}
        />
      </FormControl>

      <FormControl id="signup-email" isRequired>
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

      <FormControl id="signup-password" isRequired>
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

      <FormControl id="signup-confirmpassword" isRequired>
        <FormLabel fontWeight="500" fontSize="14px" color="var(--wa-text-primary)">
          Confirm Password
        </FormLabel>
        <InputGroup>
          <Input
            type={show ? "text" : "password"}
            bg="var(--wa-input-bg)"
            color="var(--wa-text-primary)"
            borderColor="var(--wa-border)"
            placeholder="Confirm Your Password"
            value={confirmpassword}
            onChange={(e) => setConfirmpassword(e.target.value)}
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

      <FormControl id="signup-pic">
        <FormLabel fontWeight="500" fontSize="14px" color="var(--wa-text-primary)">
          Profile Picture (Optional)
        </FormLabel>
        <Input
          bg="var(--wa-input-bg)"
          color="var(--wa-text-primary)"
          borderColor="var(--wa-border)"
          type="file"
          p={1}
          accept="image/*"
          onChange={(e) => postDetails(e.target.files[0])}
        />
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
        Sign Up
      </Button>
    </VStack>
  );
};

export default Signup;
