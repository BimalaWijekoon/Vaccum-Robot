import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MqttProvider } from './MqttContext'
import { ThemeProvider } from './ThemeContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <MqttProvider>
        <App />
      </MqttProvider>
    </ThemeProvider>
  </StrictMode>,
)
