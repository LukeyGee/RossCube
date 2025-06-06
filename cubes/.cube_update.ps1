# Cube Code Array
$cubes = @("trs", "krstart1", "infjumpstartcube", "ajsc", "jumpstartdecks", "jump-start-cube", "HastedPJC", "vuq", "osjs", "n8cr", "jumpsa")

Set-Location -Path ".\cubes"
$oneweekago = (Get-Date -AsUTC).AddDays(-7)

foreach ($cube_code in $cubes) {
  if ( -not (Test-Path ".\$cube_code.csv")) {
      $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code"
      Invoke-WebRequest $cubeurl -OutFile ".\$cube_code.csv"
    } else {
      $cubedateapi = "https://cubecobra.com/cube/api/date_updated/" + "$cube_code"
      $response = Invoke-RestMethod -URI "$cubedateapi"
      $lastupdate = ([datetime] '1970-01-01Z').ToUniversalTime().AddSeconds($response.date_updated/1000)
      if ($lastupdate -gt $oneweekago) {
          $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code"
          Invoke-WebRequest $cubeurl -OutFile ".\$cube_code.csv"
      }
    }
}

#j25-tight
#We need to handle this cube in a special way
$cube_code = "j25-tight"
if ( -not (Test-Path ".\$cube_code.csv")) {
  $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code" + '?primary=Tags&secondary=Unsorted&tertiary=Unsorted&quaternary=Mana%20Value&showother=false&filter=-tags%3AToken%20-t%3Atoken'
  Invoke-WebRequest $cubeurl -OutFile ".\$cube_code.csv"
} else {
  $cubedateapi = "https://cubecobra.com/cube/api/date_updated/" + "$cube_code"
  $response = Invoke-RestMethod -URI "$cubedateapi"
  $lastupdate = ([datetime] '1970-01-01Z').ToUniversalTime().AddSeconds($response.date_updated/1000)
  if ($lastupdate -gt $oneweekago) {
      $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code" + '?primary=Tags&secondary=Unsorted&tertiary=Unsorted&quaternary=Mana%20Value&showother=false&filter=-tags%3AToken%20-t%3Atoken'
      Invoke-WebRequest $cubeurl -OutFile ".\$cube_code.csv"
  }
}