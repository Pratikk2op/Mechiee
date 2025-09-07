import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {NotificationProvider} from "./contexts/NotificationContext"
import {ThemeProvider} from "./contexts/ThemeContext"
import {ChatProvider} from "./contexts/ChatContext"
import {LocationProvider} from "./contexts/LocationContext"
import {AuthProvider} from "./contexts/AuthContext"
import './index.css'
import App from './App.tsx'
import {BookingProvider} from "./contexts/BookingContext"
import {BrowserRouter} from "react-router-dom"
import {Toaster} from "react-hot-toast"
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BookingProvider>
        <LocationProvider>
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
        </LocationProvider>
      </BookingProvider>
    </AuthProvider>
  </StrictMode>,
)
