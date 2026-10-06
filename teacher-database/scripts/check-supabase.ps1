# Read-only checks using the system proxy. No writes or row contents in output.
# Run from PowerShell 7: ./scripts/check-supabase.ps1
$ErrorActionPreference = 'Stop'
$probeEnv = @{}
$probeEnvFile = Join-Path $PSScriptRoot '../.env.local'
if (Test-Path -LiteralPath $probeEnvFile) {
  foreach ($line in Get-Content -LiteralPath $probeEnvFile) {
    if ($line -match '^([A-Z_]+)=(.*)$') { $probeEnv[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'") }
  }
}
foreach ($name in @('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ($value) { $probeEnv[$name] = $value }
  if (-not $probeEnv[$name]) { throw "Missing configuration: $name" }
}
$probeBase = $probeEnv['NEXT_PUBLIC_SUPABASE_URL'].TrimEnd('/')
$probeHeaders = @{ apikey = $probeEnv['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] }
$probeChecks = @(@{ name = 'auth settings'; path = '/auth/v1/settings' })
foreach ($table in @('users', 'classes', 'class_members', 'experiments', 'tasks', 'reports')) {
  $probeChecks += @{ name = $table; path = "/rest/v1/${table}?select=*&limit=1" }
}
$probeChecks += @{ name = 'report lifecycle columns'; path = '/rest/v1/reports?select=id,submitted_at,graded_at&limit=0' }
$probeChecks += @{ name = 'teacher RPC (GET)'; path = '/rest/v1/rpc/is_teacher' }
$probeResults = foreach ($check in $probeChecks) {
  try {
    $response = Invoke-WebRequest -Uri ($probeBase + $check.path) -Headers $probeHeaders -TimeoutSec 15 -SkipHttpErrorCheck
    $body = $null
    try { $body = ConvertFrom-Json -InputObject $response.Content -NoEnumerate } catch { }
    $result = [ordered]@{ check = $check.name; status = [int]$response.StatusCode }
    if ($body -is [array]) { $result.anonymousRowsReturned = $body.Count }
    if ($response.StatusCode -ge 400) { $result.code = $body.code; $result.message = $body.message }
    if ($check.name -eq 'teacher RPC (GET)' -and $body -is [bool]) { $result.result = $body }
    [pscustomobject]$result
  } catch {
    [pscustomobject]@{ check = $check.name; error = $_.Exception.Message }
  }
}
[pscustomobject]@{
  checkedAt = [DateTime]::UtcNow.ToString('o')
  project = ([Uri]$probeBase).Host
  results = @($probeResults)
} | ConvertTo-Json -Depth 5
# An empty result alone cannot prove that RLS is enabled.
if (@($probeResults | Where-Object { $_.error -or $_.status -ge 500 -or $_.anonymousRowsReturned -gt 0 }).Count) { exit 1 }
