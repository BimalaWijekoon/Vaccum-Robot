import React from 'react';
import TopBar from './components/TopBar';
import PowerSystem from './components/PowerSystem';
import SensorStatus from './components/SensorStatus';
import WheelMetrics from './components/WheelMetrics';
import ControlPad from './components/ControlPad';
import MapAndRadar from './components/MapAndRadar';
import ActivityPanel from './components/ActivityPanel';
import TeachPanel from './components/TeachPanel';
const DesktopLayout = () => (
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
      <div style={{ flex: '0 0 auto' }}>
        <ControlPad />
      </div>
    </div>

    <div className="right-panel">
      <ActivityPanel />
    </div>
  </div>
);

const MobileLayout = () => (
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
      <ControlPad />
    </div>

    <div className="right-panel">
      <ActivityPanel />
    </div>
  </div>
);

const App = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1200);

  React.useEffect(() => {
    const checkLayout = () => setIsMobile(window.innerWidth < 1200);
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
};

export default App;
