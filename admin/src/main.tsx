import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {AuthProvider} from "./context/AdminContext"
import {NotificationProvider} from "./context/NotificationContext"
import {ThemeProvider} from "./context/ThemeContext"

import {LocationProvider} from "./context/LocationContext"
import {AuthenticateProvider} from "./context/AuthContext"
import './index.css'
import App from './App.tsx'
import {BrowserRouter} from "react-router-dom"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthenticateProvider>
        <NotificationProvider>
          <ThemeProvider>
         
              <LocationProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </LocationProvider>
           
          </ThemeProvider>
        </NotificationProvider>
      </AuthenticateProvider>
    </AuthProvider>
  </StrictMode>,
)
