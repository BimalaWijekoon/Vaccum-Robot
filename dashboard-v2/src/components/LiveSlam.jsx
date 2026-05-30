import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMqtt } from '../MqttContext';

const LiveSlam = () => {
  const { autoState, sonars, distance } = useMqtt();
  const canvasRef = useRef(null);
  
  // Internal state for tracking
  const posHistoryRef = useRef([{ x: 0, y: 0 }]);
  const obstaclesRef = useRef([]);
  const prevEncoderRef = useRef({ left: 0, right: 0 });
  const robotPosRef = useRef({ x: 0, y: 0, heading: 0 });
  const sessionStartRef = useRef(Date.now());
  const [dimensions, setDimensions] = useState({ w: 600, h: 400 });

  // Constants
  const SCALE = 2.5; // pixels per cm
  const MAX_HISTORY = 500;
  const MAX_OBSTACLES = 200;

  // Resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });

    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  // Update robot position from encoder data (dead reckoning)
  useEffect(() => {
    const leftCm = autoState.left_dist_cm || 0;
    const rightCm = autoState.right_dist_cm || 0;
    const prevLeft = prevEncoderRef.current.left;
    const prevRight = prevEncoderRef.current.right;

    const dLeft = leftCm - prevLeft;
    const dRight = rightCm - prevRight;

    if (Math.abs(dLeft) > 0.01 || Math.abs(dRight) > 0.01) {
      const dCenter = (dLeft + dRight) / 2;
      const heading = (autoState.yaw || 0) * (Math.PI / 180);

      const robot = robotPosRef.current;
      robot.x += dCenter * Math.sin(heading);
      robot.y -= dCenter * Math.cos(heading);
      robot.heading = heading;

      // Add to path history
      const history = posHistoryRef.current;
      const last = history[history.length - 1];
      const dx = robot.x - last.x;
      const dy = robot.y - last.y;
      if (Math.sqrt(dx * dx + dy * dy) > 1) { // min 1cm between points
        history.push({ x: robot.x, y: robot.y });
        if (history.length > MAX_HISTORY) history.shift();
      }
    }

    prevEncoderRef.current = { left: leftCm, right: rightCm };
  }, [autoState.left_dist_cm, autoState.right_dist_cm, autoState.yaw]);

  // Plot obstacles from sonar data
  useEffect(() => {
    const robot = robotPosRef.current;
    const heading = robot.heading;
    const obstacles = obstaclesRef.current;

    const addObstacle = (dist, angleOffset) => {
      if (dist < 150 && dist > 0) {
        const angle = heading + angleOffset;
        const ox = robot.x + dist * Math.sin(angle);
        const oy = robot.y - dist * Math.cos(angle);
        obstacles.push({ x: ox, y: oy, dist, time: Date.now() });
        if (obstacles.length > MAX_OBSTACLES) obstacles.shift();
      }
    };

    const front = sonars?.front || distance?.cm || 999;
    const left = sonars?.left || 999;
    const right = sonars?.right || 999;

    if (front < 150) addObstacle(front, 0);
    if (left < 150) addObstacle(left, -Math.PI / 2);
    if (right < 150) addObstacle(right, Math.PI / 2);
  }, [sonars, distance]);

  // Canvas rendering loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { w, h } = dimensions;
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    const centerX = w / 2;
    const centerY = h / 2;
    const robot = robotPosRef.current;

    ctx.clearRect(0, 0, w, h);

    // World-to-screen transform
    const toScreen = (wx, wy) => ({
      sx: centerX + (wx - robot.x) * SCALE,
      sy: centerY + (wy - robot.y) * SCALE
    });

    // ── Grid ──
    const gridSpacing = 25;
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.1)';
    ctx.lineWidth = 1;

    const offsetX = (centerX - robot.x * SCALE) % gridSpacing;
    const offsetY = (centerY - robot.y * SCALE) % gridSpacing;

    for (let x = offsetX - gridSpacing; x < w; x += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = offsetY - gridSpacing; y < h; y += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // ── Cleaned Zone (path fill) ──
    const history = posHistoryRef.current;
    if (history.length > 1) {
      // Path background glow
      ctx.strokeStyle = 'rgba(49, 130, 206, 0.15)'; // Accent Primary low opacity
      ctx.lineWidth = 12; // ~robot width
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const first = toScreen(history[0].x, history[0].y);
      ctx.moveTo(first.sx, first.sy);
      for (let i = 1; i < history.length; i++) {
        const p = toScreen(history[i].x, history[i].y);
        ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();

      // Thin path line
      ctx.strokeStyle = 'rgba(49, 130, 206, 0.8)'; // Accent Primary
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(first.sx, first.sy);
      for (let i = 1; i < history.length; i++) {
        const p = toScreen(history[i].x, history[i].y);
        ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();
    }

    // ── Obstacles ──
    const obstacles = obstaclesRef.current;
    const now = Date.now();
    obstacles.forEach((ob) => {
      const age = (now - ob.time) / 1000;
      const alpha = Math.max(0.1, 1 - (age / 30)); // Fade out over 30s
      const p = toScreen(ob.x, ob.y);

      if (p.sx > -10 && p.sx < w + 10 && p.sy > -10 && p.sy < h + 10) {
        // Warning orange for obstacles
        ctx.fillStyle = `rgba(221, 107, 32, ${alpha})`; 
        ctx.shadowColor = `rgba(221, 107, 32, ${alpha * 0.5})`;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // ── Distance Rings ──
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    ctx.beginPath(); ctx.arc(centerX, centerY, 50 * SCALE, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, 100 * SCALE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    
    // Ring labels
    ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
    ctx.font = '9px sans-serif';
    ctx.fillText('50cm', centerX + (50 * SCALE) + 4, centerY - 4);
    ctx.fillText('100cm', centerX + (100 * SCALE) + 4, centerY - 4);

    // ── Robot Sprite (Triangle) ──
    const heading = robot.heading;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(heading);

    // Heading Arrow Line
    const gradient = ctx.createLinearGradient(0, 0, 0, -100);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, 'rgba(49, 130, 206, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-1, -100, 2, 100);

    // Robot Triangle
    ctx.fillStyle = '#3182CE';
    ctx.shadowColor = 'rgba(49, 130, 206, 0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 8);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();

    // Center dot
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    let animationId = requestAnimationFrame(render);
    return animationId;
  }, [dimensions]);

  useEffect(() => {
    let animationId = render();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [render]);

  const elapsedMin = Math.floor((Date.now() - sessionStartRef.current) / 60000);

  return (
    <div className="card" style={{ flex: 2, position: 'relative', overflow: 'hidden', padding: 0 }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 2, pointerEvents: 'none' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '1px' }}>
          LIVE SLAM
        </span>
      </div>
      
      {/* Heading text */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2, pointerEvents: 'none' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
          HDG {autoState?.yaw || 0}°
        </span>
      </div>

      {/* HTML5 Canvas Engine */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* Bottom Stats Modules */}
      <div style={{ 
        position: 'absolute', bottom: '16px', left: '16px', right: '16px', 
        display: 'flex', justifyContent: 'space-between', zIndex: 2, pointerEvents: 'none'
      }}>
        <div style={{ background: 'var(--bg-color)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>{Math.round(autoState?.coverage_pct || 0)}%</div>
          <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)' }}>COVERAGE</div>
        </div>
        
        <div style={{ background: 'var(--bg-color)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>{elapsedMin}m</div>
          <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)' }}>ELAPSED</div>
        </div>

        <div style={{ background: 'var(--bg-color)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>{autoState?.row || 0}/12</div>
          <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)' }}>ROWS</div>
        </div>
      </div>
    </div>
  );
};

export default LiveSlam;
