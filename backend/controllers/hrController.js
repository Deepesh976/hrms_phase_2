const asyncHandler = require('../middleware/asyncHandler');
const { createUnitHR } = require('../services/hrService');
const User = require('../models/User');

/* ================= CREATE ================= */
const createHR = asyncHandler(async (req, res) => {
  const hr = await createUnitHR({
    ...req.body,
    createdBy: req.user?._id || null,
  });

  res.status(201).json({
    success: true,
    message: 'Sub HR created successfully',
    data: hr,
  });
});

/* ================= GET ALL ================= */
const getAllHRs = asyncHandler(async (req, res) => {
  const hrs = await User.find({
    role: 'unit_hr',
    isActive: true,
  })
    .select('-password -resetToken -resetTokenExpiry')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: hrs.length,
    data: hrs,
  });
});

/* ================= GET SINGLE ================= */
const getHRById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hr = await User.findOne({
    _id: id,
    role: 'unit_hr',
    isActive: true,
  }).select('-password -resetToken -resetTokenExpiry');

  if (!hr) {
    res.status(404);
    throw new Error('HR not found');
  }

  res.json({
    success: true,
    data: hr,
  });
});

/* ================= UPDATE ================= */
const updateHR = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { name, username, unit } = req.body;

  const hr = await User.findOne({
    _id: id,
    role: 'unit_hr',
  });

  if (!hr) {
    res.status(404);
    throw new Error('HR not found');
  }

  /* ========= UPDATE NAME ========= */
  if (name !== undefined) {
    hr.name = name.trim();
  }

  /* ========= UPDATE UNIT ========= */
  if (unit !== undefined) {
    if (!unit.trim()) {
      throw new Error('Unit cannot be empty');
    }
    hr.unit = unit.trim();
  }

  /* ========= UPDATE PHONE ========= */
  if (username && username !== hr.username) {
    username = username.trim();

    if (!/^\d{10}$/.test(username)) {
      throw new Error('Phone must be 10 digits');
    }

    const existing = await User.findOne({
      username,
      _id: { $ne: id },
    });

    if (existing) {
      throw new Error('Phone number already exists');
    }

    hr.username = username;
    hr.phone = username;
  }

  await hr.save();

  res.json({
    success: true,
    message: 'HR updated successfully',
    data: hr,
  });
});

/* ================= DELETE (SOFT DELETE) ================= */
const deleteHR = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hr = await User.findOne({
    _id: id,
    role: 'unit_hr',
  });

  if (!hr) {
    res.status(404);
    throw new Error('HR not found');
  }

  // 🔥 Recommended: Soft delete instead of hard delete
  hr.isActive = false;
  await hr.save();

  res.json({
    success: true,
    message: 'HR deactivated successfully',
  });
});

module.exports = {
  createHR,
  getAllHRs,
  getHRById,
  updateHR,
  deleteHR,
};