const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const storageService = require("../services/storageService.js");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_jwt_secret_chatme_2026"
      );

      const user = await storageService.findUserById(decoded.id);
      if (!user) {
        res.status(401);
        throw new Error("User not found or token invalid");
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Not Authorized! Token failed or expired.");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not Authorized, no token provided.");
  }
});

module.exports = { protect };
