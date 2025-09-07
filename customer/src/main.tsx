import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {NotificationProvider} from "./context/NotificationContext"
import {ThemeProvider} from "./context/ThemeContext"
import {ChatProvider} from "./context/ChatContext"
import {LocationProvider} from "./context/LocationContext"
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
            <ChatProvider>
            
                <BrowserRouter>
                  <App />
                  <Toaster />
                </BrowserRouter>
          
            </ChatProvider>
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </AuthProvider>
  </StrictMode>,
)
