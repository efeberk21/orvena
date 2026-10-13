$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) { $taskNode = (Get-Command node.exe).Source }
if (-not ((& $taskNode -p 'process.versions.node').StartsWith('24.'))) { throw 'Use Node 24 before starting the demo.' }
$taskLogs = Join-Path $taskRoot '.local\demo'
New-Item -ItemType Directory -Force -Path $taskLogs | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'apps\relayer\dist\index.js'))) { throw 'Run scripts/run.ps1 build first.' }
$env:ORVENA_MODE = ''
$env:SERVE_WEB = '0'
$taskServices = @(
  @{ Name='relayer'; Port=3001; Directory=$taskRoot; Arguments=@(('"' + (Join-Path $taskRoot 'apps\relayer\dist\index.js') + '"')) },
  @{ Name='web'; Port=5173; Directory=(Join-Path $taskRoot 'apps\web'); Arguments=@(('"' + (Join-Path $taskRoot 'node_modules\vite\bin\vite.js') + '"'),'--host','localhost','--port','5173','--strictPort') },
  @{ Name='publisher'; Port=5180; Directory=(Join-Path $taskRoot 'apps\dapp'); Arguments=@(('"' + (Join-Path $taskRoot 'node_modules\vite\bin\vite.js') + '"'),'--host','localhost','--port','5180','--strictPort') }
)
$taskStarted = @()
foreach ($taskService in $taskServices) {
  $taskListening = $false
  $taskProbePath = if ($taskService.Name -eq 'relayer') { '/api/health' } else { '/' }
  try { $taskProbe = Invoke-WebRequest -Uri "http://localhost:$($taskService.Port)$taskProbePath" -TimeoutSec 3 -UseBasicParsing; $taskListening = $taskProbe.StatusCode -eq 200 } catch {}
  if (-not $taskListening) {
    $taskProcess = Start-Process -FilePath $taskNode -ArgumentList $taskService.Arguments -WorkingDirectory $taskService.Directory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs "$($taskService.Name).log") -RedirectStandardError (Join-Path $taskLogs "$($taskService.Name).error.log") -PassThru
    $taskStarted += @{ Name=$taskService.Name; Port=$taskService.Port; Pid=$taskProcess.Id }
  }
}
if ($taskStarted.Count -gt 0) { $taskStarted | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskLogs 'processes.json') -Encoding UTF8 }
$taskReady = $false
$taskStartupDeadline = [DateTime]::UtcNow.AddSeconds(45)
while ([DateTime]::UtcNow -lt $taskStartupDeadline) {
  try {
    $taskHealth = Invoke-RestMethod -Uri 'http://localhost:3001/api/health' -TimeoutSec 3
    $taskWeb = Invoke-WebRequest -Uri 'http://localhost:5173/' -TimeoutSec 3 -UseBasicParsing
    $taskPublisher = Invoke-WebRequest -Uri 'http://localhost:5180/' -TimeoutSec 3 -UseBasicParsing
    if ($taskHealth.service -eq 'orvena-relayer' -and $taskHealth.chainId -eq 10143 -and $taskHealth.sponsorshipReady -and $taskWeb.Content -match 'Orvena' -and $taskPublisher.Content -match 'Orvena') { $taskReady = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 250
}
if (-not $taskReady) { throw 'Demo startup did not complete. Check .local/demo/*.error.log and port conflicts.' }
Write-Output 'Ready: http://localhost:5173 — approval app and original lock landing.'
Write-Output 'Publisher SDK example: http://localhost:5180.'
Write-Output 'Services run in hidden background processes; logs are in .local/demo.'
