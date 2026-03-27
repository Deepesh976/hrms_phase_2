const express = require('express');
const router = express.Router();

const controller = require('../controllers/usersController');
const LoginActivity = require('../models/LoginActivity'); // ✅ ADD THIS

const {
  protect,
  authorizeRoles,
  requireSuperAdmin,
} = require('../middleware/authMiddleware');

const { ROLES } = require('../utils/rolePermissions');

/* =========================================================
   USER MANAGEMENT
========================================================= */

/**
 * Create User
 * Access: Super Admin / HRMS Handler
 */
router.post(
  '/',
  protect,
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.HRMS_HANDLER
  ),
  controller.createUser
);

/**
 * List All Users
 */
router.get(
  '/',
  protect,
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.HRMS_HANDLER
  ),
  controller.listUsers
);

/* =========================================================
   PASSWORD MANAGEMENT VIEW
========================================================= */

/**
 * List Users With Employee Info
 */
router.get(
  '/with-employee',
  protect,
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.HRMS_HANDLER,
    ROLES.UNIT_HR
  ),
  controller.listUsersWithEmployee
);

/* =========================================================
   🔥 LOGIN HISTORY (NEW)
========================================================= */

router.get(
  '/login-history/:userId',
  protect,
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.HRMS_HANDLER
  ),
  async (req, res) => {
    try {

      const data = await LoginActivity.find({
        userId: req.params.userId,
      }).sort({ loginTime: -1 });

      res.json({
        success: true,
        items: data,
      });

    } catch (err) {
      console.error('❌ login-history error:', err);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching login history',
      });
    }
  }
);

/* =========================================================
   USER DETAILS
========================================================= */

router.get(
  '/:id',
  protect,
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.HRMS_HANDLER
  ),
  controller.getUserById
);

router.put(
  '/:id',
  protect,
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.HRMS_HANDLER
  ),
  controller.updateUser
);

router.delete(
  '/:id',
  protect,
  requireSuperAdmin,
  controller.deleteUser
);

/* =========================================================
   PASSWORD RESET
========================================================= */

router.post(
  '/:userId/reset-password',
  protect,
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.HRMS_HANDLER,
    ROLES.UNIT_HR
  ),
  controller.resetPasswordByHR
);

router.post(
  '/change-password',
  protect,
  controller.changePassword
);

module.exports = router;