[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$AllowDirty,
    [switch]$SkipInstall,
    [string]$ExpectedCommit
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

function Get-RelevantGitStateFingerprint {
    $records = @()
    foreach ($relativePath in @(Get-RelevantGitChanges)) {
        $indexEntry = (& git ls-files --stage -- $relativePath | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) { throw "Unable to inspect Git index state: $relativePath" }

        $absolutePath = Join-Path $PSScriptRoot $relativePath
        if (Test-Path -LiteralPath $absolutePath -PathType Leaf) {
            $worktreeHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $absolutePath).Hash
        }
        elseif (Test-Path -LiteralPath $absolutePath -PathType Container) {
            $worktreeHash = 'DIRECTORY'
        }
        else {
            $worktreeHash = 'MISSING'
        }

        $records += "$relativePath|$indexEntry|$worktreeHash"
    }

    $text = $records -join "`n"
    $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '') }
    finally { $sha.Dispose() }
}

function Get-GitCommit {
    param([Parameter(Mandatory = $true)][string]$Revision)

    $commit = (& git rev-parse "$Revision`^{commit}").Trim()
    if ($LASTEXITCODE -ne 0 -or $commit -notmatch '^[0-9a-f]{40}$') {
        throw "Unable to resolve Git commit: $Revision"
    }
    return $commit
}

function Test-LiveEndpoint {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$Pattern
    )

    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 30
    if ($response.StatusCode -ne 200) {
        throw "Live verification returned HTTP $($response.StatusCode): $Url"
    }
    if ([string]$response.Content -notmatch $Pattern) {
        throw "Live verification content check failed: $Url"
    }
    Write-Host "Live verification passed: $Url" -ForegroundColor Green
}

if ($AllowDirty -and -not $DryRun) {
    throw '-AllowDirty is only permitted together with -DryRun.'
}

foreach ($requiredCommand in @('git', 'node', 'npm')) {
    if (-not (Get-Command $requiredCommand -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $requiredCommand"
    }
}

$originUrl = (& git remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $originUrl -notmatch 'caoguangcheng9-lgtm/begapunk-website(?:\.git)?$') {
    throw "Unexpected Git origin. Refusing deployment from: $originUrl"
}

$nodeVersionText = (& node --version).TrimStart('v')
$nodeMajor = [int]($nodeVersionText.Split('.')[0])
if ($nodeMajor -lt 22) {
    throw "Node.js 22 or newer is required. Detected: $nodeVersionText"
}

$initialChanges = @(Get-RelevantGitChanges)
$initialStateFingerprint = Get-RelevantGitStateFingerprint
if ($initialChanges.Count -gt 0 -and -not ($DryRun -and $AllowDirty)) {
    Write-Host 'Deployment stopped because the website source has uncommitted changes:' -ForegroundColor Red
    $initialChanges | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }
    if ($initialChanges.Count -gt 30) {
        Write-Host "  ... and $($initialChanges.Count - 30) more change(s)"
    }
    throw 'Commit the intended website release before deployment. catalog-project remains excluded.'
}

if (-not ($DryRun -and $AllowDirty)) {
    $branch = (& git branch --show-current).Trim()
    if ($branch -ne 'main') {
        throw "Clean deployment validation is allowed only from main. Current branch: $branch"
    }

    Invoke-CheckedCommand git fetch origin main

    $headCommit = Get-GitCommit 'HEAD'
    $remoteMainCommit = Get-GitCommit 'refs/remotes/origin/main'
    if ($headCommit -ne $remoteMainCommit) {
        throw "Local main is not synchronized with origin/main. Local: $headCommit Remote: $remoteMainCommit"
    }

    if ($ExpectedCommit) {
        if ($ExpectedCommit -notmatch '^[0-9a-fA-F]{40}$') {
            throw '-ExpectedCommit must be the full 40-character reviewed commit SHA.'
        }
        $reviewedCommit = Get-GitCommit $ExpectedCommit
        if ($headCommit -ne $reviewedCommit) {
            throw "The reviewed commit does not match HEAD. Reviewed: $reviewedCommit HEAD: $headCommit"
        }
    }
    elseif (-not $DryRun) {
        throw 'A real deployment requires -ExpectedCommit with the full reviewed commit SHA.'
    }
}
else {
    Write-Warning 'Dirty dry-run mode is for local build diagnostics only; it is not deployment approval evidence.'
}

if (-not $SkipInstall) {
    Invoke-CheckedCommand npm ci
}

Invoke-CheckedCommand npm run deploy:prepare

$postBuildChanges = @(Get-RelevantGitChanges)
$postBuildStateFingerprint = Get-RelevantGitStateFingerprint
if ($DryRun -and $AllowDirty) {
    if ($postBuildStateFingerprint -ne $initialStateFingerprint) {
        throw 'The build changed the pre-existing dirty working state. Review the differences before continuing.'
    }
}
elseif ($postBuildChanges.Count -gt 0) {
    Write-Host 'Deployment stopped because the build changed committed source files:' -ForegroundColor Red
    $postBuildChanges | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }
    if ($postBuildChanges.Count -gt 30) {
        Write-Host "  ... and $($postBuildChanges.Count - 30) more change(s)"
    }
    throw 'Commit the generated output and run deploy.ps1 again.'
}

if ($DryRun) {
    if ($AllowDirty) {
        Write-Host 'Development dry run passed. The pre-existing dirty state was preserved, no Git tag was created, and no deployment was triggered.' -ForegroundColor Green
    }
    else {
        Write-Host 'Dry run passed. Local main matches origin/main, the build stayed clean, no Git tag was created, and no deployment was triggered.' -ForegroundColor Green
    }
    exit 0
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'GitHub CLI (gh) is required to monitor the exact deployment workflow run.'
}

$headCommit = Get-GitCommit 'HEAD'
$shortSha = $headCommit.Substring(0, 8)
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

$repository = 'caoguangcheng9-lgtm/begapunk-website'
$workflow = 'deploy.yml'
$run = $null

Write-Host "Deployment triggered: $tagName" -ForegroundColor Green
Write-Host 'Waiting for the exact tag-triggered GitHub Actions run...'

for ($attempt = 1; $attempt -le 36; $attempt++) {
    $runJson = & gh run list `
        --repo $repository `
        --workflow $workflow `
        --event push `
        --commit $headCommit `
        --limit 10 `
        --json databaseId,headSha,headBranch,event,status,conclusion,url,createdAt
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to query the GitHub Actions deployment run.'
    }

    $runs = @($runJson | ConvertFrom-Json)
    $run = $runs | Where-Object {
        $_.headSha -eq $headCommit -and $_.headBranch -eq $tagName -and $_.event -eq 'push'
    } | Sort-Object createdAt -Descending | Select-Object -First 1

    if ($run) { break }
    Start-Sleep -Seconds 5
}

if (-not $run) {
    throw "The deployment tag was pushed, but its GitHub Actions run could not be identified. Inspect the Actions page before taking any further action: https://github.com/$repository/actions"
}

Write-Host "Monitoring deployment run: $($run.url)"
Invoke-CheckedCommand gh run watch ([string]$run.databaseId) --repo $repository --exit-status

$liveChecks = @(
    @{ Url = 'https://www.begapunk.com/'; Pattern = '(?i)<html|<!doctype html|BEGAPUNK' },
    @{ Url = 'https://www.begapunk.com/de/'; Pattern = '(?i)<html|<!doctype html|BEGAPUNK' },
    @{ Url = 'https://www.begapunk.com/ja/'; Pattern = '(?i)<html|<!doctype html|BEGAPUNK' },
    @{ Url = 'https://www.begapunk.com/ru/'; Pattern = '(?i)<html|<!doctype html|BEGAPUNK' },
    @{ Url = 'https://www.begapunk.com/BP-2P-50-0001.html'; Pattern = '(?i)BP-2P-50-0001' },
    @{ Url = 'https://www.begapunk.com/search.html'; Pattern = '(?i)<html|<!doctype html|BEGAPUNK' },
    @{ Url = 'https://www.begapunk.com/js/vendor/fuse.min.js'; Pattern = '(?i)Fuse' }
)

foreach ($check in $liveChecks) {
    Test-LiveEndpoint -Url $check.Url -Pattern $check.Pattern
}

Write-Host "Deployment completed and verified: $tagName ($headCommit)" -ForegroundColor Green
