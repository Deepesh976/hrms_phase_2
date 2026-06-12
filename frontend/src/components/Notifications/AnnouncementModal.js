import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios';
import './notifications.css';

const AnnouncementModal = ({ isOpen, onClose, onCreated }) => {

  const role = localStorage.getItem('role') || 'employee';
  const userUnit = localStorage.getItem('unit');

  const isHODorDirector = ['hod', 'director'].includes(role);
  const isHRMSorSuperAdmin = ['hrms_handler', 'super_admin', 'admin', 'superadmin'].includes(role);
  const isUnitHR = role === 'unit_hr';

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const [audience, setAudience] = useState(
    role === "unit_hr" ? "department" : "all"
  );

  const [department, setDepartment] = useState('');

  const [employees, setEmployees] = useState([]);
  const [allocatedEmployees, setAllocatedEmployees] = useState([]);

  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  const [loading, setLoading] = useState(false);

  /*
  -----------------------------
  RESET MODAL
  -----------------------------
  */

  useEffect(() => {
    if (!isOpen) return;

    setTitle('');
    setMessage('');
    setAudience(
  isHODorDirector ? "team" :
  isUnitHR ? "department" :
  "all"
);
    setDepartment('');
    setSelectedEmployeeIds([]);
  }, [isOpen, isHODorDirector]);

  /*
  -----------------------------
  LOAD EMPLOYEES BASED ON ROLE
  -----------------------------
  */

  useEffect(() => {

    if (!isOpen) return;

    const loadEmployees = async () => {
      try {

        const res = await axios.get('/employees');
        const allEmployees = Array.isArray(res.data) ? res.data : [];

        // UNIT HR → only employees in same unit
        if (isUnitHR) {

const unitEmployees = allEmployees.filter(
  emp =>
    emp.empStatus === 'W' &&
    (!userUnit || emp.empUnit === userUnit)
);

          setEmployees(unitEmployees);
          setAllocatedEmployees(unitEmployees);
          setFilteredEmployees(unitEmployees);
        }

        // HOD / DIRECTOR
        else if (isHODorDirector) {

          const workingEmployees = allEmployees.filter(
            emp => emp.empStatus === 'W'
          );

          setEmployees(workingEmployees);
          setAllocatedEmployees(workingEmployees);
          setFilteredEmployees(workingEmployees);
        }

        // MAIN HR / SUPER ADMIN
        else {

          const workingEmployees = allEmployees.filter(
            emp => emp.empStatus === 'W'
          );

          setEmployees(workingEmployees);
          setFilteredEmployees(workingEmployees);
        }

      } catch (err) {

        console.error('Employee load failed', err);
        setEmployees([]);
        setAllocatedEmployees([]);

      }
    };

    loadEmployees();

  }, [isOpen, isHODorDirector, isUnitHR, userUnit]);

  /*
  -----------------------------
  DEPARTMENT LIST
  -----------------------------
  */

  const departments = useMemo(() => {

    const set = new Set();

    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });

    return Array.from(set).sort();

  }, [employees]);

  /*
  -----------------------------
  FILTER EMPLOYEES BY DEPT
  -----------------------------
  */

  useEffect(() => {

    let baseList = isHODorDirector ? allocatedEmployees : employees;

    if (!department) {
      setFilteredEmployees(baseList);
      return;
    }

    const filtered = baseList.filter(
      emp => emp.department === department
    );

    setFilteredEmployees(filtered);

  }, [department, employees, allocatedEmployees, isHODorDirector]);

  const searchedEmployees = useMemo(() => {

  if (!searchEmployee) return filteredEmployees;

  return filteredEmployees.filter(emp =>
    emp.empName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    emp.empId.toString().includes(searchEmployee)
  );

}, [searchEmployee, filteredEmployees]);

  /*
  -----------------------------
  SUBMIT
  -----------------------------
  */

  const submit = async (e) => {

    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {

      const payload = {
        title,
        message,
        audience,
        targetDepartment: audience === 'department' ? department : '',
        targetEmployeeIds: audience === 'individual' ? selectedEmployeeIds : [],
      };

      await axios.post('/notifications', payload);

      if (typeof onCreated === 'function') onCreated();

      onClose();

    } catch (err) {

      console.error('Failed to send notification:', err);

      alert(err.response?.data?.message || 'Failed to send notification.');

    } finally {

      setLoading(false);

    }
  };

  /*
  -----------------------------
  TOGGLE EMPLOYEE
  -----------------------------
  */

  const toggleEmployeeSelection = (empId) => {

    setSelectedEmployeeIds(prev => {

      if (prev.includes(empId)) {
        return prev.filter(id => id !== empId);
      }

      return [...prev, empId];

    });

  };

  if (!isOpen) return null;

  const toggleSelectAll = () => {

  if (selectAll) {
    setSelectedEmployeeIds([]);
    setSelectAll(false);
    return;
  }

  const allIds = searchedEmployees.map(emp => emp._id);

  setSelectedEmployeeIds(allIds);
  setSelectAll(true);

};

  /*
  -----------------------------
  UI
  -----------------------------
  */

  return (
    <div className="announcement-backdrop">

      <div className="announcement-modal">

        <div className="announcement-modal-header">

          <div className="announcement-modal-title">
            Add Announcement
          </div>

          <button
            className="btn btn-muted"
            onClick={onClose}
          >
            Close
          </button>

        </div>

        <div className="announcement-body">

          <form className="announcement-form" onSubmit={submit}>

            <div className="form-row">
              <label>Title</label>
              <input
                className="input-text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <label>Message</label>
              <textarea
                className="input-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <label>Audience</label>

              <select
                className="input-select"
                value={audience}
onChange={(e) => {
  setAudience(e.target.value);
  setSelectedEmployeeIds([]);
  setDepartment('');
}}
              >

                {isHRMSorSuperAdmin && <option value="all">All Employees</option>}

                {(isHRMSorSuperAdmin || isUnitHR) && (
  <option value="department">Specific Department</option>
)}

                {isHODorDirector && <option value="team">My Team</option>}

                <option value="individual">Specific Employee(s)</option>

              </select>
            </div>

            {/* Department selector */}

            {(audience === 'individual' || audience === 'department') && (

              <div className="form-row">

                <label>Department</label>

                <select
                  className="input-select"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setSelectedEmployeeIds([]);
                  }}
                >

                  <option value="">All Departments</option>

                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}

                </select>

              </div>

            )}

            {/* Employee list */}

            {audience === 'individual' && (

              <div className="form-row">

                <label>Select Employees</label>
                <div style={{ marginBottom: "8px" }}>
  <label>
    <input
      type="checkbox"
      checked={selectAll}
      onChange={toggleSelectAll}
      style={{ marginRight: "6px" }}
    />
    Select All Employees
  </label>
</div>

<input
  type="text"
  placeholder="Search employee name or ID..."
  value={searchEmployee}
  onChange={(e) => setSearchEmployee(e.target.value)}
  className="input-text"
  style={{ marginBottom: "10px" }}
/>

<div
  style={{
    maxHeight: "180px",
    overflowY: "auto",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "8px",
    background: "#fafafa"
  }}
>

{searchedEmployees.length === 0 && (
  <p className="no-emp">No employees found</p>
)}

{searchedEmployees.map((e) => (

<div
  key={e._id}
  className="employee-item"
>

<input
  type="checkbox"
  checked={selectedEmployeeIds.includes(e._id)}
  onChange={() => toggleEmployeeSelection(e._id)}
  style={{ marginRight: "8px" }}
/>

<span
  style={{ cursor: "pointer" }}
  onClick={() => toggleEmployeeSelection(e._id)}
>
  {e.empName}
  <small>({e.empId})</small>
</span>

</div>

))}

</div>

{selectedEmployeeIds.length > 0 && (
  <div style={{ marginTop: "10px" }}>
    
<div
  style={{
    marginTop: "8px",
    background: "#eef3ff",
    padding: "6px 10px",
    borderRadius: "6px",
    fontWeight: "600",
    color: "#2a5298",
    display: "inline-block"
  }}
>
{selectedEmployeeIds.length} employee(s) selected
</div>

{/* <button
  type="button"
  style={{
    marginTop: "8px",
    padding: "6px 14px",
    borderRadius: "6px",
    border: "none",
    background: "#2a5298",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer"
  }}
  onClick={() => {
    console.log("Selected Employees:", selectedEmployeeIds);
  }}
>
Confirm Selection
</button> */}

  </div>
)}

              </div>

            )}

            <div className="form-actions">

              <button
                type="button"
                className="btn btn-muted"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish'}
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
};

export default AnnouncementModal;