param([Parameter(Mandatory=$true)][string]$Url,[int]$Max=120)
$ErrorActionPreference='Continue'
$ua='begapunk-market-research/1.0 (desk research)'
$tmp=[System.IO.Path]::GetTempFileName()
$raw = & curl.exe -sS -L --max-time 30 -A $ua -o $tmp -w '%{http_code}' $Url 2>$null
Write-Output ("STATUS: {0}  URL: {1}" -f $raw, $Url)
$html = Get-Content $tmp -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
Remove-Item $tmp -Force -ErrorAction SilentlyContinue
if (-not $html) { Write-Output "no body"; return }
Write-Output ("bytes: {0}" -f $html.Length)
$ms = [regex]::Matches($html, '(?is)<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>')
$seen = @{}
$n = 0
foreach ($m in $ms) {
  $href = $m.Groups[1].Value
  $txt = [regex]::Replace($m.Groups[2].Value, '<[^>]+>', ' ')
  $txt = [System.Net.WebUtility]::HtmlDecode($txt) -replace '\s+', ' '
  $txt = $txt.Trim()
  if ($txt.Length -lt 3 -or $txt.Length -gt 80) { continue }
  if ($href -notmatch '^https?://') { continue }
  $host_ = ([uri]$href).Host -replace '^www\.',''
  if ($host_ -match 'facebook|twitter|linkedin|youtube|instagram|google|mta\.org|cookie|privacy|mailto') { continue }
  if ($seen.ContainsKey($host_)) { continue }
  $seen[$host_] = $txt
  $n++
  Write-Output ("{0,-40} {1}" -f $host_, $txt)
  if ($n -ge $Max) { break }
}
Write-Output ("unique external hosts: {0}" -f $seen.Count)
