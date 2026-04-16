const express = require('express');
const router = express.Router();

const {
  uploadInputData,
  getAllInputData,
  deleteAllInputData,
  updateInputDataById,
  deleteInputDataById,
  deleteManyInputData,
} = require('../controllers/inputDataController');

const {
  protect,
  authorizeRoles
} = require('../middleware/authMiddleware');


// =======================================
// INPUT DATA ROUTES (STAGING SALARY DATA)
// =======================================

// Upload Excel or frontend data
router.post(
  '/upload',
  protect,
  authorizeRoles('super_admin', 'hrms_handler', 'unit_hr'),
  uploadInputData
);

// Get input data (FILTERED BY ROLE / UNIT)
router.get(
  '/',
  protect,
  authorizeRoles('super_admin', 'hrms_handler', 'unit_hr'),
  getAllInputData
);

// Delete all data (hard reset)
router.delete(
  '/all',
  protect,
  authorizeRoles('super_admin', 'hrms_handler', 'unit_hr'),
  deleteAllInputData
);

// Update one input row
router.put(
  '/:id',
  protect,
  authorizeRoles('super_admin', 'hrms_handler', 'unit_hr'),
  updateInputDataById
);

// Delete one input row
router.delete(
  '/:id',
  protect,
  authorizeRoles('super_admin', 'hrms_handler', 'unit_hr'),
  deleteInputDataById
);

// Bulk delete selected rows
router.post(
  '/delete-many',
  protect,
  authorizeRoles('super_admin', 'hrms_handler', 'unit_hr'),
  deleteManyInputData
);;

module.exports = router;