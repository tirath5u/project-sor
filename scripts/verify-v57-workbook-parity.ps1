param(
  [string]$Path = 'C:\my-ai\PM - Codex\09-projects\financial-aid-core\work\outputs\tc-SOR-calculator-2026-27-v57-candidate.xlsx'
)

$ErrorActionPreference = 'Stop'
$fixtures = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\fixtures\v57-audit-parity.json') -Raw | ConvertFrom-Json
$base = @{
  B4='Dependent'; B5=1; B6='None / Not Applicable'; B7='2026-27'; B8='No';
  B9='Annual / Multi-term'; J9='Not selected';
  B13='1 - Standard Term (Semesters / Trimesters / Quarters)'; B14=2;
  B21=30000; B22=0; B23=10000; B32=12; C32=12; B34=12; C34=12;
  B50=''; B55=''; B69='Equal'; E6='Parent Grid'
}

function Set-Cell($sheet, [string]$address, $value) {
  if ($value -is [string]) {
    $sheet.Range($address).Formula = $value
  } else {
    $sheet.Range($address).Value2 = [double]$value
  }
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$workbook = $null
try {
  $workbook = $excel.Workbooks.Open($Path, 0, $true)
  $sheet = $workbook.Worksheets.Item('SOR Calculator')
  $receipts = @()
  foreach ($fixture in $fixtures) {
    foreach ($entry in $base.GetEnumerator()) { Set-Cell $sheet $entry.Key $entry.Value }
    foreach ($entry in $fixture.workbook.PSObject.Properties) { Set-Cell $sheet $entry.Name $entry.Value }
    $excel.CalculateFullRebuild()
    $actual = [ordered]@{
      sorPercent = [double]$sheet.Range('B42').Value2
      sub = [double]$sheet.Range('B44').Value2
      unsub = [double]$sheet.Range('B45').Value2
      termSub = @([double]$sheet.Range('B85').Value2, [double]$sheet.Range('C85').Value2)
      termUnsub = @([double]$sheet.Range('B87').Value2, [double]$sheet.Range('C87').Value2)
      auditStatus = [string]$sheet.Range('B95').Value2
      warning = [string]$sheet.Range('B96').Value2
    }
    foreach ($field in @('sorPercent','sub','unsub')) {
      if ($actual[$field] -ne $fixture.expected.$field) { throw "$($fixture.id): $field expected $($fixture.expected.$field), got $($actual[$field])" }
    }
    for ($i = 0; $i -lt 2; $i++) {
      if ($actual.termSub[$i] -ne $fixture.expected.termSub[$i]) { throw "$($fixture.id): Sub term $i differs" }
      if ($actual.termUnsub[$i] -ne $fixture.expected.termUnsub[$i]) { throw "$($fixture.id): Unsub term $i differs" }
    }
    if ($actual.auditStatus -notmatch '^RECONCILED' -or $actual.warning -match '^Review:') {
      throw "$($fixture.id): unexpected workbook review status"
    }
    $receipts += [pscustomobject]@{ id=$fixture.id; actual=$actual }
  }
  $receipts | ConvertTo-Json -Depth 5
} finally {
  if ($workbook) { $workbook.Close($false) }
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
