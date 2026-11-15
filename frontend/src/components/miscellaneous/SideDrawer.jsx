import {
  Avatar,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import {
  BellIcon,
  ChevronDownIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider.jsx";
import Profile from "./Profile.jsx";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ChatLoading from "../ChatLoading.jsx";
import UserListItem from "../UserAvatar/UserListItem.jsx";
import { getSender } from "../../config/ChatLogics.jsx";
import { getBackendUrl } from "../../config/api.js";

const SideDrawer = () => {
  const apiUrl = getBackendUrl();
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const {
    user,
    setUser,
    setSelectedChat,
    chats,
    setChats,
    notification,
    setNotification,
    darkMode,
    toggleDarkMode,
    socket,
    isSearchOpen,
    setIsSearchOpen,
  } = ChatState();
  const navigate = useNavigate();
  const toast = useToast();

  const onClose = () => setIsSearchOpen(false);

  const logOutHandler = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    setSelectedChat(null);
    navigate("/");
  };

  const fetchContacts = async (query = "") => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const url = query.trim()
        ? `${apiUrl}/api/user?search=${encodeURIComponent(query.trim())}`
        : `${apiUrl}/api/user`;

      const { data } = await axios.get(url, config);
      setLoading(false);
      setSearchResult(data || []);
    } catch (error) {
      setLoading(false);
    }
  };

  // Automatically load existing contacts when drawer opens
  useEffect(() => {
    if (isSearchOpen) {
      setSearch("");
      fetchContacts("");
    }
  }, [isSearchOpen]);

  // Real-time synchronization when a new user account is created anywhere
  useEffect(() => {
    if (!socket) return;

    const handleNewUser = (newUser) => {
      if (newUser && String(newUser._id) !== String(user?._id)) {
        setSearchResult((prev) => {
          if (!prev.some((u) => String(u._id) === String(newUser._id))) {
            return [newUser, ...prev];
          }
          return prev;
        });
      }
    };

    socket.on("new user registered", handleNewUser);
    return () => {
      socket.off("new user registered", handleNewUser);
    };
  }, [socket, user]);

  const handleSearch = () => {
    fetchContacts(search);
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.post(
        `${apiUrl}/api/chat`,
        { userId },
        config
      );

      if (!chats.find((c) => c._id === data._id)) {
        setChats([data, ...chats]);
      }

      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
    } catch (error) {
      setLoadingChat(false);
      toast({
        title: "Error opening chat",
        description: error.response?.data?.message || error.message,
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  return (
    <Drawer placement="left" onClose={onClose} isOpen={isSearchOpen}>
      <DrawerOverlay />
      <DrawerContent bg="var(--wa-bg-main)" color="var(--wa-text-primary)">
        <DrawerHeader borderBottom="1px solid var(--wa-border)" bg="var(--wa-bg-panel)" display="flex" alignItems="center" gap="10px">
          <Text fontSize="17px" fontWeight="600">New Chat / Search Contacts</Text>
        </DrawerHeader>
        <DrawerBody p="16px">
          <Box display="flex" pb="16px">
            <Input
              placeholder="Search by name or email"
              mr={2}
              value={search}
              bg="var(--wa-search-bg)"
              border="none"
              color="var(--wa-text-primary)"
              _focus={{ boxShadow: "none" }}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchContacts(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              bg="var(--wa-accent)"
              color="white"
              _hover={{ bg: "#008069" }}
              size="md"
            >
              Search
            </Button>
          </Box>
          {loading ? (
            <ChatLoading />
          ) : searchResult && searchResult.length > 0 ? (
            searchResult.map((u) => (
              <UserListItem
                key={u._id}
                user={u}
                handleFunction={() => accessChat(u._id)}
              />
            ))
          ) : (
            <Box textAlign="center" py="40px" color="var(--wa-text-secondary)" fontSize="14px">
              No contacts found
            </Box>
          )}

          {loadingChat && <Spinner ml="auto" display="flex" mt={4} />}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default SideDrawer;
