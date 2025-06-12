function Remove-Diacritics
{
    Param(
        [String]$inputString
    )
    #replace diacritics
    $sb = [Text.Encoding]::ASCII.GetString([Text.Encoding]::GetEncoding("Cyrillic").GetBytes($inputString))
 
    return($sb)
}

# Cube Code Array
$cubes = @("trs", "krstart1", "infjumpstartcube", "ajsc", "jumpstartdecks", "jump-start-cube", "HastedPJC", "vuq", "osjs", "n8cr", "jumpsa")

Set-Location -Path ".\cubes"
$oneweekago = (Get-Date -AsUTC).AddDays(-7)

foreach ($cube_code in $cubes) {
  if ( -not (Test-Path ".\$cube_code.csv")) {
      $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code"
      $cubedata = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeurl).RawContentStream.ToArray()) | ConvertFrom-Csv
      foreach ($card in $cubedata) {$card.name = Remove-Diacritics -inputString $card.name}
      $cubedata | select name,Type,Color,"Color Category",maybeboard,tags | Export-Csv -Path ".\$cube_code.csv" –NoTypeInformation
    } else {
      $cubedateapi = "https://cubecobra.com/cube/api/date_updated/" + "$cube_code"
      $response = Invoke-RestMethod -URI "$cubedateapi"
      $lastupdate = ([datetime] '1970-01-01Z').ToUniversalTime().AddSeconds($response.date_updated/1000)
      if ($lastupdate -gt $oneweekago) {
          $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code"
          $cubedata = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeurl).RawContentStream.ToArray()) | ConvertFrom-Csv
          foreach ($card in $cubedata) {$card.name = Remove-Diacritics -inputString $card.name}
          $cubedata | select name,Type,Color,"Color Category",maybeboard,tags | Export-Csv -Path ".\$cube_code.csv" –NoTypeInformation
      }
    }
}

# Tight Cubes
# We need some special filtering on these cubes
$cubes = @("j25-tight", "j22-tight", "jmp2020tight")
foreach ($cube_code in $cubes) {
  if ( -not (Test-Path ".\$cube_code.csv")) {
    $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code" + '?primary=Tags&secondary=Unsorted&tertiary=Unsorted&quaternary=Mana%20Value&showother=false&filter=-tags%3AToken%20-t%3Atoken'
    $cubedata = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeurl).RawContentStream.ToArray()) | ConvertFrom-Csv
    foreach ($card in $cubedata) {$card.name = Remove-Diacritics -inputString $card.name}
    $cubedata | select name,Type,Color,"Color Category",maybeboard,tags | Export-Csv -Path ".\$cube_code.csv" –NoTypeInformation
  } else {
    $cubedateapi = "https://cubecobra.com/cube/api/date_updated/" + "$cube_code"
    $response = Invoke-RestMethod -URI "$cubedateapi"
    $lastupdate = ([datetime] '1970-01-01Z').ToUniversalTime().AddSeconds($response.date_updated/1000)
    if ($lastupdate -gt $oneweekago) {
        $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code" + '?primary=Tags&secondary=Unsorted&tertiary=Unsorted&quaternary=Mana%20Value&showother=false&filter=-tags%3AToken%20-t%3Atoken'
        $cubedata = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeurl).RawContentStream.ToArray()) | ConvertFrom-Csv
        foreach ($card in $cubedata) {$card.name = Remove-Diacritics -inputString $card.name}
        $cubedata | select name,Type,Color,"Color Category",maybeboard,tags | Export-Csv -Path ".\$cube_code.csv" –NoTypeInformation
    }
  }
}

#kvatchstart
# We need to make sure some of the lands have colors associated to them
$cube_code = "kvatchstart"
if ( -not (Test-Path ".\$cube_code.csv")) {
  $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code" + '?primary=Tags&secondary=Unsorted&tertiary=Unsorted&quaternary=Mana%20Value&showother=false&filter=-tags%3AToken%20-t%3Atoken'
  $cubedata = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeurl).RawContentStream.ToArray()) | ConvertFrom-Csv
  foreach ($card in $cubedata) {
    $card.name = Remove-Diacritics -inputString $card.name
    if ($card.'Color Category' -eq "Lands" -and $card.tags -eq "z_Fixing Roster_z") {
      if ($card.Color -eq "") {
        $scryfallapi = "https://api.scryfall.com/cards/named?exact=" + [System.Web.HttpUtility]::UrlDecode($card.name)
        $scryfalloutput = Invoke-RestMethod -URI "$scryfallapi"
        $temp_color = "";
        foreach ($color in $scryfalloutput.produced_mana) {
          $temp_color += $color
        }
        $card.Color = $temp_color
      }
    }
  }
  $selectedcolumns = $cubedata | select name,Type,Color,"Color Category",maybeboard,tags 
  $selectedcolumns | Export-Csv -Path ".\$cube_code.csv" –NoTypeInformation
} else {
  $cubedateapi = "https://cubecobra.com/cube/api/date_updated/" + "$cube_code"
  $response = Invoke-RestMethod -URI "$cubedateapi"
  $lastupdate = ([datetime] '1970-01-01Z').ToUniversalTime().AddSeconds($response.date_updated/1000)
  if ($lastupdate -gt $oneweekago) {
    $cubeurl = "https://cubecobra.com/cube/download/csv/" + "$cube_code" + '?primary=Tags&secondary=Unsorted&tertiary=Unsorted&quaternary=Mana%20Value&showother=false&filter=-tags%3AToken%20-t%3Atoken'
    $cubedata = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeurl).RawContentStream.ToArray()) | ConvertFrom-Csv
    foreach ($card in $cubedata) {
      $card.name = Remove-Diacritics -inputString $card.name
      if ($card.'Color Category' -eq "Lands" -and $card.tags -eq "z_Fixing Roster_z") {
        if ($card.Color -eq "") {
          $scryfallapi = "https://api.scryfall.com/cards/named?exact=" + [System.Web.HttpUtility]::UrlDecode($card.name)
          $scryfalloutput = Invoke-RestMethod -URI "$scryfallapi"
          $temp_color = "";
          foreach ($color in $scryfalloutput.produced_mana) {
            $temp_color += $color
          }
          $card.Color = $temp_color
        }
      }
    }
    $selectedcolumns = $cubedata | select name,Type,Color,"Color Category",maybeboard,tags 
    $selectedcolumns | Export-Csv -Path ".\$cube_code.csv" –NoTypeInformation
  }
}