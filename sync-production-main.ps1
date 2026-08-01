[CmdletBinding()]
param(
    [string]$BackupRoot = 'E:\begapunk-offline-backups',
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

function Get-Commit {
    param([Parameter(Mandatory = $true)][string]$Revision)

    $commit = (& git rev-parse "$Revision`^{commit}").Trim()
    if ($LASTEXITCODE -ne 0 -or $commit -notmatch '^[0-9a-f]{40}$') {
        throw "Unable to resolve Git commit: $Revision"
    }
    return $commit
}

foreach ($requiredCommand in @('git', 'node', 'npm')) {
    if (-not (Get-Command $requiredCommand -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $requiredCommand"
    }
}

$repositoryRoot = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$resolvedBackupRoot = [IO.Path]::GetFullPath($BackupRoot).TrimEnd('\')
if ($resolvedBackupRoot.Equals($repositoryRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $resolvedBackupRoot.StartsWith("$repositoryRoot\", [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The offline backup root must be outside the Git repository.'
}

$branch = (& git branch --show-current).Trim()
if ($branch -ne 'main') {
    throw "The independent production copy must be on main. Current branch: $branch"
}

$originUrl = (& git remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $originUrl -notmatch 'caoguangcheng9-lgtm/begapunk-website(?:\.git)?$') {
    throw "Unexpected Git origin: $originUrl"
}

$initialStatus = @(& git status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the Git working tree.' }
if ($initialStatus.Count -gt 0) {
    throw 'The independent production copy is not clean. No synchronization or backup was performed.'
}

Invoke-CheckedCommand git fetch --all --tags --prune

$localBefore = Get-Commit 'HEAD'
$remoteMain = Get-Commit 'refs/remotes/origin/main'
if ($localBefore -ne $remoteMain) {
    & git merge-base --is-ancestor $localBefore $remoteMain
    if ($LASTEXITCODE -ne 0) {
        throw "Local main has diverged from origin/main. Local: $localBefore Remote: $remoteMain"
    }
    Invoke-CheckedCommand git merge --ff-only refs/remotes/origin/main
}

$head = Get-Commit 'HEAD'
$remoteMain = Get-Commit 'refs/remotes/origin/main'
if ($head -ne $remoteMain) {
    throw "Synchronization failed. Local: $head Remote: $remoteMain"
}

if (-not $SkipInstall) {
    Invoke-CheckedCommand npm ci
}
Invoke-CheckedCommand npm run deploy:prepare

$postBuildStatus = @(& git status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the post-build Git working tree.' }
if ($postBuildStatus.Count -gt 0) {
    throw 'The build changed the independent production copy. Offline backup creation was stopped.'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$shortSha = $head.Substring(0, 12)
$backupDirectory = Join-Path $resolvedBackupRoot "$timestamp-$shortSha"
if (Test-Path -LiteralPath $backupDirectory) {
    throw "Backup directory already exists: $backupDirectory"
}
New-Item -ItemType Directory -Force -Path $resolvedBackupRoot | Out-Null
New-Item -ItemType Directory -Path $backupDirectory | Out-Null

$bundlePath = Join-Path $backupDirectory "begapunk-repository-$shortSha.bundle"
Invoke-CheckedCommand git bundle create $bundlePath --all
Invoke-CheckedCommand git bundle verify $bundlePath

$releaseSource = Join-Path $PSScriptRoot 'dist\production'
$releaseZip = Join-Path $backupDirectory "begapunk-release-$shortSha.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory(
    $releaseSource,
    $releaseZip,
    [IO.Compression.CompressionLevel]::Optimal,
    $false
)

$archive = [IO.Compression.ZipFile]::OpenRead($releaseZip)
try {
    foreach ($entry in $archive.Entries) {
        if ([string]::IsNullOrEmpty($entry.Name)) { continue }
        $stream = $entry.Open()
        try { $stream.CopyTo([IO.Stream]::Null) }
        finally { $stream.Dispose() }
    }
}
finally {
    $archive.Dispose()
}

$manifestPath = Join-Path $releaseSource 'manifest.sha256'
$record = [ordered]@{
    project = 'Begapunk Website'
    created_at = (Get-Date).ToString('o')
    commit = $head
    origin_main = $remoteMain
    repository_bundle = [IO.Path]::GetFileName($bundlePath)
    repository_bundle_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $bundlePath).Hash
    release_archive = [IO.Path]::GetFileName($releaseZip)
    release_archive_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $releaseZip).Hash
    release_manifest_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $manifestPath).Hash
    deployment_performed = $false
}

$json = $record | ConvertTo-Json
$utf8NoBom = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText((Join-Path $backupDirectory 'backup-manifest.json'), $json, $utf8NoBom)

$restoreText = @"
# Begapunk offline recovery

Commit: $head

Restore the repository without GitHub:

    git clone "$bundlePath" "E:\begapunk-restored"
    git -C "E:\begapunk-restored" switch main
    git -C "E:\begapunk-restored" rev-parse HEAD

The final command must print $head.

The release ZIP is $releaseZip. It is a validated static release package, not a deployment authorization.

Copy this entire backup directory to another physical disk or removable drive. No production secrets are included.
"@
[IO.File]::WriteAllText((Join-Path $backupDirectory 'RESTORE_INSTRUCTIONS.md'), $restoreText, $utf8NoBom)

Write-Host "Independent production copy synchronized: $head" -ForegroundColor Green
Write-Host "Offline backup created: $backupDirectory" -ForegroundColor Green
Write-Host 'No deployment tag was created and production was not changed.' -ForegroundColor Green
