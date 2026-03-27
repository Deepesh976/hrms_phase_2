import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import axios from '../api/axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const styles = {
  container: {
    maxWidth: 1200,
    margin: '2rem auto',
    padding: '4rem',
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 0 15px rgba(0,0,0,0.1)',
    fontFamily: 'Segoe UI, sans-serif',
    boxSizing: 'border-box',
    overflowX: 'hidden'
  },
  // 🔹 New header row to align back button + title
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem'
  },
  heading: {
    fontSize: '1.8rem',
    fontWeight: 600,
    textAlign: 'center',
    flex: 1,
    margin: 0
  },
  backBtn: {
    backgroundColor: '#64748b',
    color: '#fff',
    padding: '0.5rem 1.25rem',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: '2.5rem 0 1.25rem',
    color: '#1e293b',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '0.5rem'
  },
  formGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.25rem',
    boxSizing: 'border-box'
  },
  fieldWrapper: {
    position: 'relative',
    flex: '1 1 300px',
    minWidth: '280px',
    boxSizing: 'border-box'
  },
  label: {
    position: 'absolute',
    top: '-10px',
    left: '12px',
    background: '#fff',
    padding: '0 8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#64748b',
    zIndex: 1
  },
  input: {
    width: '100%',
    padding: '0.8rem 2.5rem 0.8rem 0.8rem',
    borderRadius: 10,
    border: '2px solid #e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    background: '#f8fafc'
  },
  icon: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    fontSize: '1.1rem',
    color: '#94a3b8',
    pointerEvents: 'none'
  },
  greenBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    padding: '0.75rem 2rem',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    marginTop: '2.5rem',
    fontWeight: 600,
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.6rem',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
    transition: 'all 0.2s ease'
  },
  grayBtn: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '0.75rem 2rem',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    cursor: 'pointer',
    marginLeft: '1rem',
    marginTop: '2.5rem',
    fontWeight: 600,
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.6rem',
    transition: 'all 0.2s ease'
  }
};

const fieldGroups = {
  'Personal & Employment Details': {
    status_wl: 'Status W/L',
    emp_unit: 'EmpUnit',
    emp_id: 'EmpID',
    emp_name: 'EmpName',
    dob: 'Date of Birth',
    blood_group: 'Blood Group',
    doj: 'Date of Joining',
    gender: 'Gender',
    qualification: 'Academic Qualification',
    experience: 'Work Experience',
    personal_email: 'Personal Email ID',
    contact_no: 'Contact No',
    department: 'Department',
    designation: 'Designation',
    official_email: 'Official Email ID',
    pan_no: 'PAN No',
    aadhar_no: 'Aadhar Card No',
    pf_no: 'PF No',
    uan_no: 'UAN No',
    esi_no: 'ESI No',
    postal_address: 'Postal Address',
    permanent_address: 'Permanent Address',
    bank_account: 'Bank Account Number',
    bank_name: 'Bank Name',
    ifsc: 'IFSC Code',
    bank_branch: 'Bank Branch Name',
    father_name: "Father's Name",
    mother_name: "Mother's Name",
    spouse: 'Spouse',
    nominee_name: 'Nominee Name',
    emergency_contact: 'Emergency Contact no.',
    exit_date: 'Exit Date',
    settlement_amount: 'Account Settlement (Amount)',
    remarks: 'Remarks',
    hired_ctc: 'Hired CTC',
    joining_ctc: 'CTC in Year:at the time of Joining',
    ctc_2025: 'CTC in Year:2025',
    years_worked: 'Total Yrs Worked'
  }
};

const dateFields = ['dob', 'doj', 'exit_date'];

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genderOptions = ['Male', 'Female', 'Other'];

// 🔹 Required fields (compulsory)
const requiredFields = [
  'status_wl',
  'emp_unit',
  'emp_id',
  'emp_name',
  'dob',
  'blood_group',
  'doj',
  'gender',
  'contact_no',
  'department',
  'designation',
  'pan_no',
  'aadhar_no',
  'permanent_address',
  'bank_account',
  'bank_name',
  'ifsc',
  'bank_branch',
  'father_name',
  'mother_name',
  'hired_ctc'
];

const AddEmployeeInfo = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(
    Object.values(fieldGroups).reduce((acc, group) => {
      Object.keys(group).forEach((key) => (acc[key] = ''));
      return acc;
    }, {})
  );

  const [missingFields, setMissingFields] = useState([]);

  const dateRefs = {
    dob: useRef(null),
    doj: useRef(null),
    exit_date: useRef(null)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missing = requiredFields.filter((key) => {
      const value = form[key];
      return value === '' || value === null || value === undefined;
    });

    if (missing.length > 0) {
      setMissingFields(missing);
      toast.error('Please fill all required fields.');
      return;
    }

    setMissingFields([]);

    try {
      const mappedData = {
  empStatus: form.status_wl,
  empUnit: form.emp_unit,
  empId: form.emp_id,
  empName: form.emp_name,
  dob: form.dob,
  bloodGroup: form.blood_group,
  doj: form.doj,
  gender: form.gender,
  qualification: form.qualification,
  experience: form.experience,
  personalEmail: form.personal_email,
  contactNo: form.contact_no,
  department: form.department,
  designation: form.designation,
  officialEmail: form.official_email,
  panNo: form.pan_no,
  aadharNo: form.aadhar_no,
  pfNo: form.pf_no,
  uanNo: form.uan_no,
  esiNo: form.esi_no,
  postalAddress: form.postal_address,
  permanentAddress: form.permanent_address,
  bankAccount: form.bank_account,
  bankName: form.bank_name,
  ifsc: form.ifsc,
  bankBranch: form.bank_branch,
  fatherName: form.father_name,
  motherName: form.mother_name,
  spouse: form.spouse,
  nomineeName: form.nominee_name,
  emergencyContact: form.emergency_contact,
  exitDate: form.exit_date,
  settlementAmount: Number(form.settlement_amount || 0),
  hiredCtc: Number(form.hired_ctc || 0),
  joiningCtc: Number(form.joining_ctc || 0),
  ctc2025: Number(form.ctc_2025 || 0),
  yearsWorked: Number(form.years_worked || 0),
};

await axios.post('/employees', mappedData);
      toast.success('Employee Added!');
      setTimeout(() => navigate('/employee-info'), 1000);
    } catch (err) {
      console.error('Error submitting:', err);
      const message = err.response?.data?.message || 'Unknown error occurred';
      toast.error(`Failed to save employee: ${message}`);
    }
  };

  return (
    <div style={styles.container}>
      <ToastContainer position="top-center" />

      {/* 🔹 Header row with Back button on left and title centered */}
      <div style={styles.headerRow}>
        <button
          type="button"
          onClick={() => navigate('/employee-info')}
          style={styles.backBtn}
        >
          <FaArrowLeft /> Back
        </button>

        <h2 style={styles.heading}>Add Employee Info</h2>

        {/* Spacer to balance flex so heading stays centered */}
        <div style={{ width: '90px' }} />
      </div>

      <form onSubmit={handleSubmit}>
        {Object.entries(fieldGroups).map(([section, fields]) => (
          <div key={section}>
            <div style={styles.sectionTitle}>{section}</div>
            <div style={styles.formGroup}>
              {Object.entries(fields).map(([key, label]) => {
                const isDate = dateFields.includes(key);
                const isRequired = requiredFields.includes(key);
                const hasError = missingFields.includes(key);

                const inputType =
                  isDate ? 'date' :
                  key.includes('email') ? 'email' :
                  key === 'nominee_name' ? 'text' :
                  key.includes('contact') || key.includes('no') || key.includes('account') || key.includes('ctc') || key.includes('years') || key.includes('amount')
                    ? 'number'
                    : 'text';

                const inputStyle = {
                  ...styles.input,
                  ...(hasError
                    ? { border: '1px solid #dc3545', backgroundColor: '#fff5f5' }
                    : {})
                };

                return (
                  <div key={key} style={styles.fieldWrapper}>
                    <label style={styles.label}>
                      {label}
                      {isRequired && <span style={{ color: '#dc3545' }}> *</span>}
                    </label>

                    {/* Dropdowns */}
                    {key === 'status_wl' ? (
                      <select
                        style={inputStyle}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      >
                        <option value="">Select Status</option>
                        <option value="W">W - Working</option>
                        <option value="L">L - Left</option>
                      </select>
                    ) : key === 'blood_group' ? (
                      <select
                        style={inputStyle}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      >
                        <option value="">Select Blood Group</option>
                        {bloodGroups.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    ) : key === 'gender' ? (
                      <select
                        style={inputStyle}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      >
                        <option value="">Select Gender</option>
                        {genderOptions.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          type={inputType}
                          ref={isDate ? dateRefs[key] : null}
                          style={inputStyle}
                          placeholder={label}
                          value={form[key]}
                          onClick={() => isDate && dateRefs[key]?.current?.showPicker?.()}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        />
                        {isDate && (
                          <span
                            style={styles.icon}
                            onClick={() => dateRefs[key]?.current?.showPicker?.()}
                          >
                            <FaCalendarAlt />
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button type="submit" style={styles.greenBtn}>
          <FaSave /> Save
        </button>
        <button
          type="button"
          style={styles.grayBtn}
          onClick={() => navigate('/employee-info')}
        >
          <FaTimes /> Cancel
        </button>
      </form>
    </div>
  );
};

export default AddEmployeeInfo;
