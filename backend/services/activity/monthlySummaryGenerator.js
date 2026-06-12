const Activity = require('../../models/Activity');
const {
  calculateMonthlySummary,
  saveMonthlySummary,
  getPayrollCycleKey,
  getCycleMetaFromKey
} = require('./monthlySummaryService');

/**
 * Regenerate monthly summaries for a SINGLE employee
 * 🔒 Payroll cycle: 21 → 20
 */
const regenerateMonthlySummaryForEmployee = async (empId, empUnit) => {
  try {
    if (!empId) {
      console.warn('⚠️ regenerateMonthlySummary: empId missing');
      return;
    }

    if (!empUnit) {
      console.warn(`⚠️ regenerateMonthlySummary: empUnit missing for empId=${empId}`);
      return;
    }

    /* =========================
       FETCH ACTIVITIES (FIXED)
    ========================= */
    const activities = await Activity.find({
      empId,
      empUnit   // 🔥 CRITICAL FIX
    }).sort({ date: 1 });

    if (!activities.length) {
      console.warn(`⚠️ No activities found for ${empId} (${empUnit})`);
      return;
    }

    /* =========================
       GROUP BY PAYROLL CYCLE
    ========================= */
    const cycles = {};

    for (const act of activities) {
      const cycleKey = getPayrollCycleKey(act.date);

      if (!cycles[cycleKey]) {
        const { year, month } = getCycleMetaFromKey(cycleKey);

        cycles[cycleKey] = {
          empName: act.empName,
          empUnit: act.empUnit,
          year,
          month,
          activities: [],
        };
      }

      cycles[cycleKey].activities.push(act);
    }

    /* =========================
       GENERATE & SAVE
    ========================= */
    for (const cycleKey of Object.keys(cycles)) {
      const { empName, empUnit, activities, year, month } = cycles[cycleKey];

      if (!activities.length) continue;

      const summary = calculateMonthlySummary(
        empId,
        empName,
        activities,
        cycleKey   // ✅ correct usage
      );

      if (!summary) continue;

      // 🔥 CRITICAL: ensure unit is set
      summary.empUnit = empUnit;

      console.log(
        `📊 MonthlySummary | ${empId} (${empUnit}) | ${month}/${year} | TOTAL=${summary.totalDays}`
      );

      await saveMonthlySummary(summary);
    }

    console.log(`✅ Monthly summary regenerated for ${empId} (${empUnit})`);

  } catch (error) {
    console.error('❌ Error in regenerateMonthlySummaryForEmployee:', error);
  }
};

module.exports = {
  regenerateMonthlySummaryForEmployee,
};