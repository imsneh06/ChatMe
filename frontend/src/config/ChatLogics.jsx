export const isSameSenderMargin = (messages, m, i, userId) => {
  if (!messages || !m || !m.sender) return "auto";
  const mSenderId = m.sender._id || m.sender;

  if (
    i < messages.length - 1 &&
    messages[i + 1]?.sender?._id === mSenderId &&
    mSenderId !== userId
  )
    return 33;
  else if (
    (i < messages.length - 1 &&
      messages[i + 1]?.sender?._id !== mSenderId &&
      mSenderId !== userId) ||
    (i === messages.length - 1 && mSenderId !== userId)
  )
    return 0;
  else return "auto";
};

export const isSameSender = (messages, m, i, userId) => {
  if (!messages || !m || !m.sender) return false;
  const mSenderId = m.sender._id || m.sender;

  return (
    i < messages.length - 1 &&
    (messages[i + 1]?.sender?._id !== mSenderId ||
      messages[i + 1]?.sender?._id === undefined) &&
    mSenderId !== userId
  );
};

export const getSender = (loggedUser, users) => {
  if (!users || !Array.isArray(users) || users.length === 0) return "Unknown";
  if (users.length === 1) return users[0]?.name || "Unknown";
  const loggedId = loggedUser?._id;
  const u0Id = users[0]?._id;
  return String(u0Id) === String(loggedId) ? users[1]?.name || "" : users[0]?.name || "";
};

export const getSenderDetails = (loggedUser, users) => {
  if (!users || !Array.isArray(users) || users.length === 0) return {};
  if (users.length === 1) return users[0] || {};
  const loggedId = loggedUser?._id;
  const u0Id = users[0]?._id;
  return String(u0Id) === String(loggedId) ? users[1] || {} : users[0] || {};
};

export const isLastMessage = (messages, i, userId) => {
  if (!messages || messages.length === 0) return false;
  const lastMsg = messages[messages.length - 1];
  const lastSenderId = lastMsg?.sender?._id || lastMsg?.sender;

  return (
    i === messages.length - 1 &&
    lastSenderId !== userId &&
    Boolean(lastSenderId)
  );
};

export const isSameUser = (messages, m, i) => {
  if (!messages || !m || !m.sender || i <= 0) return false;
  const mSenderId = m.sender._id || m.sender;
  const prevSenderId = messages[i - 1]?.sender?._id || messages[i - 1]?.sender;
  return Boolean(prevSenderId && prevSenderId === mSenderId);
};
