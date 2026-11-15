import {
  Avatar,
  Box,
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
import ImageCropModal from "../miscellaneous/ImageCropModal.jsx";

const Signup = () => {
  const apiUrl = getBackendUrl();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");
  const [pic, setPic] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { setUser } = ChatState();

  const handleClick = () => {
    setShow(!show);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp") {
      toast({
        title: "Please select a valid image (JPEG/PNG/WEBP)!",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob, croppedDataUrl) => {
    setPic(croppedDataUrl); // instant visual avatar feedback

    try {
      setLoading(true);
      const data = new FormData();
      data.append("file", croppedBlob);
      data.append("upload_preset", "ChatMe");
      data.append("cloud_name", "dsdwziwqb");

      const res = await axios.post(
        "https://api.cloudinary.com/v1_1/dsdwziwqb/image/upload",
        data
      );
      if (res.data?.secure_url || res.data?.url) {
        setPic(res.data.secure_url || res.data.url);
      }
      setLoading(false);
      toast({
        title: "Profile photo cropped & ready!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (err) {
      setLoading(false);
      console.warn("Cloudinary upload fallback to cropped data URL:", err.message);
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
          Profile Picture (with Crop)
        </FormLabel>
        <Box display="flex" alignItems="center" gap={3}>
          {pic && (
            <Avatar
              size="md"
              src={pic}
              border="2px solid var(--wa-accent)"
              cursor="pointer"
              onClick={() => rawImageSrc && setCropModalOpen(true)}
            />
          )}
          <Input
            bg="var(--wa-input-bg)"
            color="var(--wa-text-primary)"
            borderColor="var(--wa-border)"
            type="file"
            p={1}
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </Box>
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

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={rawImageSrc}
        onCropComplete={handleCropComplete}
      />
    </VStack>
  );
};

export default Signup;
