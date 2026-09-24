import React from 'react';
import LiveSlam from './LiveSlam';
import ObstacleRadar from './ObstacleRadar';

const MapAndRadar = () => {
  return (
    <div className="map-radar-container">
      <LiveSlam />
      <ObstacleRadar />
    </div>
  );
};

export default MapAndRadar;
