[CmdletBinding()]
param(
    [string]$RootPath = "C:\src\investmentLog"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path -LiteralPath $RootPath).Path
$reportDir = Join-Path $root "data\reports"
$styleCssPath = Join-Path $root "assets\css\style.css"

$koCulture = [System.Globalization.CultureInfo]::GetCultureInfo("ko-KR")
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$baseCss = Get-Content -LiteralPath $styleCssPath -Raw -Encoding UTF8
$inlineCss = $baseCss `
    -replace "\.\./img/", "../../assets/img/" `
    -replace 'line-height:\s*1\.7;',''

function Normalize-Text {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return ""
    }

    return ([string]$Value).Replace("`r", " ").Replace("`n", " ").Trim()
}

function Html-Encode {
    param([AllowNull()][object]$Value)

    return [System.Net.WebUtility]::HtmlEncode((Normalize-Text $Value))
}

function Number-Text {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        return "-"
    }

    $number = [double]$Value
    if ([math]::Abs($number % 1) -lt 0.0000001) {
        return $number.ToString("#,0", $koCulture)
    }

    return $number.ToString("#,0.##", $koCulture)
}

function Percent-Text {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        return "-"
    }

    return ([double]$Value).ToString("0.00", $koCulture) + "%"
}

function Format-UpdatedAt {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return "업데이트 시각 없음"
    }

    try {
        $parsed = [datetimeoffset]::Parse($Value, $koCulture)
        return $parsed.ToString("yyyy.MM.dd HH:mm", $koCulture)
    }
    catch {
        return $Value
    }
}

function Signal-Class {
    param([AllowNull()][string]$Signal)

    switch ((Normalize-Text $Signal)) {
        "매수" { return "signal-positive" }
        "BUY" { return "signal-positive" }
        "보유" { return "signal-neutral" }
        "관망" { return "signal-neutral" }
        "HOLD" { return "signal-neutral" }
        default { return "signal-negative" }
    }
}

function Entry-Label {
    param([AllowNull()][string]$Signal)

    switch ((Normalize-Text $Signal)) {
        "매도" { return "정리 기준" }
        "SELL" { return "정리 기준" }
        default { return "진입 구간" }
    }
}

function Filtered-ReasonBullets {
    param($Item)

    $summary = Normalize-Text $Item.reasonSummary
    $bullets = @()

    foreach ($bullet in @($Item.reasonBullets)) {
        $normalized = Normalize-Text $bullet
        if ([string]::IsNullOrWhiteSpace($normalized)) {
            continue
        }
        if ($normalized -eq $summary) {
            continue
        }
        $bullets += $normalized
    }

    return $bullets
}

function Build-ReasonBulletHtml {
    param([string[]]$Items, [int]$Limit)

    return (($Items | Select-Object -First $Limit | ForEach-Object {
        '<div class="reason-bullet">{0}</div>' -f (Html-Encode $_)
    }) -join "")
}

function Build-ReasonListHtml {
    param([string[]]$Items, [int]$Limit)

    return (($Items | Select-Object -First $Limit | ForEach-Object {
        '<li>{0}</li>' -f (Html-Encode $_)
    }) -join "")
}

function Build-TableRowsHtml {
    param([object[]]$Items)

    if (-not $Items -or $Items.Count -eq 0) {
        return '<tr><td colspan="8" class="empty-row">표시할 종목이 없습니다.</td></tr>'
    }

    return (($Items | ForEach-Object {
        $item = $_
        $reasonBullets = Filtered-ReasonBullets $item
        $commentBlock = ""
        if (-not [string]::IsNullOrWhiteSpace((Normalize-Text $item.comment))) {
            $commentBlock = '<div class="reason-comment">{0}</div>' -f (Html-Encode $item.comment)
        }

        @"
<tr class="table-row-enter">
  <th scope="row">
    <div class="ticker-cell">
      <strong class="ticker-name">$(Html-Encode $item.name)</strong>
      <span class="ticker-code">$(Html-Encode $item.symbol)</span>
    </div>
  </th>
  <td><span class="signal-badge $(Signal-Class $item.signal)">$(Html-Encode $item.signal)</span></td>
  <td>$(Percent-Text $item.confidencePct)</td>
  <td>$(Number-Text $item.currentPrice)</td>
  <td><div class="price-stack"><span class="price-main">$(Entry-Label $item.signal)</span><span class="price-sub">$(Number-Text $item.buyLow) ~ $(Number-Text $item.buyHigh)</span></div></td>
  <td><div class="price-stack"><span class="price-main">1차 $(Number-Text $item.targetPrice1)</span><span class="price-sub">2차 $(Number-Text $item.targetPrice2)</span></div></td>
  <td>$(Number-Text $item.stopLossPrice)</td>
  <td><div class="reason-stack">$commentBlock<strong>$(Html-Encode $item.reasonSummary)</strong>$(Build-ReasonBulletHtml $reasonBullets 2)</div></td>
</tr>
"@
    }) -join "")
}

function Build-MobileCardsHtml {
    param([object[]]$Items)

    if (-not $Items -or $Items.Count -eq 0) {
        return '<div class="mobile-empty">표시할 종목이 없습니다.</div>'
    }

    return (($Items | ForEach-Object {
        $item = $_
        $reasonBullets = Filtered-ReasonBullets $item
        $cardTone = switch ((Normalize-Text $item.signal)) {
            "매수" { "mobile-stock-card positive-card" }
            "매도" { "mobile-stock-card negative-card" }
            "SELL" { "mobile-stock-card negative-card" }
            default { "mobile-stock-card neutral-card" }
        }
        $commentBlock = ""
        if (-not [string]::IsNullOrWhiteSpace((Normalize-Text $item.comment))) {
            $commentBlock = '<div class="reason-comment">{0}</div>' -f (Html-Encode $item.comment)
        }

        $detailsBlock = ""
        $reasonListHtml = Build-ReasonListHtml $reasonBullets 4
        if (-not [string]::IsNullOrWhiteSpace($reasonListHtml)) {
            $detailsBlock = '<details class="mobile-reason-details"><summary>판단 근거 더보기</summary><ul class="mobile-reason-list">{0}</ul></details>' -f $reasonListHtml
        }

        @"
<article class="$cardTone">
  <div class="mobile-stock-head">
    <div class="ticker-cell">
      <strong class="ticker-name">$(Html-Encode $item.name)</strong>
      <span class="ticker-code">$(Html-Encode $item.symbol)</span>
    </div>
    <span class="signal-badge $(Signal-Class $item.signal)">$(Html-Encode $item.signal)</span>
  </div>
  <div class="mobile-stock-grid">
    <div class="mobile-metric"><span>신뢰도</span><strong>$(Percent-Text $item.confidencePct)</strong></div>
    <div class="mobile-metric"><span>현재가</span><strong>$(Number-Text $item.currentPrice)</strong></div>
    <div class="mobile-metric"><span>$(Entry-Label $item.signal)</span><strong>$(Number-Text $item.buyLow)</strong><em>~ $(Number-Text $item.buyHigh)</em></div>
    <div class="mobile-metric"><span>목표가</span><strong>1차 $(Number-Text $item.targetPrice1)</strong><em>2차 $(Number-Text $item.targetPrice2)</em></div>
    <div class="mobile-metric"><span>손절가</span><strong>$(Number-Text $item.stopLossPrice)</strong></div>
    <div class="mobile-metric"><span>예상 수익률</span><strong>$(Percent-Text $item.expectedReturnPct)</strong></div>
  </div>
  <div class="mobile-reason">
    $commentBlock
    <strong>$(Html-Encode $item.reasonSummary)</strong>
    $detailsBlock
  </div>
</article>
"@
    }) -join "")
}

$reportFiles = Get-ChildItem -LiteralPath $reportDir -Filter "*.json" | Sort-Object Name

foreach ($file in $reportFiles) {
    $report = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $summary = $report.summary
    $totalCount = if ($null -ne $summary.totalCount) { $summary.totalCount } else { @($report.items).Count }
    $buyCount = if ($null -ne $summary.buyCount) { $summary.buyCount } else { (@($report.items) | Where-Object { (Normalize-Text $_.signal) -in @("매수", "BUY") }).Count }
    $holdCount = if ($null -ne $summary.holdCount) { $summary.holdCount } else { (@($report.items) | Where-Object { (Normalize-Text $_.signal) -in @("보유", "관망", "HOLD") }).Count }
    $sellCount = if ($null -ne $summary.sellCount) { $summary.sellCount } else { (@($report.items) | Where-Object { (Normalize-Text $_.signal) -in @("매도", "SELL") }).Count }
    $headline = Normalize-Text $summary.headline
    if ([string]::IsNullOrWhiteSpace($headline)) {
        $headline = "{0}개 종목 제안 리포트입니다." -f $totalCount
    }

    $tableRowsHtml = Build-TableRowsHtml @($report.items)
    $mobileCardsHtml = Build-MobileCardsHtml @($report.items)
    $dateText = Normalize-Text $report.date
    $documentTitle = "주식 종목 분석 ({0}) {1}" -f $dateText, $headline

    $html = @"
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>$(Html-Encode $documentTitle)</title>
  <meta name="description" content="$(Html-Encode $headline)">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Investment Log">
  <meta property="og:title" content="$(Html-Encode $documentTitle)">
  <meta property="og:description" content="$(Html-Encode $headline)">
  <meta property="og:image" content="../../assets/img/investment-log-mark.svg">
  <meta name="theme-color" content="#153c68">
  <link rel="icon" type="image/svg+xml" href="../../assets/img/favicon.svg">
  <style>
    $inlineCss
    html,
    body {
      background: transparent;
    }
    body::before { display: none; }
    .site-shell { min-height: auto; }
    .site-main { padding-top: 0; padding-bottom: 20px; }
    .container { width: 100% !important; max-width: none !important; margin: 0 !important; }
    .section { padding-top: 0; }
    .panel { box-shadow: none; }
    .table-panel { padding: 0; border: 0; background: transparent; box-shadow: none; border-radius: 0; }
    .table-heading-bar { align-items: center; margin-bottom: 10px; }
    .section-heading { margin-bottom: 10px; }
    .date-toolbar-wrap { display: none; }
    .report-mini-grid {
      margin: 8px 0 10px;
    }
    .surface-banner { margin-bottom: 8px; padding: 10px 12px; border-radius: 14px; }
    .reveal,
    .table-row-enter { opacity: 1; transform: none; animation: none; }
    @media (max-width: 720px) {
      .site-main { padding-bottom: 16px; }
      .table-panel { padding: 0; border-radius: 0; }
      .table-heading-bar { margin-bottom: 12px; }
      .section-heading h2 { font-size: 1.35rem; line-height: 1.25; }
      .surface-banner { padding: 10px 12px; margin-bottom: 8px; border-radius: 14px; }
      .report-mini-grid { margin: 8px 0 10px; }
      .hero-mini-grid { gap: 8px; }
      .hero-mini-card { padding: 10px 12px; border-radius: 14px; }
      .mobile-card-list { gap: 8px; }
      .mobile-stock-card { padding: 12px; border-radius: 14px; }
      .mobile-stock-head { margin-bottom: 12px; }
      .mobile-stock-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
      .mobile-metric { padding: 9px; border-radius: 14px; }
      .mobile-metric strong { font-size: 0.92rem; line-height: 1.35; overflow-wrap: anywhere; }
      .mobile-metric em { display: block; margin-top: 4px; font-size: 0.78rem; }
    }
    @media (max-width: 420px) {
      .mobile-stock-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .mobile-stock-card { padding: 10px; }
      .mobile-metric { padding: 8px; }
      .mobile-metric strong { font-size: 0.88rem; }
      .mobile-metric em { font-size: 0.75rem; }
    }
  </style>
</head>
<body data-page="report-static">
  <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>
  <div class="site-shell">
    <main id="main-content" class="site-main">
      <section class="section">
        <div class="container">
          <section class="panel table-panel reveal">
            <div class="table-heading-bar">
              <div class="section-heading section-heading-spread">
                <div>
                  <p class="eyebrow">종목 $(Number-Text $totalCount)개</p>
                  <h2>종목 $(Number-Text $totalCount)개 요약</h2>
                </div>
              </div>
              <div class="header-status">
                <span class="status-chip">기준일 $dateText</span>
              </div>
            </div>

            <div class="surface-banner">
              <strong>$dateText</strong>
              <span>$(Html-Encode $headline)</span>
            </div>

            <div class="hero-mini-grid report-mini-grid">
              <article class="hero-mini-card hero-mini-buy">
                <span class="metric-label">매수</span>
                <strong class="metric-value">$(Number-Text $buyCount)</strong>
              </article>
              <article class="hero-mini-card hero-mini-hold">
                <span class="metric-label">보유</span>
                <strong class="metric-value">$(Number-Text $holdCount)</strong>
              </article>
              <article class="hero-mini-card hero-mini-sell">
                <span class="metric-label">매도</span>
                <strong class="metric-value">$(Number-Text $sellCount)</strong>
              </article>
              <article class="hero-mini-card hero-mini-total">
                <span class="metric-label">전체 제시 수</span>
                <strong class="metric-value">$(Number-Text $totalCount)</strong>
              </article>
            </div>

            <div class="table-wrap">
              <table class="data-table">
                <caption class="sr-only">상위 종목 요약 표</caption>
                <thead>
                  <tr>
                    <th>종목</th>
                    <th>시그널</th>
                    <th>신뢰도</th>
                    <th>현재가</th>
                    <th>진입 제안</th>
                    <th>목표가</th>
                    <th>손절가</th>
                    <th>판단 근거</th>
                  </tr>
                </thead>
                <tbody>
                  $tableRowsHtml
                </tbody>
              </table>
            </div>

            <div class="mobile-card-list">
              $mobileCardsHtml
            </div>
          </section>
        </div>
      </section>
    </main>
  </div>
</body>
</html>
"@

    $outputPath = Join-Path $reportDir ($file.BaseName + ".html")
    [System.IO.File]::WriteAllText($outputPath, $html, $utf8NoBom)
    Write-Host "Generated $($file.BaseName).html"
}
