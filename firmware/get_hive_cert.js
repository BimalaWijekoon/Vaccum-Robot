#!/usr/bin/env node

// ============================================================================
// HiveMQ Certificate Extractor (Node.js)
// ============================================================================
// Fetches the TLS certificate from your HiveMQ broker and outputs PEM format
// Usage: node get_hive_cert.js
// ============================================================================

const tls = require('tls');
const fs = require('fs');

const MQTT_HOST = "0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud";
const MQTT_PORT = 8883;

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║      HiveMQ Certificate Extractor for Arduino        ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

console.log(`🔍 Connecting to ${MQTT_HOST}:${MQTT_PORT}...\n`);

// Fetch the certificate
const socket = tls.connect(MQTT_PORT, MQTT_HOST, { rejectUnauthorized: false }, () => {
  try {
    const cert = socket.getPeerCertificate(false);
    
    if (!cert || !cert.raw) {
      console.error("❌ Could not retrieve certificate!");
      process.exit(1);
    }

    console.log("✅ Certificate retrieved!\n");
    console.log("Certificate Details:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Subject: ${JSON.stringify(cert.subject)}`);
    console.log(`Issuer: ${JSON.stringify(cert.issuer)}`);
    console.log(`Valid From: ${cert.valid_from}`);
    console.log(`Valid To: ${cert.valid_to}`);
    console.log(`Fingerprint: ${cert.fingerprint}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Convert to PEM format
    const certPEM = cert.raw.toString('base64');
    const pemCert = `-----BEGIN CERTIFICATE-----\n${certPEM.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
    
    console.log("PEM Certificate (copy for Arduino):\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(pemCert);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // Save to file
    const filePath = `${__dirname}/hivemq_cert.pem`;
    fs.writeFileSync(filePath, pemCert);
    console.log(`✅ Certificate saved to: ${filePath}\n`);
    
    // Show how to use it
    console.log("📝 How to use in Arduino code:\n");
    console.log("1. Copy the PEM certificate above");
    console.log("2. Replace ROOT_CA in test_mock.cpp or main.cpp");
    console.log("3. Format:");
    console.log(`   static const char* ROOT_CA PROGMEM = R"EOF(`);
    console.log(`   [PASTE CERTIFICATE HERE]`);
    console.log(`   )EOF";`);
    console.log("");
    
    socket.end();
  } catch (err) {
    console.error(`❌ Error processing certificate: ${err.message}`);
    process.exit(1);
  }
});

socket.on('error', (err) => {
  console.error(`❌ Connection error: ${err.message}\n`);
  console.log("🔧 This usually means:");
  console.log("  • Network connectivity issue");
  console.log("  • HiveMQ broker is unreachable");
  console.log("  • Firewall blocking port 8883\n");
  process.exit(1);
});

socket.on('timeout', () => {
  console.error("❌ Connection timeout!");
  process.exit(1);
});

