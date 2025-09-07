import { Route, Routes, Navigate, useLocation } from "react-router-dom"
import GarageDashboard from "./pages/GarageDashboard"
import GarageRegister from "./pages/GarageRegister"
import GarageLogin from "./pages/GarageLogin"
import GarageLanding from "./pages/GarageLanding"
import { useAuth } from "./contexts/AuthContext"
import React,{useEffect} from "react";

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
    return <Navigate to="/dashboard" state={{ user, from: location.pathname }} replace />;
  }
  
  return children;
};

function App() {
  const { user } = useAuth();

  useEffect(()=>{
if (user) {
    // Redirect to landing page with user info for dynamic content
  <Navigate to="/dashboard" state={{ user, from: location.pathname }} replace />;
  }
  },[])
  
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/" 
          element={
            <GarageLanding />
          } 
        />
        
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <GarageLogin />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <GarageRegister />
            </PublicRoute>
          } 
        />

        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <GarageDashboard />
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