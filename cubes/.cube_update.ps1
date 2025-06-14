function Remove-Diacritics{
    Param([String]$inputString)
    return [Text.Encoding]::ASCII.GetString([Text.Encoding]::GetEncoding("Cyrillic").GetBytes($inputString))
}

# Fetch Scryfall oracle cards
$bulkUrl = "https://api.scryfall.com/bulk-data"
$oracleData = (Invoke-RestMethod -Uri $bulkUrl).data | Where-Object { $_.type -eq "oracle_cards" }
$scryfallCards = Invoke-RestMethod -Uri $oracleData.download_uri

# Build a hashtable of Scryfall cards for fast lookup
$scryHash = @{}
foreach ($card in $scryfallCards) {
    $scryHash[$card.name] = $card
}
$scryHashKeys = $scryHash.keys

Set-Location -Path ".\cubes"
Remove-Item * -Include *.csv

# Cube Code Array
$cubes = @("trs", "krstart1", "infjumpstartcube", "ajsc", "jumpstartdecks", "jump-start-cube", "HastedPJC", "vuq", "osjs", "n8cr", "jumpsa")

foreach ($cube_code in $cubes) {
  $cubeUrl = "https://cubecobra.com/cube/download/csv/" + "$cube_code"
  $csvText = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeUrl).RawContentStream.ToArray())
  $cubeData = $csvText | ConvertFrom-Csv | Select-Object *, @{Name='manacost'; Expression={""}}
  foreach ($card in $cubeData) {
    if ($scryHash.ContainsKey($card.name)) {
        $scryCard = $scryHash[$card.name]
        $card.manacost = $scryCard.mana_cost
    } else {
      $searchString = '*' + $card.name + '*'
      $scryLike = $scryHashKeys -like $searchString
      if ($scryLike.Length -eq 1) {
        $scryCard = $scryHash[$scryLike[0]]
        foreach ($scryCardFaces in $ScryCard.card_faces) {
          if ($scryCardFaces.name -eq $card.name) {
            $card.manacost = $scryCardFaces.mana_cost
          }
        }
      } elseif ($scryLike.Length -gt 1) {
        foreach ($scryMatch in $scryLike) {
          $scryCard = $scryHash[$scryMatch]
          if ($scryCard.layout -ne "art_series") {
            foreach ($scryCardFaces in $ScryCard.card_faces) {
              if ($scryCardFaces.name -eq $card.name) {
                $card.manacost = $scryCardFaces.mana_cost
              }
            }
          }
        }
      }
    }
    $name = $card.name
    $cleanName = Remove-Diacritics -inputString $name
    $card.name = $cleanName
  }
  $cubeData | Select-Object name, Type, Color, "Color Category", manacost, maybeboard, tags |
        Export-Csv -Path ".\$cube_code.csv" -NoTypeInformation
}

# Tight Cubes
# We need some special filtering on these cubes
$cubes = @("j25-tight", "j22-tight", "jmp2020tight")
foreach ($cube_code in $cubes) {
  $cubeUrl = "https://cubecobra.com/cube/download/csv/" + "$cube_code" + '?primary=Tags&secondary=Unsorted&tertiary=Unsorted&quaternary=Mana%20Value&showother=false&filter=-tags%3AToken%20-t%3Atoken'
  $csvText = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeUrl).RawContentStream.ToArray())
  $cubeData = $csvText | ConvertFrom-Csv | Select-Object *, @{Name='manacost'; Expression={""}}
  foreach ($card in $cubeData) {
    if ($scryHash.ContainsKey($card.name)) {
        $scryCard = $scryHash[$card.name]
        $card.manacost = $scryCard.mana_cost
    } else {
      $searchString = '*' + $card.name + '*'
      $scryLike = $scryHashKeys -like $searchString
      if ($scryLike.Length -eq 1) {
        $scryCard = $scryHash[$scryLike[0]]
        foreach ($scryCardFaces in $ScryCard.card_faces) {
          if ($scryCardFaces.name -eq $card.name) {
            $card.manacost = $scryCardFaces.mana_cost
          }
        }
      } elseif ($scryLike.Length -gt 1) {
        foreach ($scryMatch in $scryLike) {
          $scryCard = $scryHash[$scryMatch]
          if ($scryCard.layout -ne "art_series") {
            foreach ($scryCardFaces in $ScryCard.card_faces) {
              if ($scryCardFaces.name -eq $card.name) {
                $card.manacost = $scryCardFaces.mana_cost
              }
            }
          }
        }
      }
    }
    $name = $card.name
    $cleanName = Remove-Diacritics -inputString $name
    $card.name = $cleanName
  }
  $cubeData | Select-Object name, Type, Color, "Color Category", manacost, maybeboard, tags |
        Export-Csv -Path ".\$cube_code.csv" -NoTypeInformation
}

#kvatchstart
# We need to make sure some of the lands have colors associated to them
$cube_code = "kvatchstart"
$cubeUrl = "https://cubecobra.com/cube/download/csv/" + "$cube_code"
$csvText = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest $cubeUrl).RawContentStream.ToArray())
$cubeData = $csvText | ConvertFrom-Csv | Select-Object *, @{Name='manacost'; Expression={""}}
foreach ($card in $cubeData) {
  if ($scryHash.ContainsKey($card.name)) {
      $scryCard = $scryHash[$card.name]
      $card.manacost = $scryCard.mana_cost
  } else {
    $searchString = '*' + $card.name + '*'
    $scryLike = $scryHashKeys -like $searchString
    if ($scryLike.Length -eq 1) {
      $scryCard = $scryHash[$scryLike[0]]
      foreach ($scryCardFaces in $ScryCard.card_faces) {
        if ($scryCardFaces.name -eq $card.name) {
          $card.manacost = $scryCardFaces.mana_cost
        }
      }
    } elseif ($scryLike.Length -gt 1) {
      foreach ($scryMatch in $scryLike) {
        $scryCard = $scryHash[$scryMatch]
        if ($scryCard.layout -ne "art_series") {
          foreach ($scryCardFaces in $ScryCard.card_faces) {
            if ($scryCardFaces.name -eq $card.name) {
              $card.manacost = $scryCardFaces.mana_cost
            }
          }
        }
      }
    }
  }
  $name = $card.name
  $cleanName = Remove-Diacritics -inputString $name
  $card.name = $cleanName
}
$cubeData | Select-Object name, Type, Color, "Color Category", manacost, maybeboard, tags |
      Export-Csv -Path ".\$cube_code.csv" -NoTypeInformation