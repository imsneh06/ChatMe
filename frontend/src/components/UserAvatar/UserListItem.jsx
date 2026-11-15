import { Avatar, Box, Text } from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider.jsx";
import React from "react";

const UserListItem = ({ user, handleFunction }) => {
  return (
    <Box
      onClick={handleFunction}
      cursor="pointer"
      bg="var(--wa-bg-panel, #202c33)"
      _hover={{
        background: "var(--wa-bg-hover, #2a3942)",
        borderColor: "var(--wa-accent)",
      }}
      border="1px solid var(--wa-border)"
      w="100%"
      display="flex"
      alignItems="center"
      color="var(--wa-text-primary, #e9edef)"
      px={3}
      py={2}
      mb={2}
      borderRadius="lg"
      transition="all 0.15s ease"
    >
      <Avatar
        mr={3}
        size="sm"
        name={user?.name}
        src={user?.pic}
      />
      <Box>
        <Text fontSize="14px" fontWeight="600" color="var(--wa-text-primary)">
          {user?.name}
        </Text>
        <Text fontSize="12px" color="var(--wa-text-secondary)">
          {user?.email}
        </Text>
      </Box>
    </Box>
  );
};

export default UserListItem;
