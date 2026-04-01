const MonthlySummary = require('../../models/MonthlySummary');

/* =========================================================
   PAYROLL CYCLE HELPERS
   Cycle = 21st → 20th
========================================================= */

// 🔥 Get cycle key (based on 21st)
const getPayrollCycleKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getDate() < 21) {
    d.setMonth(d.getMonth() - 1);
  }

  d.setDate(21);

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    21
  ).toISOString().slice(0, 10);
};


// 🔥 SAFE cycle meta (NO overflow bugs)
const getCycleMetaFromKey = (cycleKey) => {
  const start = new Date(cycleKey);

  const cycleStart = new Date(
    start.getFullYear(),
    start.getMonth(),
    21
  );

  const cycleEnd = new Date(
    cycleStart.getFullYear(),
    cycleStart.getMonth() + 1,
    20
  );

  // 🔥 Payroll month = END month
  const year = cycleEnd.getFullYear();
  const month = cycleEnd.getMonth() + 1;

  return { cycleStart, cycleEnd, year, month };
};


/* =========================================================
   CALCULATE MONTHLY SUMMARY
========================================================= */

const calculateMonthlySummary = (empId, empName, activities, cycleKey) => {
  if (!activities || !activities.length) return null;

  /* =========================
     COUNTERS
  ========================= */

  let totalPresent = 0;
  let totalAbsent = 0;
  let totalALF = 0;
  let totalALH = 0;
  let totalWOCount = 0;
  let totalHOCount = 0;
  let weeklyOffPresent = 0;

  /* =========================
     COUNT STATUS
  ========================= */

  // ✅ FIXED: using correct variable
  for (const act of activities) {
    switch (act.status) {

      case 'P':
        totalPresent += 1;
        break;

      case '½P':
        totalPresent += 0.5;
        totalAbsent += 0.5;
        break;

      case 'A':
        totalAbsent += 1;
        break;

      case 'ALF':
        totalALF += 1;
        break;

case 'ALH':
  totalALH += 0.5;

  if (act.originalStatus === 'A') {
    // Case 1: A → ALH
    totalPresent += 0.5;
    totalAbsent += 0.5;
  }

  else if (act.originalStatus === '½P') {
    // Case 2: ½P → ALH
    totalPresent += 1;   // 🔥 full day now
    // DO NOT add absent
  }

  else {
    // fallback (safe default)
    totalPresent += 0.5;
  }

  break;

      case 'WO':
        totalWOCount += 1;

        if (act.timeInActual && act.timeInActual !== '00:00:00') {
          weeklyOffPresent += 1;
        }
        break;

      case 'HO':
        totalHOCount += 1;
        break;

      default:
        break;
    }
  }

  /* =========================
     META
  ========================= */

  const { year, month, cycleStart, cycleEnd } =
    getCycleMetaFromKey(cycleKey);

  /* =========================================================
     🔥 TOTAL DAYS (SOURCE OF TRUTH)
     ALWAYS based on 21 → 20 cycle
  ========================================================= */

  const start = new Date(cycleStart);
  const end = new Date(cycleEnd);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();

  const totalDays =
    Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  /* =========================================================
     DAYS WORKED (FOR SALARY)
  ========================================================= */

  // ✅ FIXED: completed calculation
  const daysWorked =
    totalPresent +
    totalWOCount +
    totalHOCount +
    totalALF +
    (totalALH || 0);

  /* =========================================================
     DEBUG
  ========================================================= */

  console.log(
    `📊 MonthlySummary | ${empId} | ${month}/${year} | TOTAL=${totalDays}`
  );

  return {
    empId,
    empName,

    year,
    month,

    cycleStart,
    cycleEnd,

    totalDays,

    totalPresent,
    totalAbsent,

    totalALF,
    totalALH,

    totalWOCount,
    totalHOCount,
    weeklyOffPresent,

    daysWorked,
  };
};


/* =========================================================
   SAVE SUMMARY
========================================================= */

const saveMonthlySummary = async (summary) => {
  if (!summary) return null;

  return MonthlySummary.updateOne(
    {
      empId: summary.empId,
      year: summary.year,
      month: summary.month,
    },
    { $set: summary },
    { upsert: true }
  );
};


/* =========================================================
   PAYROLL CYCLE FROM DATE (FOR GROUPING)
========================================================= */

const getPayrollCycleFromDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  let year = d.getFullYear();
  let month = d.getMonth() + 1;

    

  if (d.getDate() < 21) {
    month -= 1;

    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return { year, month };
};


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  calculateMonthlySummary,
  saveMonthlySummary,
  getPayrollCycleFromDate,
  getPayrollCycleKey,
  getCycleMetaFromKey
};