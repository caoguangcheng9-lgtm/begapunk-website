[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$AllowDirty,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
    }
}

function Get-RelevantGitChanges {
    $paths = @()
    $paths += @(& git diff --name-only --no-ext-diff)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read unstaged Git changes.' }
    $paths += @(& git diff --cached --name-only --no-ext-diff)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read staged Git changes.' }
    $paths += @(& git ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read untracked Git files.' }

    return @($paths | Sort-Object -Unique | Where-Object {
        -not ($_ -eq 'catalog-project' -or $_.StartsWith('catalog-project/'))
    })
}

if ($AllowDirty -and -not $DryRun) {
    throw '-AllowDirty is only permitted together with -DryRun.'
}

foreach ($requiredCommand in @('git', 'node', 'npm')) {
    if (-not (Get-Command $requiredCommand -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $requiredCommand"
    }
}

$nodeVersionText = (& node --version).TrimStart('v')
$nodeMajor = [int]($nodeVersionText.Split('.')[0])
if ($nodeMajor -lt 22) {
    throw "Node.js 22 or newer is required. Detected: $nodeVersionText"
}

$initialChanges = @(Get-RelevantGitChanges)
if ($initialChanges.Count -gt 0 -and -not ($DryRun -and $AllowDirty)) {
    Write-Host 'Deployment stopped because the website source has uncommitted changes:' -ForegroundColor Red
    $initialChanges | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }
    if ($initialChanges.Count -gt 30) {
        Write-Host "  ... and $($initialChanges.Count - 30) more change(s)"
    }
    throw 'Commit the intended website release before deployment. catalog-project remains excluded.'
}

if (-not $DryRun) {
    $branch = (& git branch --show-current).Trim()
    if ($branch -ne 'main') {
        throw "Production deployment is allowed only from main. Current branch: $branch"
    }
}

if (-not $SkipInstall) {
    Invoke-CheckedCommand npm ci
}

Invoke-CheckedCommand npm run deploy:prepare

if ($DryRun) {
    Write-Host 'Dry run passed. No Git tag was created and no deployment was triggered.' -ForegroundColor Green
    exit 0
}

$postBuildChanges = @(Get-RelevantGitChanges)
if ($postBuildChanges.Count -gt 0) {
    Write-Host 'Deployment stopped because the build changed committed source files:' -ForegroundColor Red
    $postBuildChanges | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }
    if ($postBuildChanges.Count -gt 30) {
        Write-Host "  ... and $($postBuildChanges.Count - 30) more change(s)"
    }
    throw 'Commit the generated output and run deploy.ps1 again.'
}

Invoke-CheckedCommand git fetch origin main
Invoke-CheckedCommand git push origin main

$shortSha = (& git rev-parse --short=8 HEAD).Trim()
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$tagName = "deploy-$timestamp-$shortSha"

Invoke-CheckedCommand -Command git -Arguments @(
    'tag', '-a', $tagName, '-m', "Deploy Begapunk production $shortSha"
)
try {
    Invoke-CheckedCommand git push origin "refs/tags/$tagName"
}
catch {
    & git tag -d $tagName | Out-Null
    throw
}

Write-Host "Deployment triggered: $tagName" -ForegroundColor Green
Write-Host 'Progress: https://github.com/caoguangcheng9-lgtm/begapunk-website/actions'
