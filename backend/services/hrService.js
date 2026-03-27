const User = require('../models/User');

const createUnitHR = async (data) => {
  let { name, username, unit } = data;

  /* ================= SANITIZE INPUT ================= */

  name = name?.trim();
  username = username?.trim();
  unit = unit?.trim();

  /* ================= VALIDATION ================= */

  if (!name) {
    throw new Error('Name is required');
  }

  if (!username) {
    throw new Error('Phone number is required');
  }

  if (!unit) {
    throw new Error('Unit is required');
  }

  if (!/^\d{10}$/.test(username)) {
    throw new Error('Phone number must be exactly 10 digits');
  }

  /* ================= UNIQUE CHECK ================= */

  const existingUser = await User.findOne({ username });

  if (existingUser) {
    throw new Error('Phone number already exists');
  }

  /* ================= CREATE USER ================= */

  const hr = new User({
    name,
    username,
    phone: username,
    password: 'accord@123', // Make sure User model hashes password
    role: 'unit_hr',
    unit,
    mustChangePassword: true,
    isActive: true,
  });

  await hr.save();

  return {
    _id: hr._id,
    name: hr.name,
    username: hr.username,
    unit: hr.unit,
    role: hr.role,
    isActive: hr.isActive,
    createdAt: hr.createdAt,
  };
};

module.exports = {
  createUnitHR,
};