import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ExcelImportPage from './pages/admin/ExcelImportPage';
import StudentsPage from './pages/admin/StudentsPage';
import TemplatesPage from './pages/admin/TemplatesPage';
import RequestsPage from './pages/admin/RequestsPage';
import IssuedCertificatesPage from './pages/admin/IssuedCertificatesPage';
import ReportsPage from './pages/admin/ReportsPage';
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import NewRequestPage from './pages/student/NewRequestPage';
import MyRequestsPage from './pages/student/MyRequestsPage';
import StudentProfilePage from './pages/student/StudentProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/verify/:token" element={<VerifyPage />} />

          {/* Administrator Portal */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireStaff>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="import" element={<ExcelImportPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="issued" element={<IssuedCertificatesPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Student Portal */}
          <Route
            path="/student"
            element={
              <ProtectedRoute>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="new-request" element={<NewRequestPage />} />
            <Route path="history" element={<MyRequestsPage />} />
            <Route path="profile" element={<StudentProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
