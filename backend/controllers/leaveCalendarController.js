const asyncHandler = require('../middleware/asyncHandler');
const LeaveCalendar = require('../models/LeaveCalendar');
const Activity = require('../models/Activity');
const { regenerateMonthlySummaryForEmployee } = require('../services/activity/monthlySummaryGenerator');

const {
  normalizeDate,
  recalculateActivityForDate,
  rollbackHolidayForDate,
  recalculateAttendanceForDate
} = require('../services/holidayImpactService');

/* =========================================================
   🔥 COMMON HELPER
========================================================= */
const getEmployeesForDate = async (dateObj) => {
  const start = new Date(dateObj);
  start.setHours(0, 0, 0, 0);

  const end = new Date(dateObj);
  end.setHours(23, 59, 59, 999);

  const activities = await Activity.find({
    date: { $gte: start, $lte: end }
  }).select('empId empUnit');

  const map = new Map();
  for (const act of activities) {
    map.set(`${act.empId}_${act.empUnit}`, act);
  }

  return [...map.values()];
};

/* =========================================================
   🔥 DATE RANGE HELPER (NEW FIX)
========================================================= */
const getDateRange = (dateObj) => {
  const start = new Date(dateObj);
  start.setHours(0, 0, 0, 0);

  const end = new Date(dateObj);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/* =========================================================
   GET HOLIDAYS
========================================================= */
const getHolidays = asyncHandler(async (req, res) => {
  const { year, month, type } = req.query;

  const filter = {};
  if (year) filter.year = parseInt(year, 10);
  if (month) filter.month = parseInt(month, 10);
  if (type) filter.type = type;

  const holidays = await LeaveCalendar.find(filter).sort({ date: 1 });

  const data = holidays.map(h => ({
    ...h.toObject(),
    isHoliday: h.isWorkingDay === false,
    isWorkingDay: false
  }));

  res.status(200).json({
    success: true,
    count: data.length,
    data
  });
});

/* =========================================================
   ADD HOLIDAY (FIXED)
========================================================= */
const addHoliday = asyncHandler(async (req, res) => {
  const { date, title, description, type, isOptional } = req.body;

  if (!date || !title) {
    return res.status(400).json({
      success: false,
      message: 'Date and title are required'
    });
  }

  const dateObj = normalizeDate(date);
  const { start, end } = getDateRange(dateObj);

  // ✅ FIXED DUPLICATE CHECK
  const existing = await LeaveCalendar.findOne({
    date: { $gte: start, $lte: end }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Holiday already exists for ${dateObj.toDateString()}`
    });
  }

  const holiday = await LeaveCalendar.create({
    date: dateObj,
    title,
    description: description || '',
    type: type || 'public_holiday',
    isWorkingDay: false,
    isOptional: Boolean(isOptional),
    createdBy: req.user?.email || 'admin'
  });

  await recalculateActivityForDate(dateObj, title);
  await recalculateAttendanceForDate(dateObj);

  const employees = await getEmployeesForDate(dateObj);

  for (const emp of employees) {
    await regenerateMonthlySummaryForEmployee(emp.empId, emp.empUnit);
  }

  res.status(201).json({
    success: true,
    message: 'Holiday added successfully',
    data: { ...holiday.toObject(), isHoliday: true }
  });
});

/* =========================================================
   UPDATE HOLIDAY (FIXED)
========================================================= */
const updateHoliday = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, type, ...otherFields } = req.body;

  const holiday = await LeaveCalendar.findById(id);
  if (!holiday) {
    return res.status(404).json({
      success: false,
      message: 'Holiday not found'
    });
  }

  const oldDate = normalizeDate(holiday.date);

  if (date) {
    const newDate = normalizeDate(date);
    const { start, end } = getDateRange(newDate);

    // ✅ FIXED DUPLICATE CHECK
    const duplicate = await LeaveCalendar.findOne({
      _id: { $ne: id },
      date: { $gte: start, $lte: end }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Holiday already exists for ${newDate.toDateString()}`
      });
    }

    holiday.date = newDate;
  }

  if (type) holiday.type = type;

  Object.assign(holiday, otherFields);
  holiday.isWorkingDay = false;

  await holiday.save();

  const updatedDate = normalizeDate(holiday.date);

  /* OLD DATE */
  await rollbackHolidayForDate(oldDate);
  await recalculateAttendanceForDate(oldDate);

  const oldEmployees = await getEmployeesForDate(oldDate);
  for (const emp of oldEmployees) {
    await regenerateMonthlySummaryForEmployee(emp.empId, emp.empUnit);
  }

  /* NEW DATE */
  await recalculateActivityForDate(updatedDate, holiday.title);
  await recalculateAttendanceForDate(updatedDate);

  const newEmployees = await getEmployeesForDate(updatedDate);
  for (const emp of newEmployees) {
    await regenerateMonthlySummaryForEmployee(emp.empId, emp.empUnit);
  }

  res.status(200).json({
    success: true,
    message: 'Holiday updated successfully',
    data: { ...holiday.toObject(), isHoliday: true }
  });
});

/* =========================================================
   DELETE HOLIDAY
========================================================= */
const deleteHoliday = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const holiday = await LeaveCalendar.findByIdAndDelete(id);
  if (!holiday) {
    return res.status(404).json({
      success: false,
      message: 'Holiday not found'
    });
  }

  const deletedDate = normalizeDate(holiday.date);

  await rollbackHolidayForDate(deletedDate);
  await recalculateAttendanceForDate(deletedDate);

  const employees = await getEmployeesForDate(deletedDate);
  for (const emp of employees) {
    await regenerateMonthlySummaryForEmployee(emp.empId, emp.empUnit);
  }

  res.status(200).json({
    success: true,
    message: 'Holiday deleted and attendance restored'
  });
});

/* =========================================================
   EXPORTS
========================================================= */
module.exports = {
  getHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday
};