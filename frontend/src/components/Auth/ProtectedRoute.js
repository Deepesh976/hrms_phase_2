// src/components/Auth/ProtectedRoute.js

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/* =========================
   VALID SYSTEM ROLES
========================= */

const VALID_ROLES = [
  'super_admin',
  'hrms_handler',
  'director',
  'hod',
  'unit_hr',
  'employee',
  'admin',
  'superadmin'
];

/* =========================
   DASHBOARD ROUTES
========================= */

const DASHBOARD_BY_ROLE = {
  super_admin: '/dashboard',
  hrms_handler: '/dashboard',
  unit_hr: '/dashboard',
  admin: '/dashboard',
  superadmin: '/dashboard',

  director: '/director-dashboard',
  hod: '/hod-dashboard',
  employee: '/employee-dashboard'
};

/* =========================
   PROTECTED ROUTE
========================= */

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();

  const token = localStorage.getItem('token');
  const role = (localStorage.getItem('role') || '').trim().toLowerCase();
  const expiry = localStorage.getItem('expiry');
  const mustChangePassword = localStorage.getItem('mustChangePassword');

  /* =========================
     AUTH CHECK
  ========================= */

  if (!token) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  /* =========================
     TOKEN EXPIRY CHECK
  ========================= */

  const expiryTime = Number(expiry);

  if (!expiryTime || Date.now() > expiryTime) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  /* =========================
     ROLE VALIDATION
  ========================= */

  if (!VALID_ROLES.includes(role)) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  /* =========================
     PREVENT LOGIN PAGE ACCESS
  ========================= */

  if (location.pathname === '/login') {
    const redirectPath = DASHBOARD_BY_ROLE[role] || '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  /* =========================
     FORCE PASSWORD CHANGE
  ========================= */

  if (mustChangePassword === 'true' && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  /* =========================
     ROLE ACCESS CONTROL
  ========================= */

  const normalizedAllowedRoles = allowedRoles.map(r =>
    r.toLowerCase().trim()
  );

  console.log("ROLE:", role);
  console.log("ALLOWED:", normalizedAllowedRoles);
  console.log("PATH:", location.pathname);

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(role)) {
    const redirectPath = DASHBOARD_BY_ROLE[role] || '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  /* =========================
     ACCESS GRANTED
  ========================= */

  return children;
};

export default ProtectedRoute;