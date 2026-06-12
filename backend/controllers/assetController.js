const AssetAssignment = require('../models/AssetAssignment');
const Employee = require('../models/Employee');
const User = require('../models/User');

/* ======================================================
   👤 GET MY ASSETS
   EMPLOYEE | HOD | DIRECTOR
====================================================== */
const getMyAssets = async (req, res) => {
  try {
    const { role, empId, name, id: userId } = req.user;

    /* =========================
       👤 EMPLOYEE → own assets
    ========================= */
    if (role === 'employee') {
      if (!empId) {
        return res.status(403).json({
          success: false,
          message: 'Employee account not linked',
        });
      }

      const assets = await AssetAssignment.find({ empId })
        .sort({ createdAt: -1 });

      return res.json({ success: true, data: assets });
    }

    /* =========================
       👔 HOD → own + reporting employees
    ========================= */
    if (role === 'hod') {
      const employees = await Employee.find({
        reportingToHOD: userId,
        empStatus: 'W',
      }).select('empId');

      const empIds = employees.map(e => e.empId);

      const assets = await AssetAssignment.find({
        $or: [
          { assigneeName: name },      // HOD’s own assets
          { empId: { $in: empIds } },  // employees under HOD
        ],
      }).sort({ createdAt: -1 });

      return res.json({ success: true, data: assets });
    }

    /* =========================
       🎯 DIRECTOR → own + HODs + all employees (direct + under HODs)
    ========================= */
    if (role === 'director') {
      // 1️⃣ Employees reporting DIRECTLY to Director
      const directEmployees = await Employee.find({
        reportingToDirector: userId,
        empStatus: 'W',
      }).select('empId');

      const directEmpIds = directEmployees.map(e => e.empId);

      // 2️⃣ HODs reporting to Director
      // ✅ HOD Users have 'reportsTo' field (NOT reportingToDirector)
      const hodUsers = await User.find({
        role: 'hod',
        reportsTo: userId,  // ✅ FIXED: Use reportsTo instead of reportingToDirector
      }).select('name _id');

      const hodUserIds = hodUsers.map(h => h._id);
      const hodNames = hodUsers.map(h => h.name);

      // 3️⃣ ✅ Employees reporting to those HODs (2nd level)
      const hodEmployees = await Employee.find({
        reportingToHOD: { $in: hodUserIds },
        empStatus: 'W',
      }).select('empId');

      const hodEmpIds = hodEmployees.map(e => e.empId);

      // 4️⃣ Combine all employee IDs
      const allEmployeeEmpIds = [...directEmpIds, ...hodEmpIds];

      const assets = await AssetAssignment.find({
        $or: [
          { assigneeName: name },                    // Director's own assets
          { assigneeName: { $in: hodNames } },       // HOD assets
          { empId: { $in: allEmployeeEmpIds } },     // All employee assets (direct + HOD's)
        ],
      }).sort({ createdAt: -1 });

      return res.json({ success: true, data: assets });
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied',
    });
  } catch (err) {
    console.error('❌ getMyAssets error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/* ======================================================
   👔 HR / ADMIN → VIEW ALL ASSETS
====================================================== */
const listAll = async (req, res) => {
  try {
    const assets = await AssetAssignment.find({})
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: assets,
    });
  } catch (err) {
    console.error('❌ listAll error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/* ======================================================
   👔 HR / ADMIN → CREATE ASSET
====================================================== */
const create = async (req, res) => {
  try {
    const {
      empId,
      empName,
      department,
      itemName,
      serialNumber,
      issuedDate,
      condition,
      notes,
      status,
    } = req.body;

    const { role, unit } = req.user;

    if (!empName || !itemName || !issuedDate) {
      return res.status(400).json({
        success: false,
        message: 'empName, itemName and issuedDate are required',
      });
    }

    let employeeRef = null;
    let finalEmpId = null;
    let finalDepartment = department || '';
    let assigneeRole = null;

    const trimmedEmpName = empName.trim();

    /* =========================
       ASSIGN TO EMPLOYEE
    ========================= */
    if (empId && empId.trim()) {

      const employee = await Employee.findOne({ empId: empId.trim() });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: `Employee with ID '${empId}' not found`,
        });
      }

      // 🔒 Unit HR restriction
      if (role === 'unit_hr' && employee.empUnit !== unit) {
        return res.status(403).json({
          success: false,
          message: 'Unit HR can only assign assets to employees in their unit',
        });
      }

      employeeRef = employee._id;
      finalEmpId = employee.empId;
      finalDepartment = employee.department;
      assigneeRole = 'employee';
    }

    /* =========================
       ASSIGN TO HOD / DIRECTOR
    ========================= */
    else {

      const user = await User.findOne({
        name: trimmedEmpName,
        role: { $in: ['hod', 'director'] },
        isActive: true,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User '${trimmedEmpName}' not found`,
        });
      }

      // 🔒 Unit HR restrictions
      if (role === 'unit_hr') {

        if (user.role === 'director') {
          return res.status(403).json({
            success: false,
            message: 'Unit HR cannot assign assets to Director',
          });
        }

        if (user.unit !== unit) {
          return res.status(403).json({
            success: false,
            message: 'Unit HR can only assign assets to HOD in their unit',
          });
        }
      }

      assigneeRole = user.role;

      if (!finalDepartment) {
        finalDepartment =
          user.role === 'hod'
            ? `HOD - ${user.department || 'General'}`
            : 'Director';
      }
    }

    const asset = await AssetAssignment.create({
      employee: employeeRef,
      empId: finalEmpId,
      assigneeName: trimmedEmpName,
      assigneeRole,
      department: finalDepartment,
      itemName,
      serialNumber,
      issuedDate,
      condition,
      notes,
      status: status || 'issued',
    });

    return res.status(201).json({
      success: true,
      data: asset,
    });

  } catch (err) {
    console.error('create asset error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
/* ======================================================
   👔 HR / ADMIN → UPDATE ASSET
====================================================== */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // 🔒 Lock assignment identity
    delete updateData.employee;
    delete updateData.empId;
    delete updateData.assigneeName;
    delete updateData.department;

    const asset = await AssetAssignment.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    return res.json({
      success: true,
      data: asset,
    });
  } catch (err) {
    console.error('❌ update asset error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/* ======================================================
   👔 HR / ADMIN → DELETE ASSET
====================================================== */
const remove = async (req, res) => {
  try {
    const { role, unit } = req.user;

    const asset = await AssetAssignment.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    // Unit HR can only delete assets from their unit
if (role === 'unit_hr') {
  const employee = await Employee.findOne({ empId: asset.empId });

  if (employee && employee.empUnit !== unit) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete assets from your unit',
    });
  }
}

    await asset.deleteOne();

    return res.json({
      success: true,
      message: 'Asset deleted successfully',
    });

  } catch (err) {
    console.error('remove asset error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/* ======================================================
   🔥 ROLE-BASED ASSET VISIBILITY
====================================================== */
const getAssetsByRole = getMyAssets;

module.exports = {
  getMyAssets,
  getAssetsByRole,
  listAll,
  create,
  update,
  remove,
};
