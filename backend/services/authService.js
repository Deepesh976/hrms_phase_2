  const jwt = require('jsonwebtoken');
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  const Employee = require('../models/Employee');
  const { APP_CONSTANTS } = require('../utils/constants');

  /**
   * Generate JWT token
   */
  const generateToken = (payload, expiresIn = APP_CONSTANTS.JWT_EXPIRY) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  };

  /**
   * Verify JWT token
   */
  const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
  };

  /**
   * Compare password with hash
   */
  const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  };

  /**
   * Check if a string looks like a phone number (10 digits only)
   */
  const isPhoneNumber = (str) => {
    if (!str || typeof str !== 'string') return false;
    const digitsOnly = str.replace(/\D/g, '');
    return digitsOnly.length === 10 && /^\d{10}$/.test(digitsOnly);
  };

  /**
   * Safely get employeeId from user
   */
  const getEmployeeIdFromUser = (user) => {
    if (!user || !user.employeeId) return null;
    return user.employeeId._id ? user.employeeId._id : user.employeeId;
  };

  /* =====================================================
    AUTHENTICATE USER (PHONE + USERNAME)
  ===================================================== */
  const authenticateUser = async (loginIdentifier, password, role = null) => {
    if (!loginIdentifier || !password) {
      throw new Error('Login identifier and password are required');
    }

    console.log('Authenticating user with identifier:', loginIdentifier);

    const normalizedIdentifier = String(loginIdentifier).trim();
    const normalizedPhone =
      /^\d{10}$/.test(normalizedIdentifier)
        ? normalizedIdentifier
        : null;

    let user = null;
    let employee = null;

  /* =====================================================
    1️⃣ PHONE LOGIN (EMPLOYEE / HOD / DIRECTOR)
  ===================================================== */
  if (normalizedPhone) {
    if (!role) {
  throw new Error("Role selection is required for phone login");
}
    const phoneRegex = new RegExp(normalizedPhone + '$');

    console.log('Attempting phone login with regex:', phoneRegex);

    /* -----------------------------------------------------
      1️⃣ Find Employee by phone
    ----------------------------------------------------- */
    employee = await Employee.findOne({
      contactNo: { $regex: phoneRegex },
    });

    console.log('Employee found by phone:', employee);

    // Fallback for formatted numbers
    if (!employee) {
      const flexibleRegex = new RegExp(
        normalizedPhone.split('').join('.*')
      );

      employee = await Employee.findOne({
        contactNo: { $regex: flexibleRegex },
      });
    }

    console.log('Employee found by flexible phone regex:', employee);

    /* -----------------------------------------------------
      2️⃣ If Employee NOT found → check direct user (HOD/DIRECTOR)
    ----------------------------------------------------- */
    if (!employee) {
user = await User.findOne({
  phone: normalizedPhone,
  ...(role ? { role } : {}),
})
        .select('+password')
        .populate('employeeId', 'empId empName contactNo department');

      if (!user) {
        throw new Error('Invalid phone number, role, or password');
      }

      if (!['hod', 'director', 'unit_hr'].includes(user.role)) {
        throw new Error('This phone number is not allowed to login here');
      }
    }

    /* -----------------------------------------------------
      3️⃣ If Employee exists → find or repair linked user
    ----------------------------------------------------- */
    if (employee && !user) {

      // Try finding user by employeeId first
      user = await User.findOne({
  employeeId: employee._id,
  ...(role ? { role } : {}),
})
        .select('+password')
        .populate('employeeId', 'empId empName contactNo department');

      // If not found → try by phone/username
      if (!user) {
user = await User.findOne({
  phone: normalizedPhone,
  ...(role ? { role } : {}),
})
          .select('+password')
          .populate('employeeId', 'empId empName contactNo department');
      }

      // If still not found → create new employee user
      if (!user) {
user = await User.create({
  username: normalizedPhone,
  phone: normalizedPhone,
  name: employee.empName,
  password: await bcrypt.hash('123456789', 10),
  role: 'employee',
  employeeId: employee._id,
  isActive: true,
  mustChangePassword: true,
});
      }

      /* -----------------------------------------------------
        4️⃣ 🔥 FORCE LINK REPAIR (CRITICAL FIX)
      ----------------------------------------------------- */
      if (!user.employeeId) {
        user.employeeId = employee._id;
        await user.save();
      }

      if (!employee.userId) {
        employee.userId = user._id;
        await employee.save();
      }
    }

    /* -----------------------------------------------------
      5️⃣ Block admin phone login
    ----------------------------------------------------- */
    if (user && ['super_admin', 'hrms_handler'].includes(user.role)) {
      throw new Error('Admins must login using username');
    }
  }


    /* =====================================================
      2️⃣ USERNAME / EMAIL LOGIN (ADMIN)
    ===================================================== */
    if (!normalizedPhone) {

      console.log('Attempting username/email login with identifier:', normalizedIdentifier);

      user = await User.findOne({
        $or: [
          { username: normalizedIdentifier },
          { email: normalizedIdentifier },
        ],
      })
        .select('+password')
        .populate('employeeId', 'empId empName contactNo department');

        console.log('User found by username/email:', user);

      if (!user) {
        throw new Error('Invalid username or password');
      }

      if (['employee', 'hod', 'director', 'unit_hr'].includes(user.role)) {
        throw new Error('Please login using phone number');
      }
    }

    /* =====================================================
      3️⃣ COMMON VALIDATIONS
    ===================================================== */
    if (!user.isActive) {
      throw new Error(
        'Account is deactivated. Please contact administrator.'
      );
    }

    const isPasswordMatch = await comparePassword(
      password,
      user.password
    );

    if (!isPasswordMatch) {
      throw new Error('Invalid username or password');
    }

    /* =====================================================
      4️⃣ UPDATE LAST LOGIN
    ===================================================== */
    user.lastLogin = new Date();
    await user.save();

    /* =====================================================
      5️⃣ RELOAD USER (CLEAN POPULATION)
    ===================================================== */
    const populatedUser = await User.findById(user._id)
      .populate('employeeId', 'empId empName contactNo department')
      .lean();

    /* =====================================================
      6️⃣ GENERATE TOKEN
    ===================================================== */
    const tokenPayload = {
      id: populatedUser._id,
      username: populatedUser.username,
      role: populatedUser.role,
      unit: populatedUser.unit || null, 
      name:
        populatedUser.name ||
        populatedUser.employeeId?.empName ||
        null,
      empId: populatedUser.employeeId?.empId || null,
      employeeObjectId:
        populatedUser.employeeId?._id || null,
    };

    const token = generateToken(
      tokenPayload,
      APP_CONSTANTS.JWT_EXPIRY
    );

    /* =====================================================
      7️⃣ FINAL RESPONSE
    ===================================================== */
    return {
      token,
      user: {
        id: populatedUser._id,
        username: populatedUser.username,
        role: populatedUser.role,
        name:
          populatedUser.name ||
          populatedUser.employeeId?.empName ||
          null,
        empId: populatedUser.employeeId?.empId || null,
        employeeId: populatedUser.employeeId?._id || null,
        employeeName:
          populatedUser.employeeId?.empName || null,
        department:
          populatedUser.department ||
          populatedUser.employeeId?.department ||
          null,
        mustChangePassword:
          !!populatedUser.mustChangePassword,
      },
    };
  };
  /* =====================================================
    UPDATE PASSWORD
  ===================================================== */
  const updatePassword = async (userId, newPassword) => {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.password = newPassword; // hashed by pre-save hook
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();

    await user.save();
    return true;
  };


  /* =====================================================
    CREATE USER
  ===================================================== */
  const createUser = async (userData, creatorUser = null) => {
    const { username, role, employeeId, password, department } = userData;

    if (!username || !role) {
      throw new Error('Username and role are required');
    }

    const trimmedUsername = String(username).trim();
    const isPhone = /^\d{10}$/.test(trimmedUsername);

    /* =====================================================
      1️⃣ USERNAME / PHONE UNIQUENESS CHECK
    ===================================================== */
    const existingUser = await User.findOne({
      $or: [
        { username: trimmedUsername },
        ...(isPhone ? [{ phone: trimmedUsername }] : []),
      ],
    });

    if (existingUser) {
      throw new Error('Username or phone number already exists');
    }

    /* =====================================================
      2️⃣ ROLE PERMISSION VALIDATION
    ===================================================== */
    if (creatorUser) {
      const { canManageRole } = require('../utils/rolePermissions');

      if (!canManageRole(creatorUser.role, role)) {
        throw new Error('You do not have permission to create this user');
      }
    }

    /* =====================================================
      3️⃣ PASSWORD RULES BY ROLE
    ===================================================== */
    let finalPassword;
    let mustChangePassword = false;

    switch (role) {
      case 'employee':
        finalPassword = '123456789';
        mustChangePassword = true;
        break;

      case 'hod':
      case 'director':
        finalPassword = 'accord@123';
        break;

      case 'super_admin':
      case 'hrms_handler':
        if (!password || password.length < 8) {
          throw new Error('Admin password must be at least 8 characters');
        }
        finalPassword = password;
        break;

      default:
        throw new Error('Invalid role');
    }

    /* =====================================================
      4️⃣ EMPLOYEE LINK VALIDATION
    ===================================================== */
    let employee = null;

    if (employeeId) {
      employee = await Employee.findById(employeeId);

      if (!employee) {
        throw new Error('Employee not found');
      }

      const existingEmployeeUser = await User.findOne({ employeeId });
      if (existingEmployeeUser) {
        throw new Error('This employee already has a user account');
      }
    }

    /* =====================================================
      5️⃣ CREATE USER
    ===================================================== */
    const user = await User.create({
      username: trimmedUsername,
      phone: isPhone ? trimmedUsername : null,
      password: finalPassword,
      role,
      department:
        role === 'hod' || role === 'director'
          ? department || null
          : null,
      employeeId: employeeId || null,
      isActive: true,
      createdBy: creatorUser ? creatorUser.id : null,
      mustChangePassword,
    });

    /* =====================================================
      6️⃣ LINK EMPLOYEE → USER
    ===================================================== */
    if (employee) {
      employee.userId = user._id;
      await employee.save();
    }

    /* =====================================================
      7️⃣ SAFE RESPONSE
    ===================================================== */
    return {
      id: user._id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
      mustChangePassword: user.mustChangePassword,
    };
  };


  /* =====================================================
    GET USER
  ===================================================== */
  const getUserById = async (userId) => {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  };

  const getUserByEmail = async (email) => {
    return await User.findOne({ email }).select('-password');
  };


  /* =====================================================
    DELETE USER
  ===================================================== */
  const deleteUser = async (userId) => {
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      throw new Error('User not found');
    }
    return true;
  };


  /* =====================================================
    GET ALL USERS
  ===================================================== */
  const getAllUsers = async (filter = {}) => {
    return await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });
  };


  /* =====================================================
    EXPORTS
  ===================================================== */
  module.exports = {
    generateToken,
    verifyToken,
    comparePassword,
    authenticateUser,
    updatePassword,
    createUser,
    getUserById,
    getUserByEmail,
    deleteUser,
    getAllUsers,
  };
