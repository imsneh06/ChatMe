import React from "react";
import {
  Box,
  Flex,
  Tooltip,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from "@chakra-ui/react";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider.jsx";
import {
  WaChatIcon,
  WaPhoneIcon,
  WaStatusIcon,
  WaCommunitiesIcon,
  WaAiRingIcon,
  WaSettingsIcon,
} from "../icons/WhatsAppIcons.jsx";
import Profile from "../miscellaneous/Profile.jsx";

const LeftNavRail = ({ onSelectAiChat, onOpenProfile }) => {
  const { user, setUser, notification, darkMode, toggleDarkMode, setSelectedChat, chats } =
    ChatState();
  const navigate = useNavigate();

  const logOutHandler = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    setSelectedChat(null);
    navigate("/");
  };

  const handleOpenAi = () => {
    // Look for Gemini AI chat
    const aiChat = chats.find(
      (c) =>
        !c.isGroupChat &&
        c.users?.some((u) => String(u._id || u) === "user_gemini_ai")
    );
    if (aiChat) {
      setSelectedChat(aiChat);
    } else if (onSelectAiChat) {
      onSelectAiChat();
    }
  };

  return (
    <Box
      display={{ base: "none", md: "flex" }}
      flexDir="column"
      justifyContent="space-between"
      alignItems="center"
      w="64px"
      h="100%"
      bg="var(--wa-bg-panel, #202c33)"
      borderRight="1px solid var(--wa-border)"
      py="12px"
      flexShrink={0}
      zIndex={20}
    >
      {/* Top Navigation Tabs */}
      <Flex direction="column" align="center" gap="14px" w="100%">
        {/* Chats Tab */}
        <Tooltip label="Chats" placement="right" hasArrow>
          <Box position="relative">
            <IconButton
              size="md"
              variant="ghost"
              borderRadius="12px"
              bg="rgba(255, 255, 255, 0.08)"
              color="var(--wa-text-primary, #e9edef)"
              _hover={{ bg: "rgba(255, 255, 255, 0.12)" }}
              icon={<WaChatIcon size={20} color="var(--wa-accent-light, #25D366)" />}
              aria-label="Chats"
            />
            {notification && notification.length > 0 && (
              <Badge
                position="absolute"
                top="-2px"
                right="-2px"
                bg="#25D366"
                color="#111b21"
                borderRadius="full"
                fontSize="10px"
                fontWeight="bold"
                px="5px"
                minW="16px"
                textAlign="center"
              >
                {notification.length > 99 ? "99+" : notification.length}
              </Badge>
            )}
          </Box>
        </Tooltip>

        {/* Calls Tab */}
        <Tooltip label="Calls" placement="right" hasArrow>
          <IconButton
            size="md"
            variant="ghost"
            borderRadius="12px"
            color="var(--wa-text-secondary, #8696a0)"
            _hover={{ bg: "rgba(255, 255, 255, 0.08)", color: "var(--wa-text-primary)" }}
            icon={<WaPhoneIcon size={20} />}
            aria-label="Calls"
          />
        </Tooltip>

        {/* Status / Stories Tab */}
        <Tooltip label="Status" placement="right" hasArrow>
          <IconButton
            size="md"
            variant="ghost"
            borderRadius="12px"
            color="var(--wa-text-secondary, #8696a0)"
            _hover={{ bg: "rgba(255, 255, 255, 0.08)", color: "var(--wa-text-primary)" }}
            icon={<WaStatusIcon size={20} />}
            aria-label="Status"
          />
        </Tooltip>

        {/* Communities */}
        <Tooltip label="Communities" placement="right" hasArrow>
          <IconButton
            size="md"
            variant="ghost"
            borderRadius="12px"
            color="var(--wa-text-secondary, #8696a0)"
            _hover={{ bg: "rgba(255, 255, 255, 0.08)", color: "var(--wa-text-primary)" }}
            icon={<WaCommunitiesIcon size={20} />}
            aria-label="Communities"
          />
        </Tooltip>

        {/* Gemini AI Assistant */}
        <Tooltip label="Gemini AI Assistant" placement="right" hasArrow>
          <IconButton
            size="md"
            variant="ghost"
            borderRadius="12px"
            _hover={{ bg: "rgba(255, 255, 255, 0.08)" }}
            icon={<WaAiRingIcon size={22} />}
            onClick={handleOpenAi}
            aria-label="Gemini AI"
          />
        </Tooltip>
      </Flex>

      {/* Bottom Settings & Profile */}
      <Flex direction="column" align="center" gap="14px" w="100%">
        {/* Theme Toggle */}
        <Tooltip
          label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          placement="right"
          hasArrow
        >
          <IconButton
            size="md"
            variant="ghost"
            borderRadius="12px"
            color="var(--wa-text-secondary, #8696a0)"
            _hover={{ bg: "rgba(255, 255, 255, 0.08)", color: "var(--wa-text-primary)" }}
            icon={darkMode ? <SunIcon /> : <MoonIcon />}
            onClick={toggleDarkMode}
            aria-label="Toggle Theme"
          />
        </Tooltip>

        {/* Settings Menu */}
        <Menu placement="right-start">
          <Tooltip label="Settings" placement="right" hasArrow>
            <MenuButton
              as={IconButton}
              size="md"
              variant="ghost"
              borderRadius="12px"
              color="var(--wa-text-secondary, #8696a0)"
              _hover={{ bg: "rgba(255, 255, 255, 0.08)", color: "var(--wa-text-primary)" }}
              icon={<WaSettingsIcon size={20} />}
              aria-label="Settings"
            />
          </Tooltip>
          <MenuList bg="var(--wa-bg-panel, #202c33)" borderColor="var(--wa-border)" minW="190px">
            {user && (
              <Profile user={user}>
                <MenuItem bg="var(--wa-bg-panel)" color="var(--wa-text-primary)" _hover={{ bg: "var(--wa-bg-hover)" }}>
                  Profile
                </MenuItem>
              </Profile>
            )}
            <MenuItem
              bg="var(--wa-bg-panel)"
              color="var(--wa-text-primary)"
              _hover={{ bg: "var(--wa-bg-hover)" }}
              onClick={toggleDarkMode}
            >
              {darkMode ? "Light Theme" : "Dark Theme"}
            </MenuItem>
            <MenuDivider borderColor="var(--wa-border)" />
            <MenuItem
              bg="var(--wa-bg-panel)"
              color="#EF4444"
              _hover={{ bg: "var(--wa-bg-hover)" }}
              onClick={logOutHandler}
            >
              Log out
            </MenuItem>
          </MenuList>
        </Menu>

        {/* Profile Avatar */}
        {user && (
          <Box cursor="pointer">
            <Profile user={user}>
              <Avatar
                size="sm"
                name={user.name}
                src={user.pic}
                border="2px solid transparent"
                _hover={{ borderColor: "#25D366" }}
              />
            </Profile>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default LeftNavRail;
