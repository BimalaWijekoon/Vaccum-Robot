import React from 'react';
import { useMqtt } from '../MqttContext';
import { Activity } from 'lucide-react';

const WheelMetrics = () => {
  const { autoState, odometry } = useMqtt();

  const renderMetric = (label, value, unit) => (
    <div style={{ 
      background: 'var(--bg-color)', 
      padding: '6px 10px', 
      borderRadius: 'var(--inner-radius)', 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid var(--border-color)'
    }}>
      <span className="text-secondary" style={{ fontSize: '10px', fontWeight: 700 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {value}
        </span>
        <span className="text-tertiary" style={{ fontSize: '9px' }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <Activity className="icon" size={16} />
        <span>Wheel Metrics</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {renderMetric('L-WHEEL', ((odometry?.left_cm || 0) / 100).toFixed(2), 'm')}
        {renderMetric('R-WHEEL', ((odometry?.right_cm || 0) / 100).toFixed(2), 'm')}
        {renderMetric('HEADING', `${autoState?.yaw || 0}°`, 'yaw')}
      </div>
    </div>
  );
};

export default WheelMetrics;
