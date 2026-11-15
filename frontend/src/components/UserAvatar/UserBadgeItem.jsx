import { CloseIcon } from '@chakra-ui/icons'
import { Box } from '@chakra-ui/react'
import React from 'react'

const UserBadgeItem = ({ user, handleFunction }) => {
  return (
    <Box
      px={3}
      py={1}
      borderRadius="full"
      m={1}
      mb={2}
      bg="var(--wa-accent)"
      color="white"
      fontSize="12px"
      fontWeight="500"
      cursor="pointer"
      display="inline-flex"
      alignItems="center"
      gap="4px"
      onClick={handleFunction}
      _hover={{ bg: "#008069" }}
    >
      <span>{user.name}</span>
      <CloseIcon fontSize="8px" />
    </Box>
  );
};

export default UserBadgeItem