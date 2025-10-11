import { Route, Routes, Navigate, useLocation } from "react-router-dom"
import GarageDashboard from "./pages/GarageDashboard"
import GarageRegister from "./pages/GarageRegister"
import GarageLogin from "./pages/GarageLogin"
import GarageLanding from "./pages/GarageLanding"
import { useAuth } from "./contexts/AuthContext"
import {QueryClient,QueryClientProvider} from "@tanstack/react-query"
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
const queryClient=new QueryClient()
  useEffect(()=>{
if (user) {
    // Redirect to landing page with user info for dynamic content

  <Navigate to="/dashboard" state={{ user, from: location.pathname }} replace />;
  }
  },[])
  
  return (
    <QueryClientProvider client={queryClient} >
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
      
   
    </QueryClientProvider>
  )
}

export default App