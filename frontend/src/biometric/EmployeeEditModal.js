import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave, FaUser, FaBuilding, FaIdCard, FaUniversity, FaMoneyBillWave, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from '../api/axios';
import './EmployeeEditModal.css';

const TABS = [
  { id: 'personal', label: 'Personal & Contact', icon: <FaUser /> },
  { id: 'employment', label: 'Employment & Work', icon: <FaBuilding /> },
  { id: 'identity', label: 'Identity & Identification', icon: <FaIdCard /> },
  { id: 'financial', label: 'Financial & Banking', icon: <FaUniversity /> }
];

const EmployeeEditModal = ({ isOpen, onClose, employeeId, onSave }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState([]);

  const REQUIRED_FIELDS = [
    'empStatus', 'empUnit', 'empId', 'empName', 'dob',
    'bloodGroup', 'doj', 'gender', 'contactNo', 'department',
    'designation', 'panNo', 'aadharNo', 'permanentAddress',
    'bankAccount', 'bankName', 'ifsc', 'bankBranch',
    'fatherName', 'motherName', 'hiredCtc'
  ];

  useEffect(() => {
    if (isOpen) {
      if (employeeId) {
        fetchEmployee(employeeId);
      } else {
        setFormData({});
        setErrors([]);
        setActiveTab('personal');
      }
    }
  }, [isOpen, employeeId]);

  const fetchEmployee = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`/employees/${id}`);
      const data = res.data || {};

      // Format dates for HTML date input (YYYY-MM-DD)
      const dateFields = ['dob', 'doj', 'exitDate'];
      dateFields.forEach(field => {
        if (data[field]) {
          data[field] = new Date(data[field]).toISOString().split('T')[0];
        }
      });

      setFormData(data);
      setErrors([]);
    } catch (err) {
      console.error('Fetch employee error:', err);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors.includes(name) && value) {
      setErrors(prev => prev.filter(err => err !== name));
    }
  };

  const validate = () => {
    const missing = REQUIRED_FIELDS.filter(field => !formData[field]);
    setErrors(missing);
    return missing.length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validate()) {
      toast.error('Please fill all required fields');
      // Optionally switch to the first tab with an error
      return;
    }

    try {
      setSaving(true);
      const dataToSend = {
        ...formData,
        settlementAmount: Number(formData.settlementAmount || 0),
        hiredCtc: Number(formData.hiredCtc || 0),
        joiningCtc: Number(formData.joiningCtc || 0),
        ctc2025: Number(formData.ctc2025 || 0),
        yearsWorked: Number(formData.yearsWorked || 0),
      };

      if (employeeId) {
        await axios.put(`/employees/${employeeId}`, dataToSend);
        toast.success('Employee updated successfully');
      } else {
        await axios.post('/employees', dataToSend);
        toast.success('Employee added successfully');
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Save employee error:', err);
      toast.error(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (label, name, type = 'text', options = null) => {
    const isRequired = REQUIRED_FIELDS.includes(name);
    const hasError = errors.includes(name);

    if (options) {
      return (
        <div className={`form-group ${hasError ? 'has-error' : ''}`}>
          <label htmlFor={name}>
            {label} {isRequired && <span className="required">*</span>}
          </label>
          <select
            id={name}
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
            className="form-control"
          >
            <option value="">Select {label}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {hasError && <span className="error-text">This field is required</span>}
        </div>
      );
    }

    return (
      <div className={`form-group ${hasError ? 'has-error' : ''}`}>
        <label htmlFor={name}>
          {label} {isRequired && <span className="required">*</span>}
        </label>
        <input
          type={type}
          id={name}
          name={name}
          value={formData[name] || ''}
          onChange={handleChange}
          placeholder={`Enter ${label.toLowerCase()}`}
          className="form-control"
        />
        {hasError && <span className="error-text">This field is required</span>}
      </div>
    );
  };

  const nextTab = () => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    if (currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id);
    }
  };

  const prevTab = () => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-container employee-modal"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="header-content">
              <div className="header-icon">
                {employeeId ? <FaIdCard /> : <FaUser />}
              </div>
              <div>
                <h2 className="modal-title">
                  {employeeId ? 'Edit Employee Details' : 'Add New Employee'}
                </h2>
                <p className="modal-subtitle">
                  {employeeId ? `Modifying profile for ${formData.empName || 'Employee'}` : 'Fill in the details to create a new employee profile'}
                </p>
              </div>
            </div>
            <button className="close-button" onClick={onClose} title="Close">
              <FaTimes />
            </button>
          </div>

          {/* Tabs */}
          <div className="modal-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="modal-body">
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Fetching employee data...</p>
              </div>
            ) : (
              <div className="tab-content">
                {activeTab === 'personal' && (
                  <div className="form-grid">
                    {renderInput('Employee Name', 'empName')}
                    {renderInput('Employee ID', 'empId')}
                    {renderInput('Date of Birth', 'dob', 'date')}
                    {renderInput('Gender', 'gender', 'select', [
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other' }
                    ])}
                    {renderInput('Blood Group', 'bloodGroup', 'select', [
                      { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
                      { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
                      { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
                      { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }
                    ])}
                    {renderInput('Contact No', 'contactNo', 'tel')}
                    {renderInput('Personal Email', 'personalEmail', 'email')}
                    {renderInput('Official Email', 'officialEmail', 'email')}
                    {renderInput('Emergency Contact', 'emergencyContact')}
                    {renderInput("Father's Name", 'fatherName')}
                    {renderInput("Mother's Name", 'motherName')}
                    {renderInput('Spouse', 'spouse')}
                    <div className="full-width">
                      {renderInput('Permanent Address', 'permanentAddress')}
                    </div>
                    <div className="full-width">
                      {renderInput('Postal Address', 'postalAddress')}
                    </div>
                  </div>
                )}

                {activeTab === 'employment' && (
                  <div className="form-grid">
                    {renderInput('Employee Unit', 'empUnit')}
                    {renderInput('Status (W/L)', 'empStatus', 'select', [
                      { value: 'W', label: 'W - Working' },
                      { value: 'L', label: 'L - Left' }
                    ])}
                    {renderInput('Department', 'department')}
                    {renderInput('Designation', 'designation')}
                    {renderInput('Employment Type', 'employment')}
                    {renderInput('Date of Joining', 'doj', 'date')}
                    {renderInput('Exit Date', 'exitDate', 'date')}
                    {renderInput('Work Experience', 'experience')}
                    {renderInput('Qualification', 'qualification')}
                    {renderInput('Total Years Worked', 'yearsWorked', 'number')}
                    <div className="full-width">
                      {renderInput('Remarks', 'remarks')}
                    </div>
                  </div>
                )}

                {activeTab === 'identity' && (
                  <div className="form-grid">
                    {renderInput('PAN No', 'panNo')}
                    {renderInput('Aadhar Card No', 'aadharNo')}
                    {renderInput('PF No', 'pfNo')}
                    {renderInput('UAN No', 'uanNo')}
                    {renderInput('ESI No', 'esiNo')}
                    {renderInput('Nominee Name', 'nomineeName')}
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="form-grid">
                    {renderInput('Bank Name', 'bankName')}
                    {renderInput('Bank Account No', 'bankAccount')}
                    {renderInput('IFSC Code', 'ifsc')}
                    {renderInput('Bank Branch Name', 'bankBranch')}
                    {renderInput('Hired CTC', 'hiredCtc', 'number')}
                    {renderInput('CTC at Joining', 'joiningCtc', 'number')}
                    {renderInput('CTC 2025', 'ctc2025', 'number')}
                    {renderInput('Settlement Amount', 'settlementAmount', 'number')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <div className="footer-left">
              <button
                className="btn-modal btn-text"
                onClick={prevTab}
                disabled={activeTab === 'personal'}
              >
                <FaChevronLeft /> Previous
              </button>
            </div>
            <div className="footer-right">
              {activeTab !== 'financial' ? (
                <button className="btn-modal btn-secondary-modal" onClick={nextTab}>
                  Next <FaChevronRight />
                </button>
              ) : (
                <button
                  className="btn-modal btn-primary-modal"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <div className="btn-spinner"></div>
                  ) : (
                    <><FaSave /> {employeeId ? 'Update Employee' : 'Create Employee'}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmployeeEditModal;
