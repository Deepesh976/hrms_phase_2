const mongoose = require('mongoose');

/**
 * Monthly Summary Schema
 * 🔥 Payroll cycle: 21st → 20th
 */

const monthlySummarySchema = new mongoose.Schema(
  {
    /* =========================
       BASIC IDENTITY
    ========================= */

    empId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    empName: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔥 MULTI-UNIT SUPPORT (CRITICAL)
    empUnit: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /* =========================
       PAYROLL CYCLE
    ========================= */

    year: {
      type: Number,
      required: true,
      index: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },

    /* =========================
       ATTENDANCE COUNTS
    ========================= */

    totalPresent: {
      type: Number,
      default: 0,
    },

    totalAbsent: {
      type: Number,
      default: 0,
    },

    totalALF: {
      type: Number,
      default: 0,
    },

    totalALH: {
      type: Number,
      default: 0,
    },

    totalWOCount: {
      type: Number,
      default: 0,
    },

    totalHOCount: {
      type: Number,
      default: 0,
    },

    totalDays: {
      type: Number,
      required: true,
    },
  },
  {
    // 🔥 AUTO timestamps (BEST PRACTICE)
    timestamps: true,
  }
);

/* =========================
   🔥 UNIQUE INDEX (CRITICAL)
========================= */

monthlySummarySchema.index(
  { empId: 1, empUnit: 1, year: 1, month: 1 },
  { unique: true }
);

/* =========================
   🔥 PERFORMANCE INDEX
========================= */

monthlySummarySchema.index({
  empUnit: 1,
  year: 1,
  month: 1,
});

module.exports = mongoose.model('MonthlySummary', monthlySummarySchema);