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

if (-not (Test-Path $exePath)) {
  throw "ConverseTek.exe was not found at $exePath. Run CT: Build All or CT: Build Server first."
}

$viteServerRunning = Test-ViteServer

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

  if (-not (Test-ViteServer)) {
    throw "Timed out waiting for Vite at $viteUrl."
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
