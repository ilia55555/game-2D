param([Parameter(Mandatory=$true)][string]$UnityEditor)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $UnityEditor)) { throw "Unity editor not found: $UnityEditor" }
$project = (Resolve-Path (Join-Path $PSScriptRoot '../Unity')).Path
$results = Join-Path $project 'TestResults'
New-Item -ItemType Directory -Force -Path $results | Out-Null
foreach ($mode in @('EditMode', 'PlayMode')) {
    $resultFile = Join-Path $results "$mode.xml"
    if (Test-Path $resultFile) { Remove-Item -LiteralPath $resultFile }
    & $UnityEditor -batchmode -nographics -projectPath $project -runTests -testPlatform $mode -testResults $resultFile -logFile (Join-Path $results "$mode.log")
    $testExit = $LASTEXITCODE
    if ($testExit -ne 0 -or -not (Test-Path $resultFile)) { throw "$mode failed (exit $testExit). Read $results/$mode.log" }
    [xml]$report = Get-Content -LiteralPath $resultFile -Raw
    if ($report.'test-run'.result -ne 'Passed' -or [int]$report.'test-run'.total -eq 0) { throw "$mode did not pass. Read $resultFile" }
    Write-Host "$mode passed. Results: $resultFile"
}
