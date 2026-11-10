param(
  [Parameter(Mandatory=$true)][string]$UrlsFile,
  [string]$OutCsv = ''
)
$ErrorActionPreference = 'Continue'
$ua = 'begapunk-market-research/1.0 (desk research)'
$rows = New-Object System.Collections.Generic.List[object]
foreach ($line in (Get-Content $UrlsFile -Encoding UTF8)) {
  $u = $line.Trim()
  if ($u -eq '' -or $u.StartsWith('#')) { continue }
  $tmp = [System.IO.Path]::GetTempFileName()
  $fmt = '%{http_code}|%{url_effective}'
  $raw = & curl.exe -sS -L --max-time 20 --connect-timeout 15 -A $ua -o $tmp -w $fmt $u 2>&1
  $exit = $LASTEXITCODE
  $txt = ($raw | Out-String).Trim()
  $parts = $txt -split '\|'
  $status = if ($parts.Count -ge 1) { $parts[0] } else { '' }
  $eff = if ($parts.Count -ge 2) { $parts[1] } else { '' }
  $body = ''
  if (Test-Path $tmp) { $body = Get-Content $tmp -Raw -Encoding UTF8 -ErrorAction SilentlyContinue; Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
  $title = ''
  if ($body) {
    $m = [regex]::Match($body, '(?is)<title[^>]*>(.*?)</title>')
    if ($m.Success) { $title = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) -replace '\s+', ' ' }
  }
  $probe = ''
  foreach ($k in @('laser','tube','chuck','rotary union','rotary joint','pneumatic','automation','packaging','cnc','spindle','collet','cylinder')) {
    if ($body -and $body.IndexOf($k, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { $probe += "$k;" }
  }
  $rows.Add([pscustomobject]@{
    url = $u; status = $status; effective = $eff; bytes = $body.Length
    title = if ($title.Length -gt 110) { $title.Substring(0,110) } else { $title }
    hits = $probe
  })
  Write-Output ("{0,-6} {1,8}  {2}  ||  {3}" -f $status, $body.Length, ($title.Substring(0,[Math]::Min(90,$title.Length))), $probe)
}
if ($OutCsv -ne '') { $rows | Export-Csv $OutCsv -NoTypeInformation -Encoding UTF8 }
