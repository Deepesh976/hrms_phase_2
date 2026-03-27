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
     STEP 2: NO CHECKIN
  ========================= */

  if (inS === null) {
    decision.absent = true;
    return decision;
  }

  /* =========================
     STEP 3: IN-TIME RULES
  ========================= */

  // ✅ On-time
  if (inS <= TIMES.T_09_16) {
    decision.present = true;
  }

  /* =========================
     LATE WINDOW
     09:16:01 → 09:30
  ========================= */
  else if (inS <= TIMES.T_09_30) {

    // Late still available
    if (counters.late < LIMITS.LATE) {
      decision.present = true;
      decision.lateUsed = 1;
    }

    // Late exhausted → use permission
    else if (counters.permission < LIMITS.PERMISSION) {
      decision.present = true;
      decision.permissionUsed = 1;
    }

    // Late + permission exhausted
    else {
      decision.half = true;
      return decision;
    }
  }

  /* =========================
     PERMISSION WINDOW
     09:30:01 → 11:00
  ========================= */
  else if (inS <= TIMES.T_11_00) {

    if (counters.permission < LIMITS.PERMISSION) {
      decision.present = true;
      decision.permissionUsed = 1;
    }

    else {
      decision.half = true;
      return decision;
    }
  }

  /* =========================
     HALF DAY ENTRY
     11:00:01 → 13:00
  ========================= */

  else if (inS <= TIMES.T_13_00) {
    decision.half = true;
    return decision;
  }

  /* =========================
     ABSENT
  ========================= */

  else {
    decision.absent = true;
    return decision;
  }

  /* =========================
     STEP 4: SHORT CIRCUIT
  ========================= */

  if (!decision.present || outS === null) {
    return decision;
  }

  /* =========================
     STEP 5: OUT-TIME RULES
  ========================= */

  const totalPermissionsUsed =
    counters.permission + decision.permissionUsed;

  /* =========================
     FULL DAY EXIT
  ========================= */

  if (outS >= TIMES.T_17_30) {
    return decision;
  }

  /* =========================
     EARLY EXIT WINDOW
     15:30 → 17:29
  ========================= */

  if (outS >= TIMES.T_15_30) {

    if (totalPermissionsUsed < LIMITS.PERMISSION) {
      decision.permissionUsed += 1;
      return decision;
    }

    decision.present = false;
    decision.half = true;
    return decision;
  }

  /* =========================
     VERY EARLY EXIT
  ========================= */

  decision.present = false;
  decision.half = true;
  return decision;
}

module.exports = {
  evaluateAttendanceDay,
};