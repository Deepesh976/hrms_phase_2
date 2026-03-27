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
  authorizeDepartment
} = require('../middleware/authMiddleware');


// =======================================
// INPUT DATA ROUTES (STAGING SALARY DATA)
// =======================================

// Upload Excel or frontend data
router.post('/upload', protect, authorizeDepartment, uploadInputData);

// Get input data (FILTERED BY ROLE / UNIT)
router.get('/', protect, authorizeDepartment, getAllInputData);

// Delete all data (hard reset)
router.delete('/all', protect, authorizeDepartment, deleteAllInputData);

// Update one input row
router.put('/:id', protect, authorizeDepartment, updateInputDataById);

// Delete one input row
router.delete('/:id', protect, authorizeDepartment, deleteInputDataById);

// Bulk delete selected rows
router.post('/delete-many', protect, authorizeDepartment, deleteManyInputData);

module.exports = router;