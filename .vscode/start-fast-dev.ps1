$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$appDir = Join-Path $repoRoot 'app'
$exePath = Join-Path $repoRoot 'bin\x64\Debug\net472\ConverseTek.exe'
$viteUrl = 'http://127.0.0.1:5173/'

function Test-ViteServer {
  try {
    Invoke-WebRequest -Uri $viteUrl -UseBasicParsing -TimeoutSec 1 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Test-ConverseTekViteServer {
  try {
    Invoke-WebRequest -Uri "$($viteUrl)src/App.tsx" -UseBasicParsing -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Get-ViteServerProcessId {
  try {
    $connection = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 5173 -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($null -ne $connection) {
      return $connection.OwningProcess
    }
  } catch {
    return $null
  }

  return $null
}

if (-not (Test-Path $exePath)) {
  throw "ConverseTek.exe was not found at $exePath. Run CT: Build All or CT: Build Server first."
}

$viteServerRunning = Test-ViteServer
$viteServerHealthy = $viteServerRunning -and (Test-ConverseTekViteServer)

if ($viteServerRunning -and -not $viteServerHealthy) {
  $viteProcessId = Get-ViteServerProcessId
  if ($null -eq $viteProcessId) {
    throw "Something is listening at $viteUrl, but it is not serving a healthy ConverseTek Vite app. Stop that process and run this task again."
  }

  Write-Host "Stopping stale or unhealthy Vite dev server on $viteUrl (PID $viteProcessId)"
  Stop-Process -Id $viteProcessId -Force

  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline -and (Test-ViteServer)) {
    Start-Sleep -Milliseconds 250
  }

  if (Test-ViteServer) {
    throw "Timed out waiting for stale Vite process $viteProcessId to release $viteUrl."
  }

  $viteServerRunning = $false
  $viteServerHealthy = $false
}

if (-not $viteServerRunning) {
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($null -eq $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction Stop
  }

  Write-Host "Starting Vite dev server at $viteUrl"
  $viteProcess = Start-Process -FilePath $npmCommand.Source -ArgumentList 'start' -WorkingDirectory $appDir -WindowStyle Hidden -PassThru

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    if (Test-ViteServer) {
      break
    }

    if ($viteProcess.HasExited) {
      throw "Vite exited before $viteUrl became available."
    }

    Start-Sleep -Milliseconds 500
  }

  if (-not (Test-ConverseTekViteServer)) {
    throw "Timed out waiting for a healthy ConverseTek Vite app at $viteUrl."
  }
} else {
  Write-Host "Using existing Vite dev server at $viteUrl"
}

$env:CT_WEB_URL = $viteUrl

try {
  Write-Host "Starting ConverseTek with CT_WEB_URL=$viteUrl"
  & $exePath
  if ($LASTEXITCODE -ne $null) {
    exit $LASTEXITCODE
  }
} finally {
  Remove-Item Env:\CT_WEB_URL -ErrorAction SilentlyContinue
}
