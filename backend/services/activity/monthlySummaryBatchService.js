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

  // If date is before 21 → belongs to previous cycle
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
     2️⃣ 🔥 PAYROLL MONTH = CYCLE END MONTH
  ===================================================== */

  const payrollMonth = endDate.getMonth() + 1;
  const payrollYear = endDate.getFullYear();

  /* =====================================================
     3️⃣ FETCH ACTIVITIES (ONLY THIS PAYROLL CYCLE)
  ===================================================== */

  const activities = await Activity.find({
    date: { $gte: startDate, $lte: endDate },
  }).sort({ empId: 1, date: 1 });

  /* =====================================================
     4️⃣ GROUP BY EMPLOYEE
  ===================================================== */

  const employeeMap = {};

  for (const act of activities) {
    if (!employeeMap[act.empId]) {
      employeeMap[act.empId] = {
        empName: act.empName,
        activities: [],
      };
    }
    employeeMap[act.empId].activities.push(act);
  }

  /* =====================================================
     5️⃣ GENERATE & SAVE MONTHLY SUMMARY
  ===================================================== */

  let count = 0;

  for (const empId of Object.keys(employeeMap)) {

    const { empName, activities } = employeeMap[empId];
    if (!activities.length) continue;

    const cycleKey = getPayrollCycleKey(startDate);

    const summary = calculateMonthlySummary(empId, empName, activities, cycleKey);
    if (!summary) continue;

    /* =====================================================
       🔥 FORCE CORRECT PAYROLL MONTH & YEAR
    ===================================================== */

    summary.month = payrollMonth;
    summary.year = payrollYear;

    const totalPresent = Number(summary.totalPresent || 0);
    const totalAbsent = Number(summary.totalAbsent || 0);
    const totalWO = Number(summary.totalWOCount || 0);
    const totalHO = Number(summary.totalHOCount || 0);
    const totalALF = Number(summary.totalALF || 0);
    const totalALH = Number(summary.totalALH || 0);

    console.log(
      `📊 MonthlySummary FINAL | ${empId} | ${payrollMonth}/${payrollYear} | ` +
      `P=${totalPresent}, A=${totalAbsent}, WO=${totalWO}, HO=${totalHO}, TOTAL=${summary.totalDays}`
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
