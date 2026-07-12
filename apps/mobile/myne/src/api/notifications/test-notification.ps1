$body = Get-Content -Raw -Path "payload.json"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiamx5d3ZmeGd1Znh4bnRnZ3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM0NzEzMTQsImV4cCI6MjAzOTA0NzMxNH0.CV5AKgWx4FT_yVyBr40xmqVCj5DJCXBXgT0WTcevfME"
    "Content-Type" = "application/json"
}

Invoke-RestMethod `
    -Method Post `
    -Uri "https://sbjlywvfxgufxxntggxu.supabase.co/functions/v1/send-notification" `
    -Headers $headers `
    -Body $body