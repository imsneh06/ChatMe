const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  deleteUserProfile,
} = require("../controllers/userControllers.js");
const { protect } = require("../middleware/authMiddleware.js");
const router = express.Router();

router.route(`/`).post(registerUser).get(protect, allUsers);
router.post(`/login`, authUser);
router.route("/profile").delete(protect, deleteUserProfile);

module.exports = router;
