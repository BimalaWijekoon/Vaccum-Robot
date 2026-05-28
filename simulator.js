const mqtt = require('mqtt');

// Configuration - must match dashboard & firmware
const config = {
  host: '0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud',
  port: 8883,
  username: 'VaccumRobot',
  password: 'Vaccum@12345',
  topicPrefix: 'vacbot'
};

// Hardware constants (from main.cpp)
const DRIVE_SPEED = 90;
const PIVOT_SPEED = 90;
const VACUUM_TURBO_SPEED = 255;
const VACUUM_ECO_SPEED = 160;
const FRONT_STOP_CM = 9;
const SIDE_CLEAR_CM = 7;
const SPEED_RATIO = DRIVE_SPEED / 255.0;
const PIVOT_RATIO = PIVOT_SPEED / 255.0;

// Simulated Robot State
let robotState = {
  mode: 'MANUAL',
  movement: 'STOP',
  suction: 0,
  battery: {
    voltage: 12.0,
    percent: 95,
    health: 'GOOD',
    alert: false
  },
  distance: {
    front: 150,
    left: 80,
    right: 90,
    cm: 150,
    obstacle: false
  },
  auto: {
    state: 'IDLE',
    row: 0,
    yaw: 0,
    left_dist_cm: 0,
    right_dist_cm: 0,
    coverage_pct: 0
  },
  online: true
};

// Simulation counters
let simTick = 0;
let leftPulses = 0;
let rightPulses = 0;
let yawIntegration = 0;
let distanceTraveled = 0;
let rowsSizeCompleted = 0;
let calibrating = true;

// Topic map
const topics = {
  cmdMovement: `${config.topicPrefix}/cmd/movement`,
  cmdSuction: `${config.topicPrefix}/cmd/suction`,
  cmdMode: `${config.topicPrefix}/cmd/mode`,
  statBattery: `${config.topicPrefix}/status/battery`,
  statDistance: `${config.topicPrefix}/status/distance`,
  statMode: `${config.topicPrefix}/status/mode`,
  statAuto: `${config.topicPrefix}/status/auto`,
  statOnline: `${config.topicPrefix}/status/online`
};

// Connect to MQTT
const client = mqtt.connect(`mqtts://${config.host}:${config.port}`, {
  username: config.username,
  password: config.password,
  clientId: `vacbot-simulator-${Math.random().toString(16).substr(2, 6)}`,
  keepalive: 30,
  reconnectPeriod: 5000,
  connectTimeout: 10000
});

client.on('connect', () => {
  console.log('✅ Simulator connected to MQTT broker');
  
  // Subscribe to command topics
  client.subscribe([
    topics.cmdMovement,
    topics.cmdSuction,
    topics.cmdMode
  ]);
  
  console.log('📡 Listening to commands...');
  console.log('🔧 Simulating gyro calibration (5 seconds)...\n');

  // Simulate 5 second calibration delay (from main.cpp calibrateGyro + determineGyroSign)
  let calProgress = 0;
  const calInterval = setInterval(() => {
    calProgress++;
    console.log(`   ⏳ Calibration: ${calProgress}/5 seconds...`);
    if (calProgress >= 5) {
      clearInterval(calInterval);
      calibrating = false;
      console.log('   ✅ Gyro calibration complete!\n');
      // Publish online status after calibration
      client.publish(topics.statOnline, 'online');
      // Start simulation loop
      startSimulation();
    }
  }, 1000);
});

client.on('message', (topic, payload) => {
  const message = payload.toString();
  console.log(`📥 Command received: ${topic} → ${message}`);
  
  if (topic === topics.cmdMovement) {
    if (calibrating) {
      console.log('   ⏳ Ignoring movement — calibrating...');
      return;
    }
    robotState.movement = message;
    if (robotState.mode === 'MANUAL') {
      console.log(`   🤖 Movement: ${message}`);
    }
  } else if (topic === topics.cmdSuction) {
    if (robotState.mode === 'MANUAL') {
      robotState.suction = parseInt(message);
      console.log(`   🌀 Suction: ${robotState.suction}/255`);
    } else {
      console.log('   ⚠️  Suction ignored in AUTO mode (firmware-controlled)');
    }
  } else if (topic === topics.cmdMode) {
    robotState.mode = message;
    if (message === 'AUTO') {
      console.log(`   🚀 Entering AUTO mode - starting cleaning...`);
      initializeAutoMode();
    } else {
      console.log(`   ⏸️  Returning to MANUAL mode`);
      robotState.auto.state = 'IDLE';
      robotState.movement = 'STOP';
    }
    client.publish(topics.statMode, robotState.mode);
  }
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
  process.exit(1);
});

function initializeAutoMode() {
  robotState.auto.state = 'MOVING_FORWARD';
  robotState.auto.row = 1;
  robotState.auto.yaw = 0;
  robotState.auto.coverage_pct = 0;
  distanceTraveled = 0;
  rowsSizeCompleted = 0;
  leftPulses = 0;
  rightPulses = 0;
  yawIntegration = 0;
  // Auto vacuum speed based on battery
  robotState.suction = robotState.battery.percent > 70 ? VACUUM_TURBO_SPEED : VACUUM_ECO_SPEED;
  console.log(`   🌀 Vacuum: ${robotState.suction === VACUUM_TURBO_SPEED ? 'TURBO' : 'ECO'} mode`);
}

function startSimulation() {
  setInterval(() => {
    simTick++;
    
    // Simulate battery drain
    if (simTick % 20 === 0) {
      if (robotState.suction > 0 || robotState.movement !== 'STOP') {
        robotState.battery.percent -= 0.1;
        if (robotState.battery.percent < 0) robotState.battery.percent = 0;
        robotState.battery.voltage = 9.0 + (robotState.battery.percent / 100) * 3.6;
      }
      
      // Round to 2 decimals
      robotState.battery.percent = Math.round(robotState.battery.percent * 100) / 100;
      robotState.battery.voltage = Math.round(robotState.battery.voltage * 100) / 100;
      
      // Update battery health
      if (robotState.battery.percent >= 95) {
        robotState.battery.health = 'EXCELLENT';
        robotState.battery.alert = false;
      } else if (robotState.battery.percent >= 75) {
        robotState.battery.health = 'GOOD';
        robotState.battery.alert = false;
      } else if (robotState.battery.percent >= 50) {
        robotState.battery.health = 'FAIR';
        robotState.battery.alert = false;
      } else if (robotState.battery.percent >= 25) {
        robotState.battery.health = 'LOW';
        robotState.battery.alert = false;
      } else {
        robotState.battery.health = 'CRITICAL';
        robotState.battery.alert = true;
      }
      
      client.publish(topics.statBattery, JSON.stringify(robotState.battery));
    }
    
    // Simulate distance sensor
    if (simTick % 10 === 0) {
      const baseDistance = 150;
      robotState.distance.cm = Math.round((baseDistance + Math.sin(simTick / 10) * 20) * 100) / 100;
      robotState.distance.obstacle = robotState.distance.cm < 15;
      client.publish(topics.statDistance, JSON.stringify(robotState.distance));
    }
    
    // Simulate MANUAL mode movement
    if (robotState.mode === 'MANUAL') {
      simulateManualMovement();
    }
    
    // Simulate AUTO mode
    if (robotState.mode === 'AUTO') {
      simulateAutoMode();
    }
    
  }, 100); // 100ms tick
}

function simulateManualMovement() {
  // Simulate encoders in manual mode
  if (robotState.movement !== 'STOP') {
    const pulseIncrement = 0.5;
    
    switch (robotState.movement) {
      case 'FORWARD':
        leftPulses += pulseIncrement;
        rightPulses += pulseIncrement;
        break;
      case 'BACKWARD':
        leftPulses -= pulseIncrement;
        rightPulses -= pulseIncrement;
        break;
      case 'LEFT':
        leftPulses -= pulseIncrement * 0.5;
        rightPulses += pulseIncrement * 0.5;
        break;
      case 'RIGHT':
        leftPulses += pulseIncrement * 0.5;
        rightPulses -= pulseIncrement * 0.5;
        break;
    }
    
    // Calculate distance (PULSES_PER_REV=20, WHEEL_DIAMETER=6.5cm)
    const PULSES_PER_REV = 20;
    const WHEEL_DIAMETER_CM = 6.5;
    const dist_per_pulse = (Math.PI * WHEEL_DIAMETER_CM) / PULSES_PER_REV;
    const avgDistance = ((leftPulses + rightPulses) / 2.0) * dist_per_pulse;
    
    // Publish encoder data (for display in manual mode)
    if (simTick % 5 === 0) {
      client.publish(topics.statAuto, JSON.stringify({
        state: 'MANUAL_ACTIVE',
        row: 0,
        yaw: Math.round(yawIntegration * 10) / 10,
        left_dist_cm: Math.round(Math.abs(leftPulses * dist_per_pulse) * 10) / 10,
        right_dist_cm: Math.round(Math.abs(rightPulses * dist_per_pulse) * 10) / 10,
        coverage_pct: 0
      }));
    }
  }
}

function simulateAutoMode() {
  const ROW_LENGTH_CM = 150.0;
  const ROW_WIDTH_CM = 20.0;
  const MAX_ROWS = 10;
  
  const PULSES_PER_REV = 20;
  const WHEEL_DIAMETER_CM = 6.5;
  const dist_per_pulse = (Math.PI * WHEEL_DIAMETER_CM) / PULSES_PER_REV;
  
  if (robotState.auto.state === 'AUTO_START_ROW') {
    // Reset encoders and yaw
    leftPulses = 0;
    rightPulses = 0;
    yawIntegration = 0;
    robotState.auto.yaw = 0;
    robotState.auto.state = 'AUTO_MOVING_FORWARD';
    console.log(`   📍 Row ${robotState.auto.row}/${MAX_ROWS}: Moving forward...`);
  }
  
  if (robotState.auto.state === 'AUTO_MOVING_FORWARD') {
    // Simulate forward movement
    const pulseIncrement = 0.3;
    leftPulses += pulseIncrement;
    rightPulses += pulseIncrement;
    
    const avgDistance = ((leftPulses + rightPulses) / 2.0) * dist_per_pulse;
    robotState.auto.left_dist_cm = Math.round(leftPulses * dist_per_pulse * 10) / 10;
    robotState.auto.right_dist_cm = Math.round(rightPulses * dist_per_pulse * 10) / 10;
    
    // Check if reached row length
    if (avgDistance >= ROW_LENGTH_CM) {
      robotState.auto.state = 'AUTO_TURN_90';
      console.log(`   🔄 Reached end of row - turning 90°...`);
    }
    
    // Update coverage (simplified)
    const rowCoverage = (avgDistance / ROW_LENGTH_CM) * 10;
    const totalCoverage = ((robotState.auto.row - 1) * 10) + rowCoverage;
    robotState.auto.coverage_pct = Math.min(Math.round(totalCoverage), 100);
  }
  
  if (robotState.auto.state === 'AUTO_TURN_90') {
    // Simulate 90 degree turn
    yawIntegration += 2.25; // Accumulate 90 degrees over ~40 ticks
    robotState.auto.yaw = Math.round(yawIntegration * 10) / 10;
    
    if (robotState.auto.yaw >= 88) {
      robotState.auto.state = 'AUTO_MOVE_SIDEWAYS';
      yawIntegration = 0;
      leftPulses = 0;
      rightPulses = 0;
      console.log(`   ↔️  Moved sideways between rows...`);
    }
  }
  
  if (robotState.auto.state === 'AUTO_MOVE_SIDEWAYS') {
    // Move sideways ROW_WIDTH_CM
    const pulseIncrement = 0.2;
    leftPulses += pulseIncrement;
    rightPulses += pulseIncrement;
    
    const avgDistance = ((leftPulses + rightPulses) / 2.0) * dist_per_pulse;
    
    if (avgDistance >= ROW_WIDTH_CM) {
      robotState.auto.row++;
      if (robotState.auto.row > MAX_ROWS) {
        robotState.auto.state = 'AUTO_COMPLETE';
        console.log(`   ✅ Cleaning complete! Coverage: ${robotState.auto.coverage_pct}%`);
      } else {
        robotState.auto.state = 'AUTO_START_ROW';
      }
    }
  }
  
  if (robotState.auto.state === 'AUTO_COMPLETE') {
    robotState.auto.coverage_pct = 100;
  }
  
  // Publish auto status every tick
  if (simTick % 3 === 0) {
    client.publish(topics.statAuto, JSON.stringify(robotState.auto));
  }
}

console.log(`
╔════════════════════════════════════════╗
║   🤖 VacBot Simulator Starting...      ║
╚════════════════════════════════════════╝

📋 Configuration:
   Host: ${config.host}
   Port: ${config.port}
   Username: ${config.username}

Connecting to broker...
`);
