const express = require('express');
const router = express.Router();

const MonthlySummary = require('../models/MonthlySummary');
const Activity = require('../models/Activity');

const {
  calculateMonthlySummary,
} = require('../services/activity/monthlySummaryService');

const { protect } = require('../middleware/authMiddleware');

router.use(protect);

/* =========================================================
   🔥 GET: Monthly summary by employee (AUTO-GENERATE)
========================================================= */
router.get('/employee/:empId', async (req, res) => {
  try {
    const { empId } = req.params;
    const { year, month, unit } = req.query;
    const { role, id: userId } = req.user;

    // ✅ VALIDATION
    if (!unit) {
      return res.status(400).json({
        success: false,
        message: 'Unit is required',
      });
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year and month are required',
      });
    }

    const y = Number(year);
    const m = Number(month);

    /* =========================
       🔐 HIERARCHY CHECK
    ========================= */
    if (role === 'hod' || role === 'director') {
      const { getReportingEmployees } = require('../services/hierarchyService');
      const reportingEmployees = await getReportingEmployees(userId, role);
      const allowedEmpIds = reportingEmployees.map(e => e.empId);

      if (!allowedEmpIds.includes(empId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this employee summary',
        });
      }
    }

    /* =========================
       🔥 STEP 1: CHECK EXISTING
    ========================= */
    let existingSummary = await MonthlySummary.findOne({
      empId,
      empUnit: unit,
      year: y,
      month: m,
    });

    if (existingSummary) {
      return res.status(200).json({
        success: true,
        data: existingSummary,
      });
    }

    /* =========================
       🔥 STEP 2: CALCULATE FROM ACTIVITIES
    ========================= */

    const cycleStart = new Date(y, m - 1, 21, 0, 0, 0, 0);
    const cycleEnd = new Date(y, m, 20, 23, 59, 59, 999);

    const activities = await Activity.find({
      empId,
      empUnit: unit,
      date: { $gte: cycleStart, $lte: cycleEnd },
    }).sort({ date: 1 });

    if (!activities.length) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No attendance data found for this cycle',
      });
    }

    /* =========================
       🔥 STEP 3: GENERATE SUMMARY
    ========================= */

    const summary = calculateMonthlySummary(
      empId,
      activities[0].empName,
      activities,
      unit
    );

    /* =========================
       🔥 STEP 4: UPSERT (MAIN FIX)
    ========================= */

    const savedSummary = await MonthlySummary.findOneAndUpdate(
      {
        empId,
        empUnit: unit,
        year: summary.year,
        month: summary.month,
      },
      {
        ...summary,
        empUnit: unit,
      },
      {
        upsert: true,
        new: true,
      }
    );

    return res.status(200).json({
      success: true,
      data: savedSummary,
    });

  } catch (error) {
    console.error('❌ Get Monthly Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching monthly summary',
    });
  }
});

/* =========================================================
   GET: All summaries
========================================================= */
router.get('/', async (req, res) => {
  try {
    const { empId, year, month, unit, limit = 50, page = 1 } = req.query;
    const { role, id: userId } = req.user;

    let filter = {};

    if (role === 'hod' || role === 'director') {
      const { getReportingEmployees } = require('../services/hierarchyService');
      const reportingEmployees = await getReportingEmployees(userId, role);
      const allowedEmpIds = reportingEmployees.map(e => e.empId);

      filter.empId = { $in: allowedEmpIds };
    }

    if (empId) filter.empId = { $regex: empId, $options: 'i' };
    if (unit) filter.empUnit = unit;
    if (year) filter.year = Number(year);
    if (month) filter.month = Number(month);

    const skip = (Number(page) - 1) * Number(limit);

    const data = await MonthlySummary.find(filter)
      .sort({ year: -1, month: -1, empId: 1 })
      .skip(skip)
      .limit(Number(limit));

    const totalCount = await MonthlySummary.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: data.length,
      totalCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / limit),
      data,
    });
  } catch (error) {
    console.error('❌ Get All Monthly Summaries Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching monthly summaries',
    });
  }
});

/* =========================================================
   DELETE: Employee summaries
========================================================= */
router.delete('/employee/:empId', async (req, res) => {
  try {
    const { empId } = req.params;
    const { unit } = req.query;

    const filter = { empId };

    if (unit) {
      filter.empUnit = unit;
    }

    const result = await MonthlySummary.deleteMany(filter);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} summaries deleted`,
      deletedCount: result.deletedCount,
    });

  } catch (error) {
    console.error('❌ Delete Employee Summaries Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting summaries',
    });
  }
});

/* =========================================================
   DELETE: Single summary
========================================================= */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await MonthlySummary.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Monthly summary not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Monthly summary deleted',
      data: deleted,
    });
  } catch (error) {
    console.error('❌ Delete Monthly Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting summary',
    });
  }
});

module.exports = router;