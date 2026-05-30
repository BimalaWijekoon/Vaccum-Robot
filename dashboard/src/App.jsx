import React from 'react';
import { MqttProvider } from './MqttContext';
import TopStatusBar from './components/TopStatusBar';
import BottomCommandDock from './components/BottomCommandDock';
import BatteryModule from './components/BatteryModule';
import SensorStatus from './components/SensorStatus';
import WheelMetrics from './components/WheelMetrics';
import SlamMap from './components/SlamMap';
import ArrowNavigation from './components/ArrowNavigation';
import VacuumControl from './components/VacuumControl';
import MissionPanel from './components/MissionPanel';
import RadarModule from './components/RadarModule';
import AiDecisions from './components/AiDecisions';

const DesktopLayout = () => (
  <div className="app-container">
    <div className="app-bg" />

    {/* Top Bar */}
    <TopStatusBar />

    {/* Left Sidebar — Telemetry */}
    <div className="left-sidebar">
      <BatteryModule />
      <SensorStatus />
      <WheelMetrics />
    </div>

    {/* Center — SLAM Map + Radar Side by Side */}
    <div className="center-panel">
      <div className="center-top">
        <SlamMap />
        <RadarModule />
      </div>
      <div className="center-bottom">
        <ArrowNavigation />
        <VacuumControl />
      </div>
    </div>

    {/* Right Panel — Mission/AI */}
    <div className="right-panel">
      <MissionPanel />
      <AiDecisions />
    </div>

    {/* Bottom Dock */}
    <BottomCommandDock />
  </div>
);

const MobileLayout = () => (
  <div className="app-container">
    <div className="app-bg" />

    <TopStatusBar />

    <div className="mobile-scroll">
      {/* SLAM Map first — hero */}
      <SlamMap />

      {/* Radar */}
      <RadarModule />

      {/* Arrow Navigation */}
      <ArrowNavigation />

      {/* Vacuum Control */}
      <VacuumControl />

      {/* Key stats */}
      <BatteryModule />
      <SensorStatus />
      <MissionPanel />

      {/* Secondary */}
      <WheelMetrics />
      <AiDecisions />
    </div>

    <BottomCommandDock />
  </div>
);

const TabletLayout = () => (
  <div className="app-container">
    <div className="app-bg" />

    <TopStatusBar />

    <div className="center-panel" style={{ gridArea: 'center' }}>
      <div className="center-top">
        <SlamMap />
        <RadarModule />
      </div>
      <div className="center-bottom">
        <ArrowNavigation />
        <VacuumControl />
      </div>
    </div>

    <div className="panels-tablet" style={{ gridArea: 'panels' }}>
      <div className="left-sidebar">
        <BatteryModule />
        <SensorStatus />
        <WheelMetrics />
      </div>
      <div className="right-panel">
        <MissionPanel />
        <AiDecisions />
      </div>
    </div>

    <BottomCommandDock />
  </div>
);

const AppContent = () => {
  const [layout, setLayout] = React.useState('desktop');

  React.useEffect(() => {
    const checkLayout = () => {
      const w = window.innerWidth;
      if (w < 768) setLayout('mobile');
      else if (w <= 1199) setLayout('tablet');
      else setLayout('desktop');
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  if (layout === 'mobile') return <MobileLayout />;
  if (layout === 'tablet') return <TabletLayout />;
  return <DesktopLayout />;
};

function App() {
  return (
    <MqttProvider>
      <AppContent />
    </MqttProvider>
  );
}

export default App;
