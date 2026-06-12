const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  uploadActivityData,
  getAllActivities,
  deleteAllActivities,
  deleteActivitiesByDateRange,
  uploadActivityExcel,
  updateActivityStatus,
  recalculateAttendance,
  getMonthlySummary,
} = require('../controllers/activityController');

const {
  protect,
  authorizeRoles,
  authorizeDepartment,
} = require('../middleware/authMiddleware');

/* =========================================================
   MULTER CONFIG
========================================================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(xlsx|xls)$/i;
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];

    if (
      allowedExtensions.test(file.originalname) ||
      allowedMimeTypes.includes(file.mimetype)
    ) {
      return cb(null, true);
    }

    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  },
});

/* =========================================================
   VALIDATE DATE RANGE
========================================================= */
const validateUploadDateRange = (req, res, next) => {
  const { fromDate, toDate } = req.body;

  if (!fromDate || !toDate) {
    return res.status(400).json({
      success: false,
      message: 'fromDate and toDate are required',
    });
  }

  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);

  if (!fy || !fm || !fd || !ty || !tm || !td) {
    return res.status(400).json({
      success: false,
      message: 'Invalid fromDate or toDate format',
    });
  }

  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);

  if (from > to) {
    return res.status(400).json({
      success: false,
      message: 'fromDate cannot be after toDate',
    });
  }

  req.uploadRange = { fromDate: from, toDate: to };
  next();
};

/* =========================================================
   🔥 VALIDATE UNIT (NEW)
========================================================= */
const validateUnit = (req, res, next) => {
  const { unit } = req.body;

  if (!unit) {
    return res.status(400).json({
      success: false,
      message: 'Unit is required',
    });
  }

  next();
};

/* =========================================================
   ROUTES
========================================================= */

/**
 * 🔥 UPDATE ACTIVITY STATUS
 */
router.patch(
  '/:id/status',
  protect,
  authorizeRoles('super_admin', 'superadmin', 'admin', 'hrms_handler', 'unit_hr'),
  updateActivityStatus
);

/**
 * 🔥 GET MONTHLY SUMMARY
 * Example:
 * /api/activities/monthly-summary?empId=3243&empUnit=APDP&year=2026&month=5
 */
router.get(
  '/monthly-summary',
  protect,
  authorizeRoles(
    'super_admin',
    'superadmin',
    'admin',
    'hrms_handler',
    'unit_hr',
    'director',
    'hod',
    'employee'
  ),
  getMonthlySummary
);

/**
 * Upload activity data (JSON)
 */
router.post(
  '/upload',
  protect,
  authorizeRoles('super_admin', 'superadmin', 'admin', 'unit_hr', 'hrms_handler'),
  uploadActivityData
);

/**
 * 🔥 Upload activity data (Excel)
 */
router.post(
  '/upload-excel',
  protect,
  authorizeRoles('super_admin', 'superadmin', 'admin', 'unit_hr', 'hrms_handler'),
  upload.single('file'),
  validateUploadDateRange,
  validateUnit, // 🔥 IMPORTANT
  uploadActivityExcel
);

/**
 * Get all activities
 */
router.get(
  '/',
  protect,
  authorizeRoles(
    'super_admin',
    'superadmin',
    'admin',
    'hrms_handler',
    'director',
    'hod',
    'unit_hr',
    'employee'
  ),
  authorizeDepartment,
  getAllActivities
);

/**
 * Delete ALL activities
 */
router.delete(
  '/',
  protect,
  authorizeRoles(
    'admin',
    'hrms_handler',
    'super_admin',
    'superadmin',
    'unit_hr'
  ),
  deleteAllActivities
);

/**
 * 🔥 Delete by date range
 * Supports: ?startDate=&endDate=&empId=&unit=
 */
router.delete(
  '/date-range',
  protect,
  authorizeRoles(
    'admin',
    'hrms_handler',
    'super_admin',
    'superadmin',
    'unit_hr'
  ),
  deleteActivitiesByDateRange
);

/**
 * 🔥 Recalculate attendance
 */
router.post(
  '/recalculate',
  protect,
  authorizeRoles(
    'admin',
    'hrms_handler',
    'super_admin',
    'superadmin',
    'unit_hr'
  ),
  recalculateAttendance
);

module.exports = router;