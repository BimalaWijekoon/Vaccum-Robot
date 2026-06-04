import React, { useState, useEffect, useRef } from 'react';
import { useMqtt } from '../MqttContext';
import { Gauge, Navigation } from 'lucide-react';

const DriveControl = () => {
  const { driveSpeed, sendDriveSpeed, odometry, robotMode, sendSystemCmd } = useMqtt();
  const [localSpeed, setLocalSpeed] = useState(driveSpeed || 150);
  const [gyroAssist, setGyroAssist] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);

  // Sync with global state if it changes externally and we aren't dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalSpeed(driveSpeed);
    }
  }, [driveSpeed, isDragging]);

  const updateSpeedFromEvent = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    
    // ViewBox is 200x120. cx is 100, cy is 95
    const cx = rect.left + (100 / 200) * rect.width;
    const cy = rect.top + (95 / 120) * rect.height;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - cx;
    const dy = clientY - cy;

    const angle = Math.atan2(dy, dx);
    let fraction;

    if (dy > 0) {
      // User dragged below the center line (clamp to 0 or 1)
      fraction = dx > 0 ? 1 : 0;
    } else {
      // Angle goes from -PI (left) to 0 (right)
      fraction = 1 - (Math.abs(angle) / Math.PI);
    }

    const newSpeed = Math.round(50 + fraction * 205);
    setLocalSpeed(Math.min(Math.max(newSpeed, 50), 255));
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSpeedFromEvent(e);
  };

  const handlePointerMove = (e) => {
    if (isDragging) {
      updateSpeedFromEvent(e);
    }
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      sendDriveSpeed(localSpeed);
    }
  };

  // Speedometer values
  const currentSpeed = odometry?.speed_cm_s ? parseFloat(odometry.speed_cm_s) : 0;
  const MAX_SPEED = 50; 
  const clampedSpeed = Math.min(Math.max(currentSpeed, -MAX_SPEED), MAX_SPEED);
  const innerPercent = Math.abs(clampedSpeed) / MAX_SPEED;
  
  // Inner arc (Speedometer) - Radius 50
  const innerCircumference = Math.PI * 50;
  const innerOffset = innerCircumference - (innerPercent * innerCircumference);

  // Outer arc (Slider) - Radius 75
  const fraction = (localSpeed - 50) / 205;
  const outerCircumference = Math.PI * 75;
  const outerOffset = outerCircumference - (fraction * outerCircumference);

  // Thumb position
  const thumbAngle = Math.PI * fraction;
  const thumbX = 100 - 75 * Math.cos(thumbAngle);
  const thumbY = 95 - 75 * Math.sin(thumbAngle);

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <Gauge className="icon" size={18} />
        <span style={{ fontWeight: 800 }}>DRIVE CONTROL</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {/* COMBINED GAUGE & SLIDER */}
        <div 
          ref={svgRef}
          style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: '220px',
            margin: '10px auto 0 auto', 
            touchAction: 'none' // Prevent scrolling while dragging
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <svg width="100%" viewBox="0 0 200 120" style={{ overflow: 'visible', userSelect: 'none' }}>
            {/* --- OUTER ARC (SLIDER TRACK) --- */}
            <path
              d="M 25 95 A 75 75 0 0 1 175 95"
              fill="none"
              stroke="var(--bg-secondary)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Outer Arc Active (PWM Value) */}
            <path
              d="M 25 95 A 75 75 0 0 1 175 95"
              fill="none"
              stroke="var(--accent-primary)" // Purple/Accent
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={outerCircumference}
              strokeDashoffset={outerOffset}
            />
            
            {/* --- INNER ARC (SPEEDOMETER) --- */}
            <path
              d="M 50 95 A 50 50 0 0 1 150 95"
              fill="none"
              stroke="var(--border-color)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Inner Arc Active (Actual Speed) */}
            <path
              d="M 50 95 A 50 50 0 0 1 150 95"
              fill="none"
              stroke={currentSpeed < 0 ? "var(--accent-danger)" : "var(--accent-success)"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={innerCircumference}
              strokeDashoffset={innerOffset}
              style={{ transition: 'stroke-dashoffset 0.3s ease-out, stroke 0.3s ease' }}
            />
            
            {/* --- SLIDER THUMB --- */}
            <circle 
               cx={thumbX} 
               cy={thumbY} 
               r="12" 
               fill="#fff" 
               stroke="var(--accent-primary)" 
               strokeWidth="4" 
               style={{ 
                 filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))', 
                 cursor: 'grab',
                 transition: isDragging ? 'none' : 'cx 0.3s ease, cy 0.3s ease'
               }}
            />
          </svg>
          
          {/* CENTER TEXT */}
          <div style={{ 
            position: 'absolute', 
            bottom: '10px', 
            left: '0', 
            right: '0', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            {/* Actual Speed */}
            <span style={{ 
              fontFamily: 'Outfit', 
              fontSize: '28px', 
              fontWeight: 800, 
              color: 'var(--text-primary)',
              lineHeight: '1'
            }}>
              {Math.abs(currentSpeed).toFixed(1)}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {currentSpeed < 0 ? 'cm/s (REV)' : 'cm/s'}
            </span>
            
            {/* PWM Value Badge */}
            <div style={{ 
               marginTop: '8px',
               background: 'var(--bg-secondary)', 
               padding: '4px 10px', 
               borderRadius: '12px',
               fontSize: '11px',
               fontWeight: 700,
               color: 'var(--accent-primary)',
               border: '1px solid var(--border-color)',
               boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              PWM: {localSpeed}
            </div>
          </div>
        </div>

        {/* MIN/MAX Labels */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          padding: '0 25px', 
          marginTop: '-15px',
          marginBottom: '10px'
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>MIN (50)</span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>MAX (255)</span>
        </div>

        {/* GYRO ASSIST TOGGLE */}
        <div style={{ 
          background: 'var(--bg-color)', 
          padding: '12px 15px', 
          borderRadius: 'var(--inner-radius)', 
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: robotMode === 'AUTO' ? 0.7 : 1,
          marginTop: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>GYRO ASSIST</span>
          </div>
          <div 
            onClick={() => {
              if (robotMode === 'AUTO') return;
              const newVal = !gyroAssist;
              setGyroAssist(newVal);
              sendSystemCmd(newVal ? 'GYRO_ASSIST:ON' : 'GYRO_ASSIST:OFF');
            }}
            style={{
              width: '36px',
              height: '20px',
              borderRadius: '10px',
              background: (robotMode === 'AUTO' || gyroAssist) ? 'var(--accent-success)' : 'var(--bg-secondary)',
              position: 'relative',
              cursor: robotMode === 'AUTO' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: (robotMode === 'AUTO' || gyroAssist) ? '18px' : '2px',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default DriveControl;
