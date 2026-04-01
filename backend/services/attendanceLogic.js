// services/activity/attendanceLogic.js

/* =========================
   CONSTANTS (SECONDS)
========================= */
const TIMES = {
  T_09_16: 9 * 3600 + 16 * 60,
  T_09_30: 9 * 3600 + 30 * 60,
  T_11_00: 11 * 3600,
  T_13_00: 13 * 3600,
  T_15_30: 15 * 3600 + 30 * 60,
  T_17_30: 17 * 3600 + 30 * 60,
};

const NEXT_DAY_CUTOFF = 3 * 3600; // 03:00:00

const LIMITS = {
  LATE: 3,
  PERMISSION: 2,
};

/* =========================
   HELPERS
========================= */
const timeToSeconds = (t) => {
  if (!t || t === '00:00' || t === '00:00:00') return null;
  const [h, m, s = 0] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

/* =========================
   CORE ENGINE
========================= */

function evaluateAttendanceDay({
  inTime,
  outTime,
  isSunday = false,
  isHoliday = false,
  counters = { late: 0, permission: 0 },
}) {
  const decision = {
    present: false,
    half: false,
    absent: false,
    wo: false,
    ho: false,
    lateUsed: 0,
    permissionUsed: 0,
  };

  /* =========================
     STEP 1: HOLIDAY / WO
  ========================= */

  if (isHoliday) {
    decision.ho = true;
    return decision;
  }

  if (isSunday) {
    decision.wo = true;
    return decision;
  }

  const inS = timeToSeconds(inTime);
  const outS = timeToSeconds(outTime);

  /* =========================
     🔥 OVERNIGHT HANDLING
  ========================= */
  let adjustedOutS = outS;

  if (inS !== null && outS !== null && outS < inS) {
    if (outS <= NEXT_DAY_CUTOFF) {
      adjustedOutS = outS + (24 * 3600);
    } else {
      adjustedOutS = null;
    }
  }

  /* =========================
     STEP 2: NO CHECKIN
  ========================= */

  if (inS === null) {
    decision.absent = true;
    return decision;
  }

  /* =========================
     STEP 3: IN-TIME RULES
  ========================= */

  if (inS <= TIMES.T_09_16) {
    decision.present = true;
  }

  else if (inS <= TIMES.T_09_30) {
    if (counters.late < LIMITS.LATE) {
      decision.present = true;
      decision.lateUsed = 1;
    } else if (counters.permission < LIMITS.PERMISSION) {
      decision.present = true;
      decision.permissionUsed = 1;
    } else {
      decision.half = true;
      return decision;
    }
  }

  else if (inS <= TIMES.T_11_00) {
    if (counters.permission < LIMITS.PERMISSION) {
      decision.present = true;
      decision.permissionUsed = 1;
    } else {
      decision.half = true;
      return decision;
    }
  }

  else if (inS <= TIMES.T_13_00) {
    decision.half = true;
    return decision;
  }

  else {
    decision.absent = true;
    return decision;
  }

  /* =========================
     STEP 4: SHORT CIRCUIT
  ========================= */

  if (!decision.present || adjustedOutS === null) {
    return decision;
  }

  /* =========================
     STEP 5: OUT-TIME RULES
  ========================= */

  const totalPermissionsUsed =
    counters.permission + decision.permissionUsed;

  // ✅ Full day exit (NO upgrade)
  if (adjustedOutS >= TIMES.T_17_30) {
    return decision;
  }

  // ✅ Early exit window
  if (adjustedOutS >= TIMES.T_15_30) {

    if (totalPermissionsUsed < LIMITS.PERMISSION) {
      decision.permissionUsed += 1;
      return decision;
    }

    decision.present = false;
    decision.half = true;
    return decision;
  }

  // ❌ Very early exit
  decision.present = false;
  decision.half = true;
  return decision;
}

module.exports = {
  evaluateAttendanceDay,
};