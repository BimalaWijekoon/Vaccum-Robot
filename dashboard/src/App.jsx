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

// Debug component to show viewport info
const DebugInfo = ({ width, layout }) => (
  <div style={{
    position: 'fixed',
    bottom: 65,
    right: 10,
    background: 'rgba(0, 200, 255, 0.8)',
    color: 'black',
    padding: '8px 12px',
    fontSize: '10px',
    zIndex: 9999,
    pointerEvents: 'none',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontWeight: 'bold'
  }}>
    W: {width}px | {layout.toUpperCase()}
  </div>
);

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
  const [width, setWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const checkLayout = () => {
      const w = window.innerWidth;
      let newLayout = 'desktop';
      
      if (w < 768) {
        newLayout = 'mobile';
      } else if (w <= 1199) {
        newLayout = 'tablet';
      }
      
      console.log(`[VacBot] Window width: ${w}px → Layout: ${newLayout}`);
      setWidth(w);
      setLayout(newLayout);
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  console.log(`[VacBot] Rendering: ${layout} layout`);

  return (
    <>
      <DebugInfo width={width} layout={layout} />
      {layout === 'mobile' && <MobileLayout />}
      {layout === 'tablet' && <TabletLayout />}
      {layout === 'desktop' && <DesktopLayout />}
    </>
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
