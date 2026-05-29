import React, { useState } from 'react';
import { MqttProvider, useMqtt } from './MqttContext';
import { Activity, Gamepad2, Settings, Navigation, WifiOff, Wifi, Radar } from 'lucide-react';
import DashboardTab from './components/DashboardTab';
import DriveTab from './components/DriveTab';
import AutoTab from './components/AutoTab';
import { RadarTab } from './components/RadarTab';

const AppContent = () => {
  const { isConnected, robotMode } = useMqtt();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <h1>VacBot</h1>
          <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
        <div className="header-mode-badge">
          {robotMode}
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="app-main">
        <div className={`tab-wrapper ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <DashboardTab />
        </div>
        <div className={`tab-wrapper ${activeTab === 'drive' ? 'active' : ''}`}>
          <DriveTab />
        </div>
        <div className={`tab-wrapper ${activeTab === 'auto' ? 'active' : ''}`}>
          <AutoTab />
        </div>
        <div className={`tab-wrapper ${activeTab === 'radar' ? 'active' : ''}`}>
          <RadarTab />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Activity size={24} />
          <span>Dash</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'drive' ? 'active' : ''}`}
          onClick={() => setActiveTab('drive')}
        >
          <Gamepad2 size={24} />
          <span>Drive</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'radar' ? 'active' : ''}`}
          onClick={() => setActiveTab('radar')}
        >
          <Radar size={24} />
          <span>Radar</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'auto' ? 'active' : ''}`}
          onClick={() => setActiveTab('auto')}
        >
          <Navigation size={24} />
          <span>Auto</span>
        </button>
      </nav>
    </div>
  );
};

function App() {
  return (
    <MqttProvider>
      <AppContent />
    </MqttProvider>
  );
}

export default App;
