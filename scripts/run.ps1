param([Parameter(Position=0)][string]$Task = 'dev')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$originalPath = $env:PATH
try {
  if (Test-Path -LiteralPath (Join-Path $bundledNode 'node.exe')) {
    $env:PATH = "$bundledNode;$originalPath"
  }
  $version = node -p 'process.versions.node'
  if (-not $version.StartsWith('24.')) { throw "Node 24 LTS gerekli. Mevcut: $version. nvm use 24 ile seçin." }
  $npmDirectory = Split-Path -Parent (Get-Command npm.cmd).Source
  $npmCli = Join-Path $npmDirectory 'node_modules\npm\bin\npm-cli.js'
  if (-not (Test-Path -LiteralPath $npmCli)) { throw 'npm CLI bulunamadı; Node 24 ve npm kurulumu gerekli.' }
  Push-Location $taskRoot
  try {
    if ($Task -eq 'install') { node $npmCli install }
    elseif ($Task -eq 'ci') { node $npmCli ci }
    else { node $npmCli run $Task }
    $taskExitCode = $LASTEXITCODE
  } finally { Pop-Location }
} finally { $env:PATH = $originalPath }
exit $taskExitCode
