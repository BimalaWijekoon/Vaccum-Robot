# ============================================================================
# HiveMQ Certificate Extractor (PowerShell)
# ============================================================================
# Fetches the TLS certificate from your HiveMQ broker
# Usage: .\get_hive_cert.ps1
# ============================================================================

$MQTT_HOST = "0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud"
$MQTT_PORT = 8883

Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      HiveMQ Certificate Extractor (PowerShell)       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔍 Connecting to $MQTT_HOST`:$MQTT_PORT..." -ForegroundColor Yellow
Write-Host ""

# Create TCP connection
$tcpClient = New-Object System.Net.Sockets.TcpClient
$tcpClient.Connect($MQTT_HOST, $MQTT_PORT)

# Create SSL stream
$sslStream = New-Object System.Net.Security.SslStream $tcpClient.GetStream()

try {
    $sslStream.AuthenticateAsClient($MQTT_HOST)
    
    # Get the certificate
    $cert = $sslStream.RemoteCertificate
    
    Write-Host "✅ Certificate retrieved!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Certificate Details:" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host "Subject: $($cert.Subject)" -ForegroundColor White
    Write-Host "Issuer: $($cert.Issuer)" -ForegroundColor White
    Write-Host "Not Before: $($cert.NotBefore)" -ForegroundColor White
    Write-Host "Not After: $($cert.NotAfter)" -ForegroundColor White
    Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""
    
    # Export certificate to PEM format
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certB64 = [System.Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    
    # Create PEM file
    $pemContent = "-----BEGIN CERTIFICATE-----`n$certB64`n-----END CERTIFICATE-----"
    
    # Save to file
    $pemPath = "$PSScriptRoot\hivemq_cert.pem"
    $pemContent | Out-File -FilePath $pemPath -Encoding ASCII
    
    Write-Host "✅ Certificate saved to: $pemPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "PEM Certificate (copy this for Arduino):" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host $pemContent -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $sslStream.Close()
    $tcpClient.Close()
}

Write-Host "📋 How to use this certificate in Arduino code:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Copy the PEM certificate content (above)" -ForegroundColor Gray
Write-Host "2. Replace the ROOT_CA string in test_mock.cpp (lines 36-66)" -ForegroundColor Gray
Write-Host "3. Or replace in main.cpp (lines 75-96)" -ForegroundColor Gray
Write-Host ""
