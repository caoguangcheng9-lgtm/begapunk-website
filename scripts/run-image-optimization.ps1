$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $node) {
    $portableNode = Join-Path $env:USERPROFILE 'Documents\Codex\tools\node-v24.18.0-win-x64\node.exe'
    if (Test-Path -LiteralPath $portableNode) {
        $node = $portableNode
    }
}

if (-not $node) {
    throw 'Node.js 22 or newer is required to optimize images.'
}

Push-Location $projectRoot
try {
    & $node 'scripts\optimize-images.mjs' --write
    if ($LASTEXITCODE -ne 0) { throw 'Image optimization failed.' }

    & $node 'scripts\verify-optimized-images.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Optimized image verification failed.' }

    & $node 'scripts\generate-social-images.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Social sharing image generation failed.' }

    & $node 'scripts\verify-social-images.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Social sharing image verification failed.' }
}
finally {
    Pop-Location
}
