import React from 'react';
import LiveSlam from './LiveSlam';
import ObstacleRadar from './ObstacleRadar';

const MapAndRadar = () => {
  return (
    <div style={{ display: 'flex', gap: '10px', height: '100%', flex: 1, minHeight: 0 }}>
      <LiveSlam />
      <ObstacleRadar />
    </div>
  );
};

export default MapAndRadar;
