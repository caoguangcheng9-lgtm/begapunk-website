param([string]$OutCsv)
$ErrorActionPreference='Continue'
$ua='begapunk-market-research/1.0 (desk research)'
$queries = @(
  @{gl='tr'; hl='tr'; q='pnömatik rotary union'},
  @{gl='tr'; hl='tr'; q='lazer boru kesme makinesi'},
  @{gl='tr'; hl='en'; q='rotary union'},
  @{gl='vn'; hl='vi'; q='khớp nối quay khí nén'},
  @{gl='vn'; hl='vi'; q='máy cắt laser ống'},
  @{gl='in'; hl='en'; q='pneumatic rotary union'},
  @{gl='in'; hl='en'; q='laser tube cutting machine'},
  @{gl='th'; hl='th'; q='ข้อต่อหมุนลม'},
  @{gl='th'; hl='th'; q='เครื่องตัดเลเซอร์ท่อ'},
  @{gl='my'; hl='ms'; q='rotary union'},
  @{gl='my'; hl='en'; q='laser cutting machine'},
  @{gl='uk'; hl='en'; q='pneumatic rotary union'},
  @{gl='uk'; hl='en'; q='laser tube cutting machine'},
  @{gl='de'; hl='de'; q='Drehdurchführung'},
  @{gl='de'; hl='de'; q='Rohrlaser'},
  @{gl='it'; hl='it'; q='giunto rotante'},
  @{gl='it'; hl='it'; q='taglio laser tubi'},
  @{gl='it'; hl='en'; q='rotary union'}
)
$rows = New-Object System.Collections.Generic.List[object]
foreach ($x in $queries) {
  $u = "https://suggestqueries.google.com/complete/search?client=firefox&hl=$($x.hl)&gl=$($x.gl)&q=" + [uri]::EscapeDataString($x.q)
  $tmp=[System.IO.Path]::GetTempFileName()
  $code = & curl.exe -sS --max-time 15 -A $ua -o $tmp -w '%{http_code}' $u 2>$null
  $body = Get-Content $tmp -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  $sugs = @()
  if ($body) {
    try {
      $j = $body | ConvertFrom-Json
      $sugs = @($j[1])
    } catch {}
  }
  $rows.Add([pscustomobject]@{
    gl=$x.gl; hl=$x.hl; seed=$x.q; http=$code; count=$sugs.Count; suggestions=($sugs -join ' | ')
  })
  Write-Output ("[{0}/{1}] {2} -> {3} suggestions" -f $x.gl,$x.hl,$x.q,$sugs.Count)
  if ($sugs.Count -gt 0) { Write-Output ("    " + ($sugs -join ' ; ')) }
  Start-Sleep -Milliseconds 400
}
if ($OutCsv) { $rows | Export-Csv $OutCsv -NoTypeInformation -Encoding UTF8 }
