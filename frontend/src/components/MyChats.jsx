import React, { useEffect, useState } from "react";
import {
  Avatar,
  AvatarBadge,
  Box,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Stack,
  Text,
  Tooltip,
  Badge,
  useToast,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChatState } from "../Context/ChatProvider.jsx";
import ChatLoading from "./ChatLoading.jsx";
import { getSender, getSenderDetails } from "../config/ChatLogics.jsx";
import GroupChatModal from "./miscellaneous/GroupChatModal.jsx";
import Profile from "./miscellaneous/Profile.jsx";
import { getBackendUrl } from "../config/api.js";
import { formatChatTime } from "../config/formatTime.js";
import {
  WaSearchIcon,
  WaDotsVerticalIcon,
  WaNewChatIcon,
  WaChatIcon,
  WaWhatsAppRoundIcon,
  WaDoubleTickIcon,
  WaCameraIcon,
  WaMicIcon,
  WaClockIcon,
} from "./icons/WhatsAppIcons.jsx";

const MyChats = ({ fetchAgain }) => {
  const apiUrl = getBackendUrl();
  const navigate = useNavigate();
  const toast = useToast();

  const [loggedUser, setLoggedUser] = useState();
  const [filterQuery, setFilterQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'unread', 'favourites', 'groups'

  const {
    user,
    setUser,
    setSelectedChat,
    selectedChat,
    chats,
    setChats,
    onlineUsers,
    notification,
    setNotification,
    darkMode,
    toggleDarkMode,
    setIsSearchOpen,
    favourites = [],
    toggleFavourite,
  } = ChatState();

  const fetchChats = async () => {
    if (!user || !user.token) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(`${apiUrl}/api/chat`, config);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error loading chats",
        description: error.response?.data?.message || error.message,
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    if (user && user.token) {
      fetchChats();
    }
  }, [user, fetchAgain]);

  const logOutHandler = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    setSelectedChat(null);
    navigate("/");
  };

  // Helper: check if a chat is unread
  const isChatUnread = (chat) => {
    if (!chat) return false;
    // 1. Unread from socket notification list
    if (notification?.some((n) => (n.chat?._id || n.chat) === chat._id)) return true;
    // 2. Unread from latest message read status
    if (chat.latestMessage) {
      const senderId = String(chat.latestMessage.sender?._id || chat.latestMessage.sender || "");
      const myId = String(user?._id || loggedUser?._id || "");
      if (senderId && myId && senderId !== myId) {
        const readBy = (chat.latestMessage.readBy || []).map((u) => String(u._id || u));
        if (!readBy.includes(myId) && chat.latestMessage.status !== "seen") {
          return true;
        }
      }
    }
    return false;
  };

  // Chat filtering based on search query and active tab chip
  const filteredChats = chats?.filter((chat) => {
    // 1. Text Query Filter
    if (filterQuery.trim()) {
      const title = !chat.isGroupChat
        ? getSender(loggedUser || user, chat.users)
        : chat.chatName;
      if (!title.toLowerCase().includes(filterQuery.toLowerCase().trim())) {
        return false;
      }
    }

    // 2. Chip Tab Filter
    if (activeFilter === "groups") {
      return chat.isGroupChat === true;
    }
    if (activeFilter === "favourites") {
      return favourites?.includes(chat._id);
    }
    if (activeFilter === "unread") {
      return isChatUnread(chat);
    }

    return true;
  });

  const unreadChatsCount = chats?.filter(isChatUnread).length || 0;

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      bg="var(--wa-bg-main, #111b21)"
      w={{ base: "100%", md: "360px", lg: "400px" }}
      minW={{ md: "320px", lg: "360px" }}
      maxW={{ md: "440px", lg: "480px" }}
      flexShrink={0}
      h="100%"
      borderRight="1px solid var(--wa-border)"
      overflow="hidden"
      position="relative"
    >
      {/* 1. Header Bar matching Screenshot */}
      <Flex
        px="16px"
        py="12px"
        bg="var(--wa-bg-panel, #202c33)"
        justify="space-between"
        align="center"
        borderBottom="1px solid var(--wa-border)"
        flexShrink={0}
      >
        <Text
          fontSize="20px"
          fontWeight="700"
          color="var(--wa-text-primary, #e9edef)"
          letterSpacing="-0.3px"
        >
          ChatMe
        </Text>

        <Flex align="center" gap="8px">
          {/* New Group Modal Trigger */}
          <GroupChatModal>
            <Tooltip label="New group" hasArrow placement="bottom">
              <IconButton
                size="sm"
                variant="ghost"
                borderRadius="full"
                color="var(--wa-text-secondary, #8696a0)"
                _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-text-primary)" }}
                icon={<WaChatIcon size={19} />}
                aria-label="New Group"
              />
            </Tooltip>
          </GroupChatModal>

          {/* 3-Dots Overflow Menu */}
          <Menu>
            <Tooltip label="Menu" hasArrow placement="bottom">
              <MenuButton
                as={IconButton}
                size="sm"
                variant="ghost"
                borderRadius="full"
                color="var(--wa-text-secondary, #8696a0)"
                _hover={{ bg: "var(--wa-bg-hover)", color: "var(--wa-text-primary)" }}
                icon={<WaDotsVerticalIcon size={18} />}
                aria-label="More options"
              />
            </Tooltip>
            <MenuList bg="var(--wa-bg-panel, #202c33)" borderColor="var(--wa-border)" minW="210px" zIndex={30}>
              <MenuItem
                bg="var(--wa-bg-panel)"
                color="var(--wa-text-primary)"
                _hover={{ bg: "var(--wa-bg-hover)" }}
                onClick={() => setIsSearchOpen(true)}
              >
                New chat
              </MenuItem>
              <GroupChatModal>
                <MenuItem
                  bg="var(--wa-bg-panel)"
                  color="var(--wa-text-primary)"
                  _hover={{ bg: "var(--wa-bg-hover)" }}
                >
                  New group
                </MenuItem>
              </GroupChatModal>
              <MenuItem
                bg="var(--wa-bg-panel)"
                color="var(--wa-text-primary)"
                _hover={{ bg: "var(--wa-bg-hover)" }}
                onClick={toggleDarkMode}
              >
                {darkMode ? "Light theme" : "Dark theme"}
              </MenuItem>
              {user && (
                <Profile user={user}>
                  <MenuItem
                    bg="var(--wa-bg-panel)"
                    color="var(--wa-text-primary)"
                    _hover={{ bg: "var(--wa-bg-hover)" }}
                  >
                    Profile
                  </MenuItem>
                </Profile>
              )}
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

          {/* Green Circular Compose Action Button */}
          <Tooltip label="New chat" hasArrow placement="bottom">
            <IconButton
              size="sm"
              borderRadius="full"
              bg="var(--wa-accent, #00a884)"
              color="#111b21"
              _hover={{ bg: "var(--wa-accent-light, #25D366)" }}
              icon={<WaNewChatIcon size={17} color="#111b21" />}
              onClick={() => setIsSearchOpen(true)}
              aria-label="New chat"
            />
          </Tooltip>
        </Flex>
      </Flex>

      {/* 2. WhatsApp Search Input Box */}
      <Box px="12px" py="8px" bg="var(--wa-bg-main, #111b21)" flexShrink={0}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none" h="100%">
            <WaSearchIcon size={16} color="var(--wa-text-secondary, #8696a0)" />
          </InputLeftElement>
          <Input
            placeholder="Search or start a new chat"
            borderRadius="8px"
            bg="var(--wa-search-bg, #202c33)"
            color="var(--wa-text-primary, #e9edef)"
            border="none"
            h="36px"
            fontSize="14px"
            _placeholder={{ color: "var(--wa-text-secondary, #8696a0)" }}
            _focus={{ boxShadow: "none", bg: "var(--wa-bg-hover, #202c33)" }}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          {filterQuery && (
            <InputRightElement h="100%">
              <IconButton
                size="xs"
                variant="ghost"
                icon={<CloseIcon fontSize="9px" />}
                onClick={() => setFilterQuery("")}
                aria-label="Clear search"
                color="var(--wa-text-secondary)"
              />
            </InputRightElement>
          )}
        </InputGroup>
      </Box>

      {/* 3. Filter Chips Bar (All, Unread, Favourites, Groups) */}
      <Flex
        px="12px"
        py="6px"
        gap="8px"
        bg="var(--wa-bg-main, #111b21)"
        borderBottom="1px solid var(--wa-border)"
        flexShrink={0}
        overflowX="auto"
        className="wa-chip-row"
      >
        {/* All Chip */}
        <Box
          as="button"
          px="14px"
          py="5px"
          borderRadius="16px"
          fontSize="13px"
          fontWeight="500"
          cursor="pointer"
          transition="all 0.15s ease"
          bg={activeFilter === "all" ? "rgba(0, 168, 132, 0.2)" : "var(--wa-bg-panel, #202c33)"}
          color={activeFilter === "all" ? "var(--wa-accent-light, #25D366)" : "var(--wa-text-secondary, #8696a0)"}
          border={activeFilter === "all" ? "1px solid var(--wa-accent, #00a884)" : "1px solid transparent"}
          _hover={{ bg: activeFilter === "all" ? "rgba(0, 168, 132, 0.28)" : "var(--wa-bg-hover)" }}
          onClick={() => setActiveFilter("all")}
        >
          All
        </Box>

        {/* Unread Chip */}
        <Box
          as="button"
          px="12px"
          py="5px"
          borderRadius="16px"
          fontSize="13px"
          fontWeight="500"
          cursor="pointer"
          display="flex"
          alignItems="center"
          gap="6px"
          transition="all 0.15s ease"
          bg={activeFilter === "unread" ? "rgba(0, 168, 132, 0.2)" : "var(--wa-bg-panel, #202c33)"}
          color={activeFilter === "unread" ? "var(--wa-accent-light, #25D366)" : "var(--wa-text-secondary, #8696a0)"}
          border={activeFilter === "unread" ? "1px solid var(--wa-accent, #00a884)" : "1px solid transparent"}
          _hover={{ bg: activeFilter === "unread" ? "rgba(0, 168, 132, 0.28)" : "var(--wa-bg-hover)" }}
          onClick={() => setActiveFilter("unread")}
        >
          <span>Unread</span>
          {unreadChatsCount > 0 && (
            <Badge
              bg="#25D366"
              color="#111b21"
              borderRadius="full"
              fontSize="10px"
              fontWeight="bold"
              px="5px"
            >
              {unreadChatsCount}
            </Badge>
          )}
        </Box>

        {/* Favourites Chip */}
        <Box
          as="button"
          px="12px"
          py="5px"
          borderRadius="16px"
          fontSize="13px"
          fontWeight="500"
          cursor="pointer"
          display="flex"
          alignItems="center"
          gap="6px"
          transition="all 0.15s ease"
          bg={activeFilter === "favourites" ? "rgba(0, 168, 132, 0.2)" : "var(--wa-bg-panel, #202c33)"}
          color={activeFilter === "favourites" ? "var(--wa-accent-light, #25D366)" : "var(--wa-text-secondary, #8696a0)"}
          border={activeFilter === "favourites" ? "1px solid var(--wa-accent, #00a884)" : "1px solid transparent"}
          _hover={{ bg: activeFilter === "favourites" ? "rgba(0, 168, 132, 0.28)" : "var(--wa-bg-hover)" }}
          onClick={() => setActiveFilter("favourites")}
        >
          <span>Favourites</span>
          {favourites?.length > 0 && (
            <Badge
              bg="rgba(245, 158, 11, 0.25)"
              color="#F59E0B"
              borderRadius="full"
              fontSize="10px"
              fontWeight="bold"
              px="5px"
            >
              {favourites.length}
            </Badge>
          )}
        </Box>

        {/* Groups Chip */}
        <Box
          as="button"
          px="12px"
          py="5px"
          borderRadius="16px"
          fontSize="13px"
          fontWeight="500"
          cursor="pointer"
          transition="all 0.15s ease"
          bg={activeFilter === "groups" ? "rgba(0, 168, 132, 0.2)" : "var(--wa-bg-panel, #202c33)"}
          color={activeFilter === "groups" ? "var(--wa-accent-light, #25D366)" : "var(--wa-text-secondary, #8696a0)"}
          border={activeFilter === "groups" ? "1px solid var(--wa-accent, #00a884)" : "1px solid transparent"}
          _hover={{ bg: activeFilter === "groups" ? "rgba(0, 168, 132, 0.28)" : "var(--wa-bg-hover)" }}
          onClick={() => setActiveFilter("groups")}
        >
          Groups
        </Box>
      </Flex>

      {/* 4. Chat List */}
      <Box flex="1" overflowY="auto">
        {filteredChats ? (
          filteredChats.length > 0 ? (
            <Stack spacing="0">
              {filteredChats.map((chat) => {
                const isSelected = selectedChat?._id === chat._id;
                const otherUser = !chat.isGroupChat
                  ? getSenderDetails(loggedUser || user, chat.users)
                  : null;
                const isOnline = otherUser && onlineUsers.includes(otherUser._id);
                const chatTitle = !chat.isGroupChat
                  ? getSender(loggedUser || user, chat.users)
                  : chat.chatName;

                const hasUnread = isChatUnread(chat);
                const isFavourite = favourites?.includes(chat._id);

                return (
                  <Box
                    className="wa-chat-item"
                    onClick={() => {
                      setSelectedChat(chat);
                      // Clear notifications for this chat
                      if (notification) {
                        setNotification(notification.filter((n) => n.chat?._id !== chat._id));
                      }
                    }}
                    cursor="pointer"
                    bg={isSelected ? "var(--wa-bg-active, #2a3942)" : "transparent"}
                    _hover={{
                      bg: isSelected
                        ? "var(--wa-bg-active, #2a3942)"
                        : "var(--wa-bg-hover, #202c33)",
                    }}
                    px="16px"
                    py="11px"
                    display="flex"
                    alignItems="center"
                    borderBottom="1px solid var(--wa-border)"
                    key={chat._id}
                    transition="background 0.15s ease"
                  >
                    {/* User / Group Avatar */}
                    <Avatar
                      size="md"
                      mr="14px"
                      name={chatTitle}
                      src={otherUser?.pic}
                      bg="var(--wa-input-bg, #2a3942)"
                      color="var(--wa-text-primary, #e9edef)"
                      flexShrink={0}
                    >
                      {isOnline && (
                        <AvatarBadge boxSize="1em" bg="var(--wa-accent-light, #25D366)" />
                      )}
                    </Avatar>

                    {/* Chat Text Details */}
                    <Box flex="1" minW="0">
                      <Flex justify="space-between" align="baseline">
                        <Text
                          fontWeight="600"
                          fontSize="16px"
                          color="var(--wa-text-primary, #e9edef)"
                          lineHeight="1.2"
                          isTruncated
                        >
                          {chatTitle}
                        </Text>
                        <Text
                          fontSize="12px"
                          color={hasUnread ? "var(--wa-accent-light, #25D366)" : "var(--wa-text-secondary, #8696a0)"}
                          fontWeight={hasUnread ? "600" : "400"}
                          ml="8px"
                          flexShrink={0}
                        >
                          {formatChatTime(
                            chat.latestMessage?.createdAt || chat.updatedAt
                          )}
                        </Text>
                      </Flex>

                      <Flex align="center" justify="space-between" mt="3px">
                        <Flex align="center" minW="0" flex="1">
                          {/* Sent Status Double Tick */}
                          {chat.latestMessage &&
                            String(chat.latestMessage.sender?._id || chat.latestMessage.sender) ===
                              String(user?._id) && (
                              <Box as="span" mr="4px" flexShrink={0}>
                                <WaDoubleTickIcon size={15} isRead={true} />
                              </Box>
                            )}

                          {/* Disappearing Messages Clock Icon */}
                          {chat.disappearingTimer > 0 && (
                            <Box as="span" mr="4px" color="var(--wa-accent-light)" flexShrink={0}>
                              <WaClockIcon size={12} color="var(--wa-accent-light)" />
                            </Box>
                          )}

                          {/* Latest Message Preview */}
                          <Text
                            fontSize="13.5px"
                            color={
                              hasUnread
                                ? "var(--wa-text-primary, #e9edef)"
                                : "var(--wa-text-secondary, #8696a0)"
                            }
                            fontWeight={hasUnread ? "600" : "400"}
                            isTruncated
                          >
                            {otherUser?.isDeleted ? (
                              <span style={{ color: "#EF4444", fontStyle: "italic", fontSize: "12.5px" }}>
                                Account Deleted
                              </span>
                            ) : chat.latestMessage ? (
                              `${
                                chat.isGroupChat
                                  ? `${chat.latestMessage.sender?.name || ""}: `
                                  : ""
                              }${
                                typeof chat.latestMessage.content === "string" &&
                                chat.latestMessage.content.startsWith("E2EE::")
                                  ? "🔒 Encrypted message"
                                  : chat.latestMessage.content
                              }`
                            ) : (
                              "Tap to chat"
                            )}
                          </Text>
                        </Flex>

                        {/* Badges / Pin / Favourite Icons */}
                        <Flex align="center" gap="6px" ml="8px" flexShrink={0}>
                          {/* Star Toggle Button */}
                          <Tooltip
                            label={isFavourite ? "Remove from favourites" : "Add to favourites"}
                            hasArrow
                            placement="top"
                          >
                            <Box
                              as="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavourite(chat._id);
                              }}
                              aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
                              display={isFavourite ? "flex" : { base: "flex", md: "none" }}
                              className="wa-fav-btn"
                              alignItems="center"
                              justifyContent="center"
                              w="22px"
                              h="22px"
                              borderRadius="full"
                              bg="transparent"
                              border="none"
                              cursor="pointer"
                              color={isFavourite ? "#F59E0B" : "var(--wa-text-secondary, #8696a0)"}
                              _hover={{ transform: "scale(1.25)", color: "#F59E0B" }}
                              transition="all 0.15s ease"
                            >
                              <Text fontSize="14px" lineHeight="1">
                                {isFavourite ? "★" : "☆"}
                              </Text>
                            </Box>
                          </Tooltip>

                          {hasUnread && (
                            <Badge
                              bg="#25D366"
                              color="#111b21"
                              borderRadius="full"
                              fontSize="11px"
                              fontWeight="bold"
                              px="5px"
                              minW="18px"
                              textAlign="center"
                            >
                              1
                            </Badge>
                          )}
                        </Flex>
                      </Flex>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Flex
              flexDir="column"
              align="center"
              justify="center"
              h="260px"
              textAlign="center"
              p="24px"
              color="var(--wa-text-secondary, #8696a0)"
            >
              <Text fontSize="15px" fontWeight="600" color="var(--wa-text-primary, #e9edef)" mb="6px">
                {activeFilter === "unread"
                  ? "No unread chats"
                  : activeFilter === "favourites"
                  ? "No favourite chats"
                  : activeFilter === "groups"
                  ? "No group chats"
                  : "No chats found"}
              </Text>
              <Text fontSize="13px" maxW="280px">
                {activeFilter === "unread"
                  ? "You are all caught up! There are no unread messages."
                  : activeFilter === "favourites"
                  ? "Star important chats to keep them at your fingertips."
                  : activeFilter === "groups"
                  ? "Use the new chat icon above to create your first group."
                  : "Start a new conversation by clicking the compose button above."}
              </Text>
            </Flex>
          )
        ) : (
          <ChatLoading />
        )}
      </Box>

      {/* 5. "Get WhatsApp for Windows" Banner (Desktop screenshot) */}
      <Box
        display={{ base: "none", md: "block" }}
        p="10px 16px"
        bg="var(--wa-bg-panel, #202c33)"
        borderTop="1px solid var(--wa-border)"
        flexShrink={0}
      >
        <Flex
          as="button"
          w="100%"
          align="center"
          justify="center"
          gap="8px"
          py="6px"
          borderRadius="8px"
          bg="rgba(37, 211, 102, 0.08)"
          _hover={{ bg: "rgba(37, 211, 102, 0.15)" }}
          transition="all 0.15s ease"
          onClick={() => {
            toast({
              title: "ChatMe Desktop App Ready",
              description: "ChatMe is fully installed and optimized for desktop.",
              status: "info",
              duration: 3000,
              isClosable: true,
            });
          }}
        >
          <WaWhatsAppRoundIcon size={20} />
          <Text fontSize="13px" fontWeight="600" color="#25D366">
            Get ChatMe for Desktop
          </Text>
        </Flex>
      </Box>

      {/* 6. Mobile Floating Action Button (Android WhatsApp compose FAB) */}
      <Box
        display={{ base: "flex", md: "none" }}
        position="absolute"
        bottom="20px"
        right="20px"
        zIndex={10}
      >
        <IconButton
          size="lg"
          borderRadius="full"
          bg="var(--wa-accent, #00a884)"
          color="#111b21"
          boxShadow="0 4px 12px rgba(0, 0, 0, 0.4)"
          _hover={{ bg: "var(--wa-accent-light, #25D366)" }}
          icon={<WaNewChatIcon size={22} color="#111b21" />}
          onClick={() => setIsSearchOpen(true)}
          aria-label="New chat"
        />
      </Box>
    </Box>
  );
};

export default MyChats;
