const express = require('express');
const router = express.Router();

const {
  createHR,
  getAllHRs,
  getHRById,
  updateHR,
  deleteHR
} = require('../controllers/hrController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

/* ================= PROTECT ALL ROUTES ================= */
router.use(protect);

/* ================= CREATE SUB HR ================= */
router.post(
  '/',
  authorizeRoles('super_admin', 'hrms_handler'),
  createHR
);

/* ================= GET ALL SUB HRS ================= */
router.get(
  '/',
  authorizeRoles('super_admin', 'hrms_handler'),
  getAllHRs
);

/* ================= GET SINGLE SUB HR ================= */
router.get(
  '/:id',
  authorizeRoles('super_admin', 'hrms_handler'),
  getHRById
);

/* ================= UPDATE SUB HR ================= */
router.put(
  '/:id',
  authorizeRoles('super_admin', 'hrms_handler'),
  updateHR
);

/* ================= DELETE SUB HR ================= */
router.delete(
  '/:id',
  authorizeRoles('super_admin', 'hrms_handler'),
  deleteHR
);

module.exports = router;