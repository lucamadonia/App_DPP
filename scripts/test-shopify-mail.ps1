# Smoke-Test für die neuen Shopify-Mail-Templates auf Family-Joy.
# Schickt einen order_confirmation Event POST an mail-event-receiver.
#
# Voraussetzung: aus App_DPP root ausführen.
#   .\scripts\test-shopify-mail.ps1

$ErrorActionPreference = "Stop"

# Read secrets from both repos' .env files
$secret = ((Get-Content .env | Where-Object { $_ -match 'VITE_MAIL_HUB_SECRET=' }) -split 'VITE_MAIL_HUB_SECRET=', 2)[1].Trim()

$famblissEnv = "C:\Users\luca\Projects\fambliss-family-joy\.env"
if (-not (Test-Path $famblissEnv)) {
  Write-Host "ERROR: Family-Joy .env not found at $famblissEnv" -ForegroundColor Red
  exit 1
}
$anonLine = Get-Content $famblissEnv | Where-Object { $_ -match 'VITE_SUPABASE_ANON_KEY=' } | Select-Object -First 1
if (-not $anonLine) {
  Write-Host "ERROR: VITE_SUPABASE_ANON_KEY not found in Family-Joy .env" -ForegroundColor Red
  exit 1
}
$anonKey = ($anonLine -split 'VITE_SUPABASE_ANON_KEY=', 2)[1].Trim()

Write-Host "Secret loaded (length: $($secret.Length))" -ForegroundColor Cyan
Write-Host "Anon key loaded (length: $($anonKey.Length))" -ForegroundColor Cyan
Write-Host ""

# Build the payload
$payload = @{
  eventType     = "order_confirmation"
  source        = "family-joy-internal"
  sourceEventId = "smoketest-orderconf-$(Get-Date -Format 'yyyyMMddHHmmss')"
  recipientEmail = "luca@madonia-freiburg.de"
  language      = "de"
  userType      = "customer"
  context       = @{
    customer_first_name  = "Luca"
    order_number         = "#TEST-9999"
    order_date_formatted = "20. Mai 2026"
    order_total          = "152.99"
    order_currency       = "EUR"
    shipping_address     = "Luca Madonia`nMusterstrasse 1`n79112 Freiburg`nGermany"
    # Pre-rendered line_items HTML (the dispatcher produces this from
    # line_items[]; smoke test mirrors what production payloads look like).
    line_items_html      = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;border-collapse:collapse;"><tr style="border-bottom:1px solid #f0e8db;"><td valign="middle" width="60" style="padding:14px 0;width:60px;"><img src="https://cdn.shopify.com/s/files/1/1053/4653/1677/files/FAMBLISS_Real_Leere_Wand_Frontal_1_d88ffe28-a85c-4d6d-9178-a1fb4b476e58.png" alt="" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #e8ede4;"/></td><td valign="middle" style="padding:14px 12px;color:#2d3a2e;font-size:14px;line-height:1.4;font-family:-apple-system,Inter,Arial,sans-serif;"><strong>Magnetwand</strong></td><td valign="middle" align="center" style="padding:14px 8px;color:#5a6b5c;font-size:13px;font-family:-apple-system,Inter,Arial,sans-serif;">1x</td><td valign="middle" align="right" style="padding:14px 0;color:#2d3a2e;font-size:14px;font-weight:600;font-family:-apple-system,Inter,Arial,sans-serif;">59.99 EUR</td></tr><tr style="border-bottom:1px solid #f0e8db;"><td valign="middle" width="60" style="padding:14px 0;width:60px;"><img src="https://cdn.shopify.com/s/files/1/1053/4653/1677/files/FamBliss_Karten_Fliegend_Dynamisch.png" alt="" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #e8ede4;"/></td><td valign="middle" style="padding:14px 12px;color:#2d3a2e;font-size:14px;line-height:1.4;font-family:-apple-system,Inter,Arial,sans-serif;"><strong>Magnetische Routinekarten</strong></td><td valign="middle" align="center" style="padding:14px 8px;color:#5a6b5c;font-size:13px;font-family:-apple-system,Inter,Arial,sans-serif;">1x</td><td valign="middle" align="right" style="padding:14px 0;color:#2d3a2e;font-size:14px;font-weight:600;font-family:-apple-system,Inter,Arial,sans-serif;">39.99 EUR</td></tr><tr><td valign="middle" width="60" style="padding:14px 0;width:60px;"><img src="https://cdn.shopify.com/s/files/1/1053/4653/1677/files/10_FloatingPucks.png" alt="" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #e8ede4;"/></td><td valign="middle" style="padding:14px 12px;color:#2d3a2e;font-size:14px;line-height:1.4;font-family:-apple-system,Inter,Arial,sans-serif;"><strong>Routinen Lichter</strong></td><td valign="middle" align="center" style="padding:14px 8px;color:#5a6b5c;font-size:13px;font-family:-apple-system,Inter,Arial,sans-serif;">1x</td><td valign="middle" align="right" style="padding:14px 0;color:#2d3a2e;font-size:14px;font-weight:600;font-family:-apple-system,Inter,Arial,sans-serif;">69.99 EUR</td></tr></table>'
  }
}
$body = $payload | ConvertTo-Json -Compress -Depth 5

Write-Host "Payload body (bytes: $($body.Length)):" -ForegroundColor Cyan
Write-Host $body -ForegroundColor DarkGray
Write-Host ""

# Compute HMAC-SHA256
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($secret)
$sigBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body))
$sig = ($sigBytes | ForEach-Object { $_.ToString("x2") }) -join ''
Write-Host "Computed signature: $($sig.Substring(0, 16))..." -ForegroundColor Cyan

# POST
Write-Host ""
Write-Host "POST https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver" -ForegroundColor Yellow

try {
  $response = Invoke-RestMethod `
    -Uri "https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver" `
    -Method POST `
    -Headers @{
      "Content-Type"     = "application/json"
      "X-Hook-Signature" = $sig
      "Authorization"    = "Bearer $anonKey"
    } `
    -Body $body
  Write-Host ""
  Write-Host "SUCCESS:" -ForegroundColor Green
  $response | ConvertTo-Json
} catch {
  Write-Host ""
  Write-Host "FAILED:" -ForegroundColor Red
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $errorBody = $reader.ReadToEnd()
  Write-Host "Body: $errorBody" -ForegroundColor Red
}
