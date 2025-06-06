# Cube Code Array
$cubes = @("trs", "krstart1", "infjumpstartcube", "ajsc", "jumpstartdecks", "jump-start-cube", "HastedPJC", "vuq")

foreach ($cube_code in $cubes) {
    if ( -not (Test-Path ".\$cube_code.csv")) {
        $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code"
        Invoke-WebRequest $cubeurl -OutFile ".\$cube_code.csv"
      } else {
        $cubedateapi = "https://cubecobra.com/cube/api/date_updated/" + "$cube_code"
        $response = Invoke-RestMethod -URI "$cubedateapi"
        $lastupdate = ([datetime] '1970-01-01Z').ToUniversalTime().AddSeconds($response.date_updated/1000)
        $createdate = Get-ChildItem ".\$cube_code.csv" | Select-Object -ExpandProperty CreationTimeUtc
        if ($lastupdate -gt $createdate) {
            $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code"
            Invoke-WebRequest $cubeurl -OutFile ".\$cube_code.csv"
        }
      }
}