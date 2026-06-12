import React, { useEffect, useState } from "react";
import axios from "axios";
import "./LoginActivity.css";

const LoginActivity = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedUser, setSelectedUser] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [activeUsersThisWeek, setActiveUsersThisWeek] = useState(0);
  const [activeUsersThisMonth, setActiveUsersThisMonth] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  useEffect(() => {
    applyFilters();
    calculateStatistics();
  }, [search, department, role, data]);

  // Helper function to get the start of the current week (Monday)
  const getWeekStart = () => {
    const today = new Date();
    const currentDay = today.getDay();
    // Calculate days to subtract to get to Monday
    // If Sunday (0), go back 6 days; otherwise go back (currentDay - 1) days
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  // Helper function to get the end of the current week (Sunday)
  const getWeekEnd = () => {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  };

  // Helper function to get the start of the current month
  const getMonthStart = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    return monthStart;
  };

  // Helper function to get the end of the current month
  const getMonthEnd = () => {
    const today = new Date();
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    return monthEnd;
  };

  // Calculate statistics
  const calculateStatistics = () => {
    if (!data || data.length === 0) {
      setActiveUsersThisWeek(0);
      setActiveUsersThisMonth(0);
      return;
    }

    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    const monthStart = getMonthStart();
    const monthEnd = getMonthEnd();

    // Get unique active users this week (Monday-Sunday)
    const usersThisWeek = new Set();
    data.forEach((item) => {
      if (item.lastLogin) {
        const loginDate = new Date(item.lastLogin);
        if (loginDate >= weekStart && loginDate <= weekEnd) {
          usersThisWeek.add(item.empId);
        }
      }
    });

    // Get unique active users this month
    const usersThisMonth = new Set();
    data.forEach((item) => {
      if (item.lastLogin) {
        const loginDate = new Date(item.lastLogin);
        if (loginDate >= monthStart && loginDate <= monthEnd) {
          usersThisMonth.add(item.empId);
        }
      }
    });

    setActiveUsersThisWeek(usersThisWeek.size);
    setActiveUsersThisMonth(usersThisMonth.size);
  };

  const fetchActivity = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("/api/users/with-employee", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch login history for a specific user
  const fetchLoginHistory = async (user) => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem("token");
      setSelectedUser(user);

      // Fetch detailed login history from API
      const res = await axios.get(`/api/users/login-history/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLoginHistory(res.data.items || []);
    } catch (err) {
      console.error("Error fetching login history:", err);
      setLoginHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 🔍 FILTER LOGIC
  const applyFilters = () => {
    let temp = [...data];

    if (search) {
      temp = temp.filter(
        (item) =>
          item.empId?.toString().includes(search) ||
          item.user_name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (department) {
      temp = temp.filter((item) => item.department === department);
    }

    if (role) {
      temp = temp.filter((item) => item.role === role);
    }

    setFilteredData(temp);
    setCurrentPage(1);
  };

  // 📄 PAGINATION
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirst, indexOfLast);

  // 📥 DOWNLOAD CSV
  const handleDownload = () => {
    const exportData = filteredData;

    const headers = [
      "Emp ID",
      "Name",
      "Department",
      "Designation",
      "Role",
      "Login Time",
    ];

    const rows = exportData.map((item) => [
      item.empId || "-",
      item.user_name || "-",
      item.department || "-",
      item.designation || "-",
      item.role || "-",
      item.lastLogin
        ? new Date(item.lastLogin).toLocaleString()
        : "Never Logged In",
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "login_activity.csv";
    link.click();
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearch("");
    setDepartment("");
    setRole("");
  };

  // Close modal
  const closeModal = () => {
    setSelectedUser(null);
    setLoginHistory([]);
  };

  // 🔹 UNIQUE DROPDOWN VALUES
  const departments = [...new Set(data.map((d) => d.department).filter(Boolean))];
  const roles = [...new Set(data.map((d) => d.role).filter(Boolean))];

  // Pagination helpers
  const getPaginationNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="login-activity-container">
      {/* Loading State */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner-wrapper">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading Login Activity...</p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="activity-header">
        <div className="header-content">
          <h1 className="page-title">Login Activity</h1>
          <p className="page-subtitle">Track and monitor user login history</p>
        </div>
        <div className="header-actions">
          <div className="stats-cards-container">
            <div className="stat-card">
              <div className="stat-label">Active Users (This Week)</div>
              <div className="stat-value">{activeUsersThisWeek}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Users (This Month)</div>
              <div className="stat-value">{activeUsersThisMonth}</div>
            </div>
          </div>
          <button onClick={handleDownload} className="download-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Search</label>
            <input
              type="text"
              placeholder="Emp ID or Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="filter-select"
            >
              <option value="">All Departments</option>
              {departments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              {roles.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="filter-group-button">
            <button onClick={handleClearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>
        <div className="filter-info">
          Showing <span className="info-highlight">{currentItems.length}</span> of <span className="info-highlight">{filteredData.length}</span> results
        </div>
      </div>

      {/* Table Section */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-sno">S.No</th>
              <th className="col-id">Emp ID</th>
              <th className="col-name">Name</th>
              <th className="col-dept">Department</th>
              <th className="col-desig">Designation</th>
              <th className="col-role">Role</th>
              <th className="col-login">Login Time</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr key={item._id} className="data-row">
                  <td className="col-sno">{indexOfFirst + index + 1}</td>
                  <td className="col-id">
                    <span className="emp-id-badge">{item.empId || "-"}</span>
                  </td>
                  <td className="col-name">
                    <span
                      className="clickable-name"
                      onClick={() => fetchLoginHistory(item)}
                    >
                      {item.user_name || "-"}
                    </span>
                  </td>
                  <td className="col-dept">{item.department || "-"}</td>
                  <td className="col-desig">{item.designation || "-"}</td>
                  <td className="col-role">
                    <span className="role-badge">{item.role}</span>
                  </td>
                  <td className="col-login">
                    {item.lastLogin
                      ? new Date(item.lastLogin).toLocaleString()
                      : <span className="never-logged">Never Logged In</span>}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="no-data-row">
                <td colSpan="7" className="no-data-message">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modern Pagination */}
      <div className="pagination-section">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="pagination-btn pagination-prev"
        >
          ← Previous
        </button>

        <div className="pagination-numbers">
          {getPaginationNumbers().map((page, idx) => (
            <button
              key={idx}
              onClick={() => typeof page === "number" && setCurrentPage(page)}
              disabled={page === "..."}
              className={`pagination-number ${
                currentPage === page ? "pagination-active" : ""
              } ${page === "..." ? "pagination-dots" : ""}`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="pagination-btn pagination-next"
        >
          Next →
        </button>
      </div>

      {/* Pagination Info */}
      <div className="pagination-info">
        Page <span className="info-highlight">{currentPage}</span> of <span className="info-highlight">{totalPages || 1}</span>
      </div>

      {/* Login History Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">Login History</h2>
                <p className="modal-subtitle">{selectedUser.user_name}</p>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Complete Login History Section */}
              <div className="login-history-section">
                <h3 className="section-title">Complete Login History</h3>

                {historyLoading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading login history...</p>
                  </div>
                ) : loginHistory.length > 0 ? (
                  <div className="history-table-wrapper">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th className="history-col-sno">S.No</th>
                          <th className="history-col-time">Login Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginHistory.map((item, index) => (
                          <tr key={item._id || index} className="history-row">
                            <td className="history-col-sno">{index + 1}</td>
                            <td className="history-col-time">
                              {new Date(item.loginTime).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p>No login history found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="modal-action-btn modal-btn-primary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginActivity;
