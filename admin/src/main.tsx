import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {AuthProvider} from "./context/AdminContext"
import {NotificationProvider} from "./context/NotificationContext"
import {ThemeProvider} from "./context/ThemeContext"
import {ChatProvider} from "./context/ChatContext"
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
            <ChatProvider>
              <LocationProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </LocationProvider>
            </ChatProvider>
          </ThemeProvider>
        </NotificationProvider>
      </AuthenticateProvider>
    </AuthProvider>
  </StrictMode>,
)
