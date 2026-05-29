import React, { useContext, useMemo } from 'react';
import { MqttContext } from '../MqttContext';
import '../styles/RadarTab.css';

export function RadarTab() {
  const { sonars, navigation, battery, mode } = useContext(MqttContext);

  // Radar dimensions
  const canvasSize = 300;
  const radius = 120; // Max radius for visualization
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;

  // Helper: Convert distance (cm) and angle to SVG coordinates
  // Front = 0°, Left = 90°, Right = -90°
  const getCoord = (distCm, angleDeg) => {
    const maxDist = 150;
    const r = (Math.min(distCm, maxDist) / maxDist) * radius;
    const angle = (angleDeg * Math.PI) / 180;
    return {
      x: centerX + r * Math.sin(angle),
      y: centerY - r * Math.cos(angle),
    };
  };

  // Get color based on distance
  const getObstacleColor = (distCm) => {
    if (distCm < 30) return '#ff4444'; // Red - DANGER
    if (distCm < 70) return '#ffaa00'; // Orange/Yellow - CAUTION
    return '#44ff44'; // Green - CLEAR
  };

  // Parse sonar data
  const front = sonars?.front || 999;
  const left = sonars?.left || 999;
  const right = sonars?.right || 999;

  // Parse navigation data
  const safeDirections = navigation?.safe_directions?.split(',') || [];
  const isApproaching = navigation?.approaching || false;

  // Memoize SVG rendering
  const radarSVG = useMemo(() => {
    return (
      <svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`} className="radar-svg">
        {/* Background */}
        <circle cx={centerX} cy={centerY} r={radius + 10} fill="#1a1a2e" stroke="#333" strokeWidth="1" />

        {/* Distance rings */}
        <circle cx={centerX} cy={centerY} r={(50 / 150) * radius} fill="none" stroke="#444" strokeWidth="1" opacity="0.5" />
        <circle cx={centerX} cy={centerY} r={(100 / 150) * radius} fill="none" stroke="#444" strokeWidth="1" opacity="0.5" />
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#555" strokeWidth="2" />

        {/* Distance labels */}
        <text x={centerX + 5} y={centerY - (50 / 150) * radius - 5} className="radar-label" fontSize="10" fill="#888">
          50cm
        </text>
        <text x={centerX + 5} y={centerY - (100 / 150) * radius - 5} className="radar-label" fontSize="10" fill="#888">
          100cm
        </text>
        <text x={centerX + 5} y={centerY - radius - 8} className="radar-label" fontSize="10" fill="#888">
          150cm
        </text>

        {/* Direction lines (Front, Left, Right) */}
        {/* Front line (0°) */}
        <line x1={centerX} y1={centerY} x2={centerX} y2={centerY - radius} stroke="#555" strokeWidth="1" opacity="0.3" />

        {/* Left line (90°) */}
        <line x1={centerX} y1={centerY} x2={centerX + radius} y2={centerY} stroke="#555" strokeWidth="1" opacity="0.3" />

        {/* Right line (-90°) */}
        <line x1={centerX} y1={centerY} x2={centerX - radius} y2={centerY} stroke="#555" strokeWidth="1" opacity="0.3" />

        {/* Robot center */}
        <circle cx={centerX} cy={centerY} r="6" fill="#00ff00" stroke="#00cc00" strokeWidth="2" />

        {/* Direction indicators (arcs for safe/blocked) */}
        {/* Front indicator */}
        <text
          x={centerX}
          y={centerY - radius - 20}
          textAnchor="middle"
          className="direction-label"
          fill={safeDirections.includes('FORWARD') ? '#44ff44' : '#ff4444'}
          fontSize="12"
          fontWeight="bold"
        >
          F
        </text>

        {/* Left indicator */}
        <text
          x={centerX + radius + 15}
          y={centerY + 5}
          textAnchor="start"
          className="direction-label"
          fill={safeDirections.includes('LEFT') ? '#44ff44' : '#ff4444'}
          fontSize="12"
          fontWeight="bold"
        >
          L
        </text>

        {/* Right indicator */}
        <text
          x={centerX - radius - 15}
          y={centerY + 5}
          textAnchor="end"
          className="direction-label"
          fill={safeDirections.includes('RIGHT') ? '#44ff44' : '#ff4444'}
          fontSize="12"
          fontWeight="bold"
        >
          R
        </text>

        {/* Obstacle dots */}
        {/* Front obstacle */}
        {front < 150 && (
          <circle
            cx={getCoord(front, 0).x}
            cy={getCoord(front, 0).y}
            r="5"
            fill={getObstacleColor(front)}
            stroke="#fff"
            strokeWidth="1"
          />
        )}

        {/* Left obstacle */}
        {left < 150 && (
          <circle
            cx={getCoord(left, 90).x}
            cy={getCoord(left, 90).y}
            r="5"
            fill={getObstacleColor(left)}
            stroke="#fff"
            strokeWidth="1"
          />
        )}

        {/* Right obstacle */}
        {right < 150 && (
          <circle
            cx={getCoord(right, -90).x}
            cy={getCoord(right, -90).y}
            r="5"
            fill={getObstacleColor(right)}
            stroke="#fff"
            strokeWidth="1"
          />
        )}

        {/* Approaching indicator (animated) */}
        {isApproaching && mode === 'AUTO' && (
          <circle
            cx={centerX}
            cy={centerY}
            r="15"
            fill="none"
            stroke="#ffaa00"
            strokeWidth="2"
            opacity="0.7"
            className="approaching-pulse"
          />
        )}
      </svg>
    );
  }, [front, left, right, safeDirections, isApproaching, mode]);

  return (
    <div className="radar-container">
      <div className="radar-header">
        <h2>🎯 Obstacle Radar</h2>
        <div className="mode-badge">{mode}</div>
      </div>

      <div className="radar-content">
        <div className="radar-visualization">{radarSVG}</div>

        <div className="radar-legend">
          <div className="legend-title">Legend</div>
          <div className="legend-item">
            <span className="legend-dot danger"></span>
            <span>&lt; 30cm (Danger)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot caution"></span>
            <span>30-70cm (Caution)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot clear"></span>
            <span>&gt; 70cm (Clear)</span>
          </div>
          <div className="legend-divider"></div>
          <div className="legend-item">
            <span className="legend-symbol">F/L/R</span>
            <span>Safe Directions</span>
          </div>
          <div className="legend-item">
            <span className="legend-symbol red">✗</span>
            <span>Blocked</span>
          </div>
        </div>
      </div>

      <div className="sensor-readout">
        <div className="sensor-value">
          <div className="sensor-label">Front</div>
          <div className="sensor-distance">{front < 999 ? `${front}cm` : '—'}</div>
          <div className="sensor-status">{front < 15 ? '🔴 BLOCKED' : front < 50 ? '🟡 CAUTION' : '🟢 CLEAR'}</div>
        </div>

        <div className="sensor-value">
          <div className="sensor-label">Left</div>
          <div className="sensor-distance">{left < 999 ? `${left}cm` : '—'}</div>
          <div className="sensor-status">{left < 7 ? '🔴 BLOCKED' : left < 50 ? '🟡 CAUTION' : '🟢 CLEAR'}</div>
        </div>

        <div className="sensor-value">
          <div className="sensor-label">Right</div>
          <div className="sensor-distance">{right < 999 ? `${right}cm` : '—'}</div>
          <div className="sensor-status">{right < 7 ? '🔴 BLOCKED' : right < 50 ? '🟡 CAUTION' : '🟢 CLEAR'}</div>
        </div>
      </div>

      {isApproaching && (
        <div className="approaching-alert">
          ⚠️ Obstacle approaching! {mode === 'AUTO' ? 'Initiating predictive avoidance...' : 'Recommend changing direction.'}
        </div>
      )}

      <div className="navigation-guide">
        <div className="guide-title">✅ Safe Directions</div>
        <div className="safe-directions">
          {safeDirections.length > 0 ? safeDirections.join(', ') : 'No safe directions'}
        </div>
      </div>
    </div>
  );
}
