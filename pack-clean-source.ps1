<#
.SYNOPSIS
    Package the project source into begapunk-source-clean.zip for cloud code review.

.DESCRIPTION
    Walks the project tree and skips:
      - dependencies / build output : node_modules, dist, build, .next, target, venv, __pycache__
      - VCS and IDE metadata        : .git, .idea, .vscode
      - OS junk                     : .DS_Store, Thumbs.db
      - temp / secret files         : *.log *.tmp *.bak *.pyc *.pyo *.swp, .env* (except .env.example)
    Everything else (HTML/CSS/JS, JSON, docs, config, images, videos, downloads) is kept.

.EXAMPLE
    ./pack-clean-source.ps1 -DryRun     # show what would be zipped
    ./pack-clean-source.ps1             # build the zip
#>
[CmdletBinding()]
param(
    [string]$Root       = $PSScriptRoot,
    [string]$OutputName = 'begapunk-source-clean.zip',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem | Out-Null

$Root    = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\')
$ZipPath = Join-Path $Root $OutputName
$Script  = $MyInvocation.MyCommand.Path

$SkipDirs  = @('node_modules', 'dist', 'build', '.next', 'target', 'venv', '__pycache__', '.git', '.idea', '.vscode')
$SkipNames = @('.DS_Store', 'Thumbs.db')
$SkipGlobs = @('*.log', '*.tmp', '*.bak', '*.pyc', '*.pyo', '*.swp')

function Test-Skip([string]$RelPath) {
    foreach ($seg in ($RelPath -split '\\')) {
        if ($SkipDirs -contains $seg) { return $true }
        if ($SkipNames -contains $seg) { return $true }
        if ($seg -like '.env*' -and $seg -ne '.env.example') { return $true }
        foreach ($g in $SkipGlobs) { if ($seg -like $g) { return $true } }
    }
    return $false
}

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$files = @(Get-ChildItem -LiteralPath $Root -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -ne $ZipPath -and $_.FullName -ne $Script -and
        -not (Test-Skip $_.FullName.Substring($Root.Length + 1))
    } | Sort-Object FullName)

$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
Write-Host ("[scan] {0:N0} files, {1:N1} MB, {2:N1}s" -f $files.Count, ($totalBytes / 1MB), $sw.Elapsed.TotalSeconds)

if ($DryRun) {
    Write-Host "[dry-run] nothing written. Output would be: $ZipPath"
    return
}

if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
Write-Host "[zip ] building $ZipPath ..."

$fs = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
try {
    $zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create, $true)
    try {
        foreach ($f in $files) {
            $entry = $f.FullName.Substring($Root.Length + 1).Replace('\', '/')
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $f.FullName, $entry, [System.IO.Compression.CompressionLevel]::Optimal)
        }
    } finally { $zip.Dispose() }
} finally { $fs.Dispose() }

# ---- verify the archive by reading every entry back ----
$verify = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
    $bad = 0
    foreach ($e in $verify.Entries) {
        try {
            $s = $e.Open()
            $s.CopyTo([System.IO.Stream]::Null)
            $s.Dispose()
        } catch { $bad++; Write-Warning "unreadable entry: $($e.FullName)" }
    }
    $zipFile = Get-Item -LiteralPath $ZipPath
    Write-Host ("[done] {0}  {1:N1} MB  entries={2:N0}  verified_errors={3}" -f $zipFile.Name, ($zipFile.Length / 1MB), $verify.Entries.Count, $bad)
    Write-Host "[path] $ZipPath"
} finally { $verify.Dispose() }
