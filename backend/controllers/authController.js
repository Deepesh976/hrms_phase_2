const asyncHandler = require('../middleware/asyncHandler');
const {
  authenticateUser,
  updatePassword: updatePasswordService,
  createUser,
} = require('../services/authService');

const LoginActivity = require('../models/LoginActivity');
const User = require('../models/User');

/* =========================================================
   CHECK PHONE ROLES
========================================================= */
const checkPhoneRoles = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required',
    });
  }

  const users = await User.find({
    phone,
    isActive: true,
  })
    .select('role name')
    .lean();

  if (!users.length) {
    return res.status(404).json({
      success: false,
      message: 'No accounts found with this phone number',
    });
  }

  res.status(200).json({
    success: true,
    phone,
    roles: users.map((u) => ({
      role: u.role,
      name: u.name,
    })),
  });
});

/* =========================================================
   LOGIN  ✅ UPDATED
========================================================= */
const login = asyncHandler(async (req, res) => {
  const { username, password, email, phoneNo, role } = req.body;

  const loginIdentifier = username || phoneNo || email;

  if (!loginIdentifier || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username / phone / email and password are required',
    });
  }

  // 🔥 Authenticate
  const result = await authenticateUser(loginIdentifier, password, role);

  const userId = result.user.id || result.user._id;

  if (!userId) {
    return res.status(500).json({
      success: false,
      message: "User ID missing",
    });
  }

  const now = new Date();

  // 🔥 UPDATE lastLogin
  await User.findByIdAndUpdate(userId, {
    lastLogin: now,
  });

  // 🔥 DEBUG START
  console.log("🔥 TRYING TO SAVE LOGIN ACTIVITY");

  try {
    const test = await LoginActivity.create({
      userId: userId,
      loginTime: now,
    });

    console.log("✅ SAVED:", test);
  } catch (err) {
    console.error("❌ ERROR SAVING LOGIN ACTIVITY:", err);
  }
  // 🔥 DEBUG END

  res.status(200).json({
    success: true,
    token: result.token,
    user: result.user,
    mustChangePassword: result.user.mustChangePassword === true,
  });
});

/* =========================================================
   UPDATE PASSWORD
========================================================= */
const updatePassword = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters',
    });
  }

  await updatePasswordService(userId, newPassword);

  await User.findByIdAndUpdate(userId, {
    mustChangePassword: false,
    passwordChangedAt: new Date(),
  });

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});

/* =========================================================
   CREATE USER
========================================================= */
const createNewUser = asyncHandler(async (req, res) => {
  const creator = req.user;
  const userData = req.body;

  const newUser = await createUser(userData, creator);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: newUser,
  });
});

/* =========================================================
   GET CURRENT USER
========================================================= */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password -resetToken -resetTokenExpiry')
    .populate('employeeId', 'empName contactNo department designation')
    .lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

module.exports = {
  login,
  updatePassword,
  createNewUser,
  getCurrentUser,
  checkPhoneRoles,
};