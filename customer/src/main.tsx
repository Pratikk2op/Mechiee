import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {NotificationProvider} from "./context/NotificationContext"
import {ThemeProvider} from "./context/ThemeContext"


import {AuthProvider} from "./context/AuthContext"
import './index.css'
import App from './App.tsx'
import {BrowserRouter} from "react-router-dom"
import {Toaster} from "react-hot-toast"
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider>
         
            
                <BrowserRouter>
                  <App />
                  <Toaster />
                </BrowserRouter>
          
            
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </AuthProvider>
  </StrictMode>,
)
