# 🔐 HiveMQ Certificate Extraction Guide

Your test firmware is failing because the hardcoded TLS certificate might be outdated or incorrect. Here's how to get the **current certificate directly from HiveMQ**.

---

## **Method 1: PowerShell (Windows) — EASIEST** ✅

### Step 1: Run the extraction script

```powershell
cd g:\Vaccum-Robot\firmware
.\get_hive_cert.ps1
```

You'll see output like:

```
✅ Certificate retrieved!

Certificate Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: CN=*.s1.eu.hivemq.cloud
Issuer: CN=Amazon RSA 2048 M01
Not Before: 2024-01-15...
Not After: 2025-01-15...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Certificate saved to: g:\Vaccum-Robot\firmware\hivemq_cert.pem

PEM Certificate (copy this for Arduino):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-----BEGIN CERTIFICATE-----
MIIEozCCBIugAwIBAgIQJa+rXB8...
[... lots of base64 data ...]
xyz123==
-----END CERTIFICATE-----
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Copy the certificate

Copy **everything** from:
```
-----BEGIN CERTIFICATE-----
```
to:
```
-----END CERTIFICATE-----
```

---

## **Method 2: OpenSSL Command (if above fails)**

If you have OpenSSL installed on Windows:

```powershell
openssl s_client -connect 0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud:8883 -showcerts
```

This will display certificates. Copy the **last certificate** (root CA).

---

## **Method 3: Online Tool**

Use a free online certificate checker:

1. Go to https://www.sslshopper.com/ssl-checker.html
2. Enter: `0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud:8883`
3. Click "Check SSL"
4. Look for the certificate under "Certificate Details"
5. Click "Download Certificate" and choose "PEM format"

---

## **Step 3: Update Arduino Code**

Once you have the certificate, update **both files**:

### **For test_mock.cpp (line 36-66):**

```cpp
// TLS Root Certificate (ISRG Root X1)
static const char* ROOT_CA PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
[PASTE YOUR CERTIFICATE HERE]
-----END CERTIFICATE-----
)EOF";
```

### **For main.cpp (line 75-96):**

Same format - replace the entire ROOT_CA block.

---

## **Step 4: Test Connection**

Upload the updated firmware:

```bash
cd g:\Vaccum-Robot\firmware
platformio run --target upload -e esp32-s3-devkitc-1
```

Watch serial monitor - should now show:

```
[WIFI] ✅ Connected!
[MQTT] Attempting connection...
[MQTT] DNS resolved: 52.x.x.x
[MQTT] Starting TLS handshake...
[MQTT] ✅ CONNECTED SUCCESSFULLY!
```

---

## **Troubleshooting**

### **Still failing with state -2?**

The certificate might not be correct. Try:

1. **Use `setInsecure()` temporarily** (in test_mock.cpp, the fallback already does this)
2. If insecure mode **works**, then it's definitely a cert issue
3. Re-run the PowerShell script to get a fresh certificate

### **PowerShell script doesn't work?**

Try the OpenSSL method instead:

```powershell
# Windows PowerShell
openssl s_client -connect 0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud:8883 < $null 2>$null | openssl x509 -outform PEM
```

### **Still no luck?**

As a last resort, use insecure mode (not recommended for production):

```cpp
// In setup(), replace:
// secureClient.setCACert(ROOT_CA);

// With:
secureClient.setInsecure();  // Accept any certificate
```

---

## **Which Certificate to Use?**

You might see multiple certificates in the chain. Here's what to use:

| Certificate | Use For |
|------------|---------|
| **Server certificate** (e.g., `*.s1.eu.hivemq.cloud`) | ✅ Use this one |
| **Intermediate** (e.g., `Amazon RSA 2048 M01`) | Also works |
| **Root CA** (e.g., `Amazon Root CA`) | Also works |

They should all work, but if one fails, try another.

---

## **Next Steps**

1. Run the PowerShell script
2. Copy the certificate
3. Update test_mock.cpp with the new cert
4. Upload and test
5. Once working, update main.cpp with the same cert

Good luck! 🚀
