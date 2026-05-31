import React, { useRef, useEffect } from 'react';
import { Radar } from 'lucide-react';
import { useMqtt } from '../MqttContext';

const ObstacleRadar = () => {
  const { sonars } = useMqtt();
  const canvasRef = useRef(null);
  
  const sweepAngleRef = useRef(0);
  const blipsRef = useRef([]); 
  
  // Keep latest sonars in a ref to avoid resetting the animation loop on every MQTT update
  const sonarsRef = useRef(sonars);
  useEffect(() => { sonarsRef.current = sonars; }, [sonars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let lastTime = Date.now();

    const maxDist = 150; // cm

    const render = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Handle Resize dynamically
      const width = canvas.parentElement.clientWidth;
      const height = canvas.parentElement.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) - 20;

      // 1. Draw Rings & Crosshairs
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.15)';
      ctx.lineWidth = 1;
      
      ctx.beginPath(); ctx.arc(cx, cy, radius * 0.33, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, radius * 0.66, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.stroke();
      
      ctx.beginPath(); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy); ctx.stroke();

      // 2. Update Sweep Angle
      const sweepSpeed = 120; // degrees per second
      const prevAngle = sweepAngleRef.current;
      sweepAngleRef.current = (sweepAngleRef.current + sweepSpeed * dt) % 360;
      const currentAngle = sweepAngleRef.current;

      // 3. Check for Sonar crossings to generate Blips
      const checkBlip = (targetAngle, distValue) => {
        if (
          (prevAngle < targetAngle && currentAngle >= targetAngle) || 
          (prevAngle > currentAngle && (targetAngle > prevAngle || targetAngle <= currentAngle)) // wrapped 360
        ) {
          if (distValue < maxDist) {
            blipsRef.current.push({ angle: targetAngle, dist: distValue, life: 1.0 });
          }
        }
      };

      const currentSonars = sonarsRef.current || {};
      checkBlip(0, currentSonars.front || 999);
      checkBlip(90, currentSonars.right || 999);
      checkBlip(135, currentSonars.rear_right || 999);
      checkBlip(225, currentSonars.rear_left || 999);
      checkBlip(270, currentSonars.left || 999);

      // 4. Draw Blips
      for (let i = blipsRef.current.length - 1; i >= 0; i--) {
        const blip = blipsRef.current[i];
        blip.life -= dt * 0.4; // Fades out over 2.5 seconds
        
        if (blip.life <= 0) {
          blipsRef.current.splice(i, 1);
          continue;
        }

        const blipRad = (blip.angle - 90) * (Math.PI / 180);
        const distScaled = (blip.dist / maxDist) * radius;
        const bx = cx + Math.cos(blipRad) * distScaled;
        const by = cy + Math.sin(blipRad) * distScaled;

        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 136, ${blip.life})`; // success green
        ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
        ctx.shadowBlur = 10 * blip.life;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Draw Sweep Line
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((currentAngle - 90) * (Math.PI / 180));
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, 0, -Math.PI / 3, true); // 60 degree trailing arc
      ctx.closePath();
      
      // Sweep gradient fill
      ctx.fillStyle = 'rgba(49, 130, 206, 0.2)';
      ctx.fill();
      
      // Leading Edge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.strokeStyle = 'rgba(49, 130, 206, 0.9)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(49, 130, 206, 0.8)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      ctx.restore();

      // Center dot
      ctx.fillStyle = 'var(--accent-primary)';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="card" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div className="card-header" style={{ justifyContent: 'center', zIndex: 2 }}>
        <Radar size={14} className="icon" />
        <span>Obstacle Radar</span>
      </div>

      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* Static Overlays */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: '200px', maxHeight: '200px' }}>
          <span style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', fontWeight: 700, fontSize: '11px', color: 'var(--accent-success)' }}>F</span>
          <span style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', fontWeight: 700, fontSize: '11px', color: 'var(--text-tertiary)' }}>B</span>
          <span style={{ position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '11px', color: 'var(--accent-success)' }}>L</span>
          <span style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '11px', color: 'var(--accent-success)' }}>R</span>

          <span style={{ position: 'absolute', right: '50%', top: '15%', transform: 'translateX(-5px)', fontSize: '8px', color: 'var(--text-tertiary)' }}>150cm</span>
          <span style={{ position: 'absolute', right: '50%', top: '33%', transform: 'translateX(-5px)', fontSize: '8px', color: 'var(--text-tertiary)' }}>100cm</span>
          <span style={{ position: 'absolute', right: '50%', top: '66%', transform: 'translateX(-5px)', fontSize: '8px', color: 'var(--text-tertiary)' }}>50cm</span>
        </div>
      </div>
    </div>
  );
};

export default ObstacleRadar;
