import React from 'react';
import TopBar from './components/TopBar';
import PowerSystem from './components/PowerSystem';
import SensorStatus from './components/SensorStatus';
import WheelMetrics from './components/WheelMetrics';
import ControlPad from './components/ControlPad';
import MapAndRadar from './components/MapAndRadar';
import ActivityPanel from './components/ActivityPanel';
import SystemController from './components/SystemController';
import EventConsole from './components/EventConsole';
const App = () => {
  return (
    <div className="app-container">
      <SystemController />
      <TopBar />

      <div className="left-panel">
        <PowerSystem />
        <SensorStatus />
        <WheelMetrics />
      </div>

      <div className="center-panel">
        <MapAndRadar />
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <div className="control-pad-wrapper" style={{ flex: 2, display: 'flex' }}>
            <ControlPad />
          </div>
          <div style={{ flex: 1.2, display: 'flex' }}>
            <EventConsole />
          </div>
        </div>
      </div>

      <div className="right-panel">
        <ActivityPanel />
      </div>
    </div>
  );
};

export default App;
