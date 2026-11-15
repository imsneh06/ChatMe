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
  if (!users || !Array.isArray(users) || users.length === 0) return "Deleted User";
  const loggedId = String(loggedUser?._id);
  const other = users.find((u) => String(u?._id || u) !== loggedId);
  if (!other || other.isDeleted || other.name === "Deleted User") return "Deleted User";
  return other.name || "Deleted User";
};

export const getSenderDetails = (loggedUser, users) => {
  if (!users || !Array.isArray(users) || users.length === 0) {
    return { name: "Deleted User", pic: "", isDeleted: true };
  }
  const loggedId = String(loggedUser?._id);
  const other = users.find((u) => String(u?._id || u) !== loggedId);
  if (!other || other.isDeleted) {
    return { name: "Deleted User", pic: "", isDeleted: true };
  }
  return other;
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
