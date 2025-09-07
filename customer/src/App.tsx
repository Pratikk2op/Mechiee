import { Route, Routes, Navigate, useLocation } from "react-router-dom"
import CustomerDashboard from "./pages/CustomerDashboard"
import CustomerRegister from "./pages/CustomerRegister"
import CustomerLogin from "./pages/CustomerLogin"
import CustomerLanding from "./pages/CustomerLanding"
import { useAuth } from "./context/AuthContext"
import React from "react";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!user) {
    // Redirect to login if not authenticated, preserving the intended destination
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }
  
  return children;
};

// Public Route Component (redirects to landing page if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  if (user) {
    // Redirect to landing page with user info for dynamic content
    return <Navigate to="/" state={{ user, from: location.pathname }} replace />;
  }
  
  return children;
};

function App() {
  const { user } = useAuth();
  
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/" 
          element={
            <CustomerLanding />
          } 
        />
        
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <CustomerLogin />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <CustomerRegister />
            </PublicRoute>
          } 
        />

        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Fallback: Redirect to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App