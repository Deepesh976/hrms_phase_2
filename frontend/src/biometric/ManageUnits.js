import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';

import SuperNavbar from '../components/Navbar/adminnavbar';
import '../styles/ManageHODs.css';

const ManageUnits = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState('');
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [currentUnit, setCurrentUnit] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
  });

  /* ================= EFFECT ================= */
useEffect(() => {
  const userRole = localStorage.getItem('role');
  setRole(userRole);

  if (!['super_admin', 'hrms_handler'].includes(userRole)) {
    toast.error('Access denied');
    navigate('/dashboard');
    return;
  }

  fetchUnits();
}, [navigate]);

  /* ================= API ================= */
  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/units');
      setUnits(res.data.data || []);
    } catch {
      toast.error('Failed to fetch Units');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', location: '' });
    setCurrentUnit(null);
  };

  /* ================= CREATE ================= */
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/units', formData);
      toast.success('Unit created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchUnits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setLoading(false);
    }
  };

  /* ================= EDIT ================= */
  const openEditModal = (unit) => {
    setCurrentUnit(unit);
    setFormData({
      name: unit.name,
      location: unit.location,
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`/units/${currentUnit._id}`, formData);
      toast.success('Unit updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchUnits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Unit?')) return;

    try {
      setLoading(true);
      await axios.delete(`/units/${id}`);
      toast.success('Unit deleted');
      fetchUnits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SuperNavbar />
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="manage-hods-container">
        <div className="hods-header">
          <div>
            <h1 className="hods-title">Manage Units</h1>
            <p className="hods-subtitle">
              Create and manage organizational units
            </p>
          </div>
          <button
            className="create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> Create Unit
          </button>
        </div>

        {/* Units Table */}
        <div className="hods-table-section">
          {loading && <div className="loading-spinner">Loading...</div>}

          {!loading && units.length === 0 && (
            <div className="no-data">No Units found.</div>
          )}

          {!loading && units.length > 0 && (
            <div className="table-wrapper">
              <table className="hods-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Unit Name</th>
                    <th>Unit Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit, index) => (
                    <tr key={unit._id}>
                      <td>{index + 1}</td>
                      <td><strong>{unit.name}</strong></td>
                      <td>{unit.location}</td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="hods-btn btn-edit"
                            onClick={() => openEditModal(unit)}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            className="hods-btn btn-delete"
                            onClick={() => handleDelete(unit._id)}
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

        {/* CREATE / EDIT MODAL */}
        {(showCreateModal || showEditModal) && (
          <div className="modal-backdrop">
            <div className="modal-dialog">
              <div className="modal-header">
                <h2>
                  {showEditModal ? 'Edit Unit' : 'Create Unit'}
                </h2>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={showEditModal ? handleEdit : handleCreate}>
                <div className="modal-body">

                  <div className="form-group">
                    <label>Unit Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit Location *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      required
                    />
                  </div>

                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {showEditModal ? 'Update Unit' : 'Create Unit'}
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

export default ManageUnits;