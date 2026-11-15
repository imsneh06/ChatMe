const asyncHandler = require("express-async-handler");
const generateToken = require("../config/generateToken.js");
const storageService = require("../services/storageService.js");

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please enter all the required fields");
  }

  try {
    const user = await storageService.createUser({ name, email, password, pic });

    const io = req.app.get("io");
    if (io) {
      io.emit("new user registered", {
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(err.statusCode || 400);
    throw new Error(err.message || "Failed to create user");
  }
});

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please enter both email and password");
  }

  const user = await storageService.findUserByEmail(email);

  if (user && (await storageService.verifyPassword(password, user.password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password!");
  }
});

const allUsers = asyncHandler(async (req, res) => {
  const users = await storageService.searchUsers(req.query.search, req.user._id);
  res.send(users);
});

module.exports = { registerUser, authUser, allUsers };
