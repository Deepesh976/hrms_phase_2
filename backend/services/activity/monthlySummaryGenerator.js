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
const regenerateMonthlySummaryForEmployee = async (empId) => {
  if (!empId) return;

  const activities = await Activity.find({ empId }).sort({ date: 1 });
  if (!activities.length) return;

  /* =========================
     GROUP BY PAYROLL CYCLE (FIXED)
  ========================= */
  const cycles = {};

  for (const act of activities) {
    const cycleKey = getPayrollCycleKey(act.date);

    if (!cycles[cycleKey]) {
      const { year, month } = getCycleMetaFromKey(cycleKey);

      cycles[cycleKey] = {
        empName: act.empName,
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
    const { empName, activities, year, month } = cycles[cycleKey];
    if (!activities.length) continue;

const summary = calculateMonthlySummary(
  empId,
  empName,
  activities,
  cycleKey   // 🔥 THIS IS THE FIX
);

    if (!summary) continue;

    /* =========================
       DEBUG LOG
    ========================= */
    console.log(
      `📊 MonthlySummary | ${empId} | ${month}/${year} | TOTAL=${summary.totalDays}`
    );

    await saveMonthlySummary(summary);
  }
};

module.exports = {
  regenerateMonthlySummaryForEmployee,
};