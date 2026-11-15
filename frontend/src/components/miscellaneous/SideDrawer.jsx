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
import React, { useState } from "react";
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
  } = ChatState();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const logOutHandler = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    setSelectedChat(null);
    navigate("/");
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      toast({
        title: "Please enter a name or email to search",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-left",
      });
      return;
    }
    try {
      setLoading(true);

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(
        `${apiUrl}/api/user?search=${search}`,
        config
      );

      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error searching users",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom-left",
      });
    }
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
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        bg="var(--wa-bg-panel)"
        w="100%"
        px="16px"
        py="8px"
        borderBottom="1px solid var(--wa-border)"
      >
        <Box display="flex" alignItems="center" gap="10px">
          <Tooltip label="Search contacts to chat" hasArrow placement="bottom-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpen}
              color="var(--wa-text-secondary)"
              _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-accent)" }}
              leftIcon={<SearchIcon />}
            >
              <Text display={{ base: "none", md: "flex" }} fontSize="13px" fontWeight="500">
                New Chat
              </Text>
            </Button>
          </Tooltip>

          <Text
            fontSize="18px"
            fontWeight="700"
            color="var(--wa-accent-light)"
            display={{ base: "none", sm: "block" }}
          >
            ChatMe
          </Text>
        </Box>

        <Box display="flex" alignItems="center" gap="4px">
          {/* Theme Toggle (Dark / Light) */}
          <Tooltip
            label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            hasArrow
          >
            <IconButton
              size="sm"
              variant="ghost"
              icon={darkMode ? <SunIcon /> : <MoonIcon />}
              onClick={toggleDarkMode}
              color="var(--wa-text-secondary)"
              _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-text-primary)" }}
              aria-label="Toggle theme"
            />
          </Tooltip>

          {/* Notifications */}
          <Menu>
            <MenuButton
              as={IconButton}
              size="sm"
              variant="ghost"
              icon={<BellIcon fontSize="18px" />}
              color="var(--wa-text-secondary)"
              _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-text-primary)" }}
              position="relative"
              aria-label="Notifications"
            />
            {notification && notification.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "60px",
                  backgroundColor: "var(--wa-badge)",
                  color: "white",
                  borderRadius: "50%",
                  padding: "1px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  pointerEvents: "none",
                }}
              >
                {notification.length}
              </span>
            )}
            <MenuList bg="var(--wa-bg-panel)" borderColor="var(--wa-border)">
              {!notification.length && (
                <MenuItem bg="var(--wa-bg-panel)" color="var(--wa-text-secondary)">
                  No new messages
                </MenuItem>
              )}
              {notification.map((notify) => (
                <MenuItem
                  bg="var(--wa-bg-panel)"
                  color="var(--wa-text-primary)"
                  _hover={{ bg: "var(--wa-bg-hover)" }}
                  key={notify._id}
                  onClick={() => {
                    setSelectedChat(notify.chat);
                    setNotification(notification.filter((n) => n !== notify));
                  }}
                >
                  {notify.chat?.isGroupChat
                    ? `New Message in ${notify.chat.chatName}`
                    : `New Message from ${getSender(user, notify.chat?.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* User Menu */}
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              size="sm"
              rightIcon={<ChevronDownIcon color="var(--wa-text-secondary)" />}
              p="2px"
            >
              <Avatar
                size="sm"
                cursor="pointer"
                name={user?.name}
                src={user?.pic}
              />
            </MenuButton>
            <MenuList bg="var(--wa-bg-panel)" borderColor="var(--wa-border)">
              <Profile user={user}>
                <MenuItem bg="var(--wa-bg-panel)" color="var(--wa-text-primary)" _hover={{ bg: "var(--wa-bg-hover)" }}>
                  Profile
                </MenuItem>
              </Profile>
              <MenuDivider borderColor="var(--wa-border)" />
              <MenuItem
                bg="var(--wa-bg-panel)"
                color="#EF4444"
                _hover={{ bg: "var(--wa-bg-hover)" }}
                onClick={logOutHandler}
              >
                Log Out
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      {/* Search Drawer */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent bg="var(--wa-bg-main)" color="var(--wa-text-primary)">
          <DrawerHeader borderBottom="1px solid var(--wa-border)" bg="var(--wa-bg-panel)">
            Search Contacts
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
                onChange={(e) => setSearch(e.target.value)}
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
            ) : (
              searchResult?.map((u) => (
                <UserListItem
                  key={u._id}
                  user={u}
                  handleFunction={() => accessChat(u._id)}
                />
              ))
            )}

            {loadingChat && <Spinner ml="auto" display="flex" mt={4} />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SideDrawer;
