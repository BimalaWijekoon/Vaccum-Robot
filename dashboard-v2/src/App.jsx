import React from 'react';
import TopBar from './components/TopBar';
import PowerSystem from './components/PowerSystem';
import SensorStatus from './components/SensorStatus';
import WheelMetrics from './components/WheelMetrics';
import ControlPad from './components/ControlPad';
import MapAndRadar from './components/MapAndRadar';
import ActivityPanel from './components/ActivityPanel';
import TeachPanel from './components/TeachPanel';
const App = () => {
  return (
    <div className="app-container">
      <TopBar />

      <div className="left-panel">
        <PowerSystem />
        <SensorStatus />
        <WheelMetrics />
        <TeachPanel />
      </div>

      <div className="center-panel">
        <MapAndRadar />
        <div className="control-pad-wrapper">
          <ControlPad />
        </div>
      </div>

      <div className="right-panel">
        <ActivityPanel />
      </div>
    </div>
  );
};

export default App;
