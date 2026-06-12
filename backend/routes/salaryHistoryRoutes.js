const express = require('express');
const router = express.Router();

const {
  getSalaryHistoryByEmpId,
  addSalaryRevision,
  updateSalaryHistory,
  deleteSalaryHistory,
  repairAllSalaryHistory
} = require('../controllers/salaryHistoryController');

const { protect, requireAdmin } = require('../middleware/authMiddleware');

/* =====================================================
   🔥 REPAIR ALL (PUT THIS FIRST!)
===================================================== */
router.post('/repair-all', protect, repairAllSalaryHistory);

/* =====================================================
   GET salary history by employee ID
===================================================== */
router.get('/:empId', protect, getSalaryHistoryByEmpId);

/* =====================================================
   ADD salary revision
===================================================== */
router.post('/:empId/add', protect, addSalaryRevision);

/* =====================================================
   UPDATE salary history entry
===================================================== */
router.put('/:historyId', protect, updateSalaryHistory);

/* =====================================================
   DELETE salary history entry
===================================================== */
router.delete('/:historyId', protect, deleteSalaryHistory);

module.exports = router;
