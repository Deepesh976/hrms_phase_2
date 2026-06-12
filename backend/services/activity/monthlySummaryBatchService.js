const Activity = require('../../models/Activity');
const {
  calculateMonthlySummary,
  saveMonthlySummary,
  getPayrollCycleKey,
} = require('./monthlySummaryService');

/**
 * Generate monthly summary for ALL employees
 * 🔒 Payroll cycle: 21 → 20
 * 🔥 Payroll Month = CYCLE END MONTH
 */
const generateMonthlySummaryForCycle = async (cycleDate) => {

  /* =====================================================
     1️⃣ DETERMINE PAYROLL CYCLE RANGE (21 → 20)
  ===================================================== */

  const d = new Date(cycleDate);
  d.setHours(0, 0, 0, 0);

  let cycleStartYear = d.getFullYear();
  let cycleStartMonth = d.getMonth() + 1;

  if (d.getDate() < 21) {
    cycleStartMonth -= 1;

    if (cycleStartMonth === 0) {
      cycleStartMonth = 12;
      cycleStartYear -= 1;
    }
  }

  const startDate = new Date(
    cycleStartYear,
    cycleStartMonth - 1,
    21,
    0, 0, 0, 0
  );

  const endDate = new Date(
    cycleStartYear,
    cycleStartMonth,
    20,
    23, 59, 59, 999
  );

  /* =====================================================
     2️⃣ PAYROLL MONTH = CYCLE END MONTH
  ===================================================== */

  const payrollMonth = endDate.getMonth() + 1;
  const payrollYear = endDate.getFullYear();

  /* =====================================================
     3️⃣ FETCH ACTIVITIES
  ===================================================== */

  const activities = await Activity.find({
    date: { $gte: startDate, $lte: endDate },
  }).sort({ empId: 1, date: 1 });

  /* =====================================================
     4️⃣ GROUP BY empId + empUnit (🔥 FIX)
  ===================================================== */

  const employeeMap = {};

  for (const act of activities) {

    const key = `${act.empId}__${act.empUnit}`;

    if (!employeeMap[key]) {
      employeeMap[key] = {
        empId: act.empId,
        empUnit: act.empUnit, // 🔥 CRITICAL
        empName: act.empName,
        activities: [],
      };
    }

    employeeMap[key].activities.push(act);
  }

  /* =====================================================
     5️⃣ GENERATE & SAVE SUMMARY
  ===================================================== */

  let count = 0;

  for (const key of Object.keys(employeeMap)) {

    const { empId, empUnit, empName, activities } = employeeMap[key];
    if (!activities.length) continue;

    const cycleKey = getPayrollCycleKey(activities[0].date);

    const summary = calculateMonthlySummary(
      empId,
      empName,
      activities,
      cycleKey
    );

    if (!summary) continue;

    /* =====================================================
       FORCE PAYROLL MONTH/YEAR
    ===================================================== */

    summary.empUnit = empUnit; // 🔥 MUST

    const totalPresent = Number(summary.totalPresent || 0);
    const totalAbsent = Number(summary.totalAbsent || 0);

    console.log(
      `📊 MonthlySummary | ${empId} (${empUnit}) | ${payrollMonth}/${payrollYear} | ` +
      `P=${totalPresent}, A=${totalAbsent}, TOTAL=${summary.totalDays}`
    );

    await saveMonthlySummary(summary);
    count++;
  }

  return {
    cycle: `${startDate.toDateString()} → ${endDate.toDateString()}`,
    payrollMonth: `${payrollMonth}/${payrollYear}`,
    employeesProcessed: count,
  };
};

module.exports = {
  generateMonthlySummaryForCycle,
};