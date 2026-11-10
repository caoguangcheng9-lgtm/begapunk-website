param([string]$Url,[string]$Pattern,[int]$Max=6)
$ErrorActionPreference='Continue'
$ua='begapunk-market-research/1.0 (desk research)'
$tmp=[System.IO.Path]::GetTempFileName()
$code = & curl.exe -sS -L --max-time 25 -A $ua -o $tmp -w '%{http_code}' $Url 2>$null
$html = Get-Content $tmp -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
Remove-Item $tmp -Force -ErrorAction SilentlyContinue
Write-Output ("=== {0}  [{1}]  {2} bytes" -f $Url, $code, ($(if($html){$html.Length}else{0})))
if (-not $html) { return }
$txt = [regex]::Replace($html,'(?is)<script.*?</script>',' ')
$txt = [regex]::Replace($txt,'(?is)<style.*?</style>',' ')
$txt = [regex]::Replace($txt,'<[^>]+>',' ')
$txt = [System.Net.WebUtility]::HtmlDecode($txt)
$txt = [regex]::Replace($txt,'\s+',' ')
$ms = [regex]::Matches($txt, $Pattern, 'IgnoreCase')
Write-Output ("matches: {0}" -f $ms.Count)
$i=0
foreach($m in $ms){
  $i++; if($i -gt $Max){break}
  $s=[Math]::Max(0,$m.Index-90); $len=[Math]::Min(200,$txt.Length-$s)
  Write-Output ("  ..." + $txt.Substring($s,$len).Trim() + "...")
}
