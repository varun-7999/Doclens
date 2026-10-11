# Frees the DocuLens backend port when a stale 'node server.js' / nodemon
# instance is still listening (the usual cause of EADDRINUSE).
#
# Usage:  npm run free-port      (or)  powershell -File scripts/free-port.ps1 -Port 5000
param([int]$Port = 5000)

$ErrorActionPreference = 'SilentlyContinue'

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen
if (-not $listeners) {
  Write-Host "Port $Port is already free."
  exit 0
}

foreach ($processId in ($listeners.OwningProcess | Select-Object -Unique)) {
  $proc = Get-Process -Id $processId
  Write-Host ("Stopping pid={0} name={1} holding port {2}" -f $processId, $proc.ProcessName, $Port)

  # If a nodemon supervisor owns this worker it would respawn it, so stop that too.
  $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$processId").ParentProcessId
  if ($parentId) {
    $parentCmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$parentId").CommandLine
    if ($parentCmd -match 'nodemon') {
      Stop-Process -Id $parentId -Force
    }
  }

  Stop-Process -Id $processId -Force
}

Start-Sleep -Milliseconds 500
if (Get-NetTCPConnection -LocalPort $Port -State Listen) {
  Write-Host "Port $Port is still in use."
} else {
  Write-Host "Port $Port is now free."
}