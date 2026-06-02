$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("C:\ProgramData\Microsoft\Windows\Start Menu\Programs\SOLIDWORKS 2024\SOLIDWORKS 2024.lnk")
Write-Output "Target: $($shortcut.TargetPath)"
Write-Output "WorkingDir: $($shortcut.WorkingDirectory)"

# Also check for Visualize shortcut
$viz = Get-ChildItem -Path "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\SOLIDWORKS 2024" -Filter "*Visualize*" -ErrorAction SilentlyContinue
if ($viz) {
    Write-Output "Visualize found: $($viz.FullName)"
    $vizShortcut = $shell.CreateShortcut($viz.FullName)
    Write-Output "Visualize Target: $($vizShortcut.TargetPath)"
} else {
    Write-Output "Visualize shortcut NOT found"
}

# Search for swv.exe in common locations
$locations = @(
    "C:\Program Files\SOLIDWORKS Corp",
    "C:\Program Files (x86)\SOLIDWORKS Corp",
    "C:\Program Files\Dassault Systemes"
)
foreach ($loc in $locations) {
    if (Test-Path $loc) {
        Write-Output "Found: $loc"
        Get-ChildItem -Path $loc -Recurse -Filter "*Visualize*" -ErrorAction SilentlyContinue | Select-Object -First 3 FullName
    }
}