import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import '../styles/ManageHODs.css';

const ManageHRs = () => {
  const navigate = useNavigate();

  const [hrs, setHrs] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [currentHR, setCurrentHR] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    unit: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    username: '',
    unit: '',
  });

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    const userRole = localStorage.getItem('role');

    if (!['super_admin', 'hrms_handler', 'unit_hr'].includes(userRole)) {
      toast.error('Access denied');
      navigate('/dashboard');
      return;
    }

    fetchHRs();
    fetchUnits();
  }, [navigate]);

  /* ================= API ================= */

  const fetchHRs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/hrs');
      setHrs(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch HRs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await axios.get('/units');
      setUnits(res.data.data || []);
    } catch {
      toast.error('Failed to fetch units');
    }
  };

  /* ================= HELPERS ================= */

  const resetForm = () => {
    setFormData({ name: '', username: '', unit: '' });
    setErrors({ name: '', username: '', unit: '' });
    setCurrentHR(null);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    resetForm();
  };

  /* ================= CREATE ================= */

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.username)) {
      newErrors.username = 'Phone must be exactly 10 digits';
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/hrs', formData);
      toast.success('Sub HR created successfully');
      closeModal();
      fetchHRs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setLoading(false);
    }
  };

  /* ================= EDIT ================= */

  const openEditModal = (hr) => {
    setCurrentHR(hr);
    setFormData({
      name: hr.name,
      username: hr.username,
      unit: hr.unit,
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/hrs/${currentHR._id}`, formData);
      toast.success('HR updated successfully');
      closeModal();
      fetchHRs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this HR?')) return;

    try {
      setLoading(true);
      await axios.delete(`/hrs/${id}`);
      toast.success('HR deleted');
      fetchHRs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  /* ================= RENDER ================= */

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="manage-hods-container">
        <div className="hods-header">
          <div>
            <h1 className="hods-title">Manage Sub Division HR</h1>
            <p className="hods-subtitle">
              Create and manage unit-level HR accounts
            </p>
          </div>
          <button
            className="create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> Create HR
          </button>
        </div>

        {/* HR TABLE */}
        <div className="hods-table-section">
          {loading && <div className="loading-spinner">Loading...</div>}

          {!loading && hrs.length === 0 && (
            <div className="no-data">No HR accounts found.</div>
          )}

          {!loading && hrs.length > 0 && (
            <div className="table-wrapper">
              <table className="hods-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Unit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hrs.map((hr) => (
                    <tr key={hr._id}>
                      <td><strong>{hr.name}</strong></td>
                      <td>{hr.username}</td>
                      <td>{hr.unit}</td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="hods-btn btn-edit"
                            onClick={() => openEditModal(hr)}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            className="hods-btn btn-delete"
                            onClick={() => handleDelete(hr._id)}
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL */}
        {(showCreateModal || showEditModal) && (
          <div className="modal-backdrop">
            <div className="modal-dialog">
              <div className="modal-header">
                <h2>
                  <span style={{ fontSize: '1.8rem' }}>
                    {showEditModal ? '✏️' : '➕'}
                  </span>
                  {showEditModal ? 'Edit Sub HR' : 'Create Sub HR'}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={showEditModal ? handleEdit : handleCreate}>
                <div className="modal-body">

                  <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
                    <label htmlFor="name">Full Name *</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter HR's full name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (e.target.value.trim()) {
                          setErrors({ ...errors, name: '' });
                        }
                      }}
                      onBlur={() => {
                        if (!formData.name.trim()) {
                          setErrors({ ...errors, name: 'Name is required' });
                        }
                      }}
                      required
                    />
                    {errors.name && <div className="form-error-message">⚠️ {errors.name}</div>}
                  </div>

                  <div className={`form-group ${errors.username ? 'has-error' : ''}`}>
                    <label htmlFor="phone">Phone Number *</label>
                    <input
                      id="phone"
                      type="text"
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                      value={formData.username}
                      onChange={(e) => {
                        const numOnly = e.target.value.replace(/\D/g, '');
                        setFormData({
                          ...formData,
                          username: numOnly
                        });
                        if (numOnly.length === 10) {
                          setErrors({ ...errors, username: '' });
                        }
                      }}
                      onBlur={() => {
                        if (formData.username.length !== 10) {
                          setErrors({ ...errors, username: 'Phone must be exactly 10 digits' });
                        }
                      }}
                      required
                    />
                    {errors.username ? (
                      <div className="form-error-message">⚠️ {errors.username}</div>
                    ) : (
                      <div className="form-help-text">Format: 10 digits (numbers only)</div>
                    )}
                  </div>

                  <div className={`form-group ${errors.unit ? 'has-error' : ''}`}>
                    <label htmlFor="unit">Unit *</label>
                    <select
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => {
                        setFormData({ ...formData, unit: e.target.value });
                        if (e.target.value.trim()) {
                          setErrors({ ...errors, unit: '' });
                        }
                      }}
                      onBlur={() => {
                        if (!formData.unit.trim()) {
                          setErrors({ ...errors, unit: 'Unit selection is required' });
                        }
                      }}
                      required
                    >
                      <option value="">Select Unit</option>
                      {units.map((unit) => (
                        <option key={unit._id} value={unit.name}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                    {errors.unit && <div className="form-error-message">⚠️ {errors.unit}</div>}
                  </div>

                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? '⏳ Processing...' : (showEditModal ? '✓ Update HR' : '✓ Create HR')}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ManageHRs;
