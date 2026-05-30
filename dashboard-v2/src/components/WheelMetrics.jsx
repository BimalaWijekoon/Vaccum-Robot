import React from 'react';
import { useMqtt } from '../MqttContext';
import { Activity } from 'lucide-react';

const WheelMetrics = () => {
  const { autoState, odometry } = useMqtt();

  const renderMetric = (label, value, unit) => (
    <div style={{ 
      background: 'var(--bg-color)', 
      padding: '10px', 
      borderRadius: 'var(--inner-radius)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <span className="text-secondary" style={{ fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>{label}</span>
      <span style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
        {value}
      </span>
      <span className="text-tertiary" style={{ fontSize: '10px', marginTop: '2px' }}>{unit}</span>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <Activity className="icon" size={16} />
        <span>Wheel Metrics</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {renderMetric('L-WHEEL', ((odometry?.left_cm || 0) / 100).toFixed(2), 'meters')}
        {renderMetric('R-WHEEL', ((odometry?.right_cm || 0) / 100).toFixed(2), 'meters')}
        {renderMetric('HEADING', `${odometry?.yaw || 0}°`, 'yaw')}
        {renderMetric('ROW', autoState?.row || 0, 'current')}
      </div>
    </div>
  );
};

export default WheelMetrics;
