const express = require('express');
const router = express.Router();

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const {
  getAssetsByRole,
  listAll,
  create,
  update,
  remove,
} = require('../controllers/assetController');

const Employee = require('../models/Employee');
const User = require('../models/User');

/* ======================================================
   SEARCH : EMPLOYEE / HOD / DIRECTOR
====================================================== */
router.get(
  '/search',
  protect,
  authorizeRoles('super_admin', 'superadmin', 'admin', 'unit_hr', 'hrms_handler'),
  async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const { role, unit } = req.user;

      if (!q) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }

      /* =========================
         EMPLOYEE SEARCH
      ========================= */

      let employeeFilter = {
        empStatus: 'W',
        $or: [
          { empId: { $regex: q, $options: 'i' } },
          { empName: { $regex: q, $options: 'i' } },
        ],
      };

      // Unit HR can only see employees of their unit
      if (role === 'unit_hr') {
        employeeFilter.empUnit = unit;
      }

      const employees = await Employee.find(employeeFilter)
        .limit(10)
        .select('empId empName department unit');

      const employeeResults = employees.map((e) => ({
        empId: e.empId,
        empName: e.empName,
        department: e.department,
        role: 'employee',
      }));


      /* =========================
         HOD / DIRECTOR SEARCH
      ========================= */

      let userFilter = {
        role: { $in: ['hod', 'director'] },
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { username: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ],
      };

      // Unit HR can only see HOD of their unit (not director)
      if (role === 'unit_hr') {
        userFilter = {
          role: 'hod',
          empUnit: unit,
          isActive: true,
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        };
      }

      const users = await User.find(userFilter)
        .limit(10)
        .select('name role department unit');

      const userResults = users.map((u) => ({
        empId: null,
        empName: u.name,
        department:
          u.role === 'hod'
            ? `HOD - ${u.department || 'General'}`
            : 'Director',
        role: u.role,
      }));


      return res.status(200).json({
        success: true,
        data: [...employeeResults, ...userResults],
      });

    } catch (err) {
      console.error('Asset search error:', err);
      return res.status(500).json({
        success: false,
        message: 'Search failed',
      });
    }
  }
);


/* ======================================================
   ROLE BASED ASSET VIEW
====================================================== */

router.get(
  '/my',
  protect,
  authorizeRoles('employee', 'hod', 'director'),
  getAssetsByRole
);


/* ======================================================
   HR / ADMIN ROUTES
====================================================== */

router.get(
  '/',
  protect,
  authorizeRoles('super_admin', 'superadmin', 'unit_hr', 'admin', 'hrms_handler'),
  listAll
);

router.post(
  '/',
  protect,
  authorizeRoles('super_admin', 'superadmin', 'admin', 'hrms_handler', 'unit_hr'),
  create
);

router.put(
  '/:id',
  protect,
  authorizeRoles('super_admin', 'superadmin', 'admin', 'hrms_handler'),
  update
);

router.delete(
  '/:id',
  protect,
  authorizeRoles('super_admin', 'superadmin', 'unit_hr', 'admin', 'hrms_handler'),
  remove
);

module.exports = router;