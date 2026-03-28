(function () {
  var indexUrl = "./data/report-index.json";
  var reportBasePath = "./data/reports/";

  var updatedAtChip = document.getElementById("updated-at-chip");
  var heroTitle = document.getElementById("hero-title");
  var heroSummary = document.getElementById("hero-summary");
  var heroEyebrow = document.getElementById("hero-eyebrow");
  var buyCount = document.getElementById("buy-count");
  var holdCount = document.getElementById("hold-count");
  var sellCount = document.getElementById("sell-count");
  var totalCount = document.getElementById("total-count");
  var tableEyebrow = document.getElementById("table-eyebrow");
  var tableTitle = document.getElementById("table-title");
  var selectedDateLabel = document.getElementById("selected-date-label");
  var selectedDateSummary = document.getElementById("selected-date-summary");
  var datePicker = document.getElementById("report-date-picker");
  var prevButton = document.getElementById("prev-date");
  var nextButton = document.getElementById("next-date");
  var tableBody = document.getElementById("ticker-table-body");
  var mobileCardList = document.getElementById("mobile-card-list");

  var state = {
    dates: [],
    currentDate: null
  };

  function numberText(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "-";
    }
    return Number(value).toLocaleString("ko-KR");
  }

  function percentText(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "-";
    }
    return Number(value).toFixed(2) + "%";
  }

  function signalClass(signal) {
    if (signal === "매수") {
      return "signal-positive";
    }
    if (signal === "보유" || signal === "관망") {
      return "signal-neutral";
    }
    return "signal-negative";
  }

  function loadJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    });
  }

  function setMessage(message) {
    tableBody.innerHTML = '<tr><td colspan="8" class="empty-row">' + message + "</td></tr>";
    mobileCardList.innerHTML = '<div class="mobile-empty">' + message + "</div>";
  }

  function formatUpdatedAt(value) {
    if (!value) {
      return "데이터 시각 없음";
    }
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function reasonBulletsHtml(items, limit) {
    return (items || []).slice(0, limit).map(function (bullet) {
      return '<div class="reason-bullet">' + bullet + "</div>";
    }).join("");
  }

  function reasonListHtml(items, limit) {
    return (items || []).slice(0, limit).map(function (bullet) {
      return "<li>" + bullet + "</li>";
    }).join("");
  }

  function filteredReasonBullets(item, limit) {
    var summary = (item.reasonSummary || "").trim();
    return (item.reasonBullets || [])
      .filter(function (bullet) {
        return bullet && bullet.trim() !== summary;
      })
      .slice(0, limit);
  }

  function renderRows(items) {
    if (!items.length) {
      setMessage("표시할 종목이 없습니다.");
      return;
    }

    tableBody.innerHTML = items.map(function (item) {
      var bullets = reasonBulletsHtml(filteredReasonBullets(item, 2), 2);
      var commentBlock = item.comment ? '<div class="reason-comment">' + item.comment + "</div>" : "";
      var entryLabel = item.signal === "매도" ? "정리 기준" : "진입 구간";

      return [
        '<tr class="table-row-enter">',
        '  <th scope="row">',
        '    <div class="ticker-cell">',
        '      <strong class="ticker-name">' + item.name + "</strong>",
        '      <span class="ticker-code">' + item.symbol + "</span>",
        "    </div>",
        "  </th>",
        '  <td><span class="signal-badge ' + signalClass(item.signal) + '">' + item.signal + "</span></td>",
        "  <td>" + percentText(item.confidencePct) + "</td>",
        "  <td>" + numberText(item.currentPrice) + "</td>",
        '  <td><div class="price-stack"><span class="price-main">' + entryLabel + '</span><span class="price-sub">' + numberText(item.buyLow) + " ~ " + numberText(item.buyHigh) + "</span></div></td>",
        '  <td><div class="price-stack"><span class="price-main">1차 ' + numberText(item.targetPrice1) + '</span><span class="price-sub">2차 ' + numberText(item.targetPrice2) + "</span></div></td>",
        "  <td>" + numberText(item.stopLossPrice) + "</td>",
        '  <td><div class="reason-stack">' + commentBlock + "<strong>" + item.reasonSummary + "</strong>" + bullets + "</div></td>",
        "</tr>"
      ].join("");
    }).join("");

    mobileCardList.innerHTML = items.map(function (item) {
      var entryLabel = item.signal === "매도" ? "정리 기준" : "진입 구간";
      var bullets = reasonListHtml(filteredReasonBullets(item, 4), 4);
      var cardTone = item.signal === "매수"
        ? "mobile-stock-card positive-card"
        : (item.signal === "매도" ? "mobile-stock-card negative-card" : "mobile-stock-card neutral-card");
      var commentBlock = item.comment ? '<div class="reason-comment">' + item.comment + "</div>" : "";

      return [
        '<article class="' + cardTone + '">',
        '  <div class="mobile-stock-head">',
        '    <div class="ticker-cell">',
        '      <strong class="ticker-name">' + item.name + "</strong>",
        '      <span class="ticker-code">' + item.symbol + "</span>",
        "    </div>",
        '    <span class="signal-badge ' + signalClass(item.signal) + '">' + item.signal + "</span>",
        "  </div>",
        '  <div class="mobile-stock-grid">',
        '    <div class="mobile-metric"><span>신뢰도</span><strong>' + percentText(item.confidencePct) + "</strong></div>",
        '    <div class="mobile-metric"><span>현재가</span><strong>' + numberText(item.currentPrice) + "</strong></div>",
        '    <div class="mobile-metric"><span>' + entryLabel + "</span><strong>" + numberText(item.buyLow) + " ~ " + numberText(item.buyHigh) + "</strong></div>",
        '    <div class="mobile-metric"><span>목표가</span><strong>1차 ' + numberText(item.targetPrice1) + "</strong><em>2차 " + numberText(item.targetPrice2) + "</em></div>",
        '    <div class="mobile-metric"><span>손절가</span><strong>' + numberText(item.stopLossPrice) + "</strong></div>",
        '    <div class="mobile-metric"><span>예상 수익률</span><strong>' + percentText(item.expectedReturnPct) + "</strong></div>",
        "  </div>",
        '  <div class="mobile-reason">',
        commentBlock,
        "    <strong>" + item.reasonSummary + "</strong>",
        bullets ? ('    <details class="mobile-reason-details"><summary>판단 근거 더보기</summary><ul class="mobile-reason-list">' + bullets + "</ul></details>") : "",
        "  </div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function updateSummary(report) {
    var summary = report.summary || {};
    heroEyebrow.textContent = "종목 " + numberText(summary.totalCount) + "개";
    heroTitle.textContent = report.date + " 기준 종목 " + numberText(summary.totalCount) + "개 제안";
    heroSummary.textContent = summary.headline || "선택 날짜 로그를 불러오는 중";
    buyCount.textContent = numberText(summary.buyCount);
    holdCount.textContent = numberText(summary.holdCount);
    sellCount.textContent = numberText(summary.sellCount);
    totalCount.textContent = numberText(summary.totalCount);
    tableEyebrow.textContent = "종목 " + numberText(summary.totalCount) + "개";
    tableTitle.textContent = "종목 " + numberText(summary.totalCount) + "개 요약 표";
    selectedDateLabel.textContent = report.date;
    selectedDateSummary.textContent = summary.headline || "선택 날짜 핵심 시그널 요약";
  }

  function updateDateControls() {
    datePicker.value = state.currentDate || "";
    var index = state.dates.indexOf(state.currentDate);
    prevButton.disabled = index < 0 || index >= state.dates.length - 1;
    nextButton.disabled = index <= 0;
  }

  function renderReport(report) {
    updateSummary(report);
    renderRows(report.items || []);
    updateDateControls();
  }

  function showDate(date) {
    if (!date) {
      return;
    }
    state.currentDate = date;
    updateDateControls();
    setMessage("데이터를 불러오는 중");
    loadJson(reportBasePath + date + ".json")
      .then(renderReport)
      .catch(function () {
        setMessage("선택 날짜 데이터를 불러오지 못했습니다.");
      });
  }

  function moveDate(direction) {
    var index = state.dates.indexOf(state.currentDate);
    var nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= state.dates.length) {
      return;
    }
    showDate(state.dates[nextIndex]);
  }

  prevButton.addEventListener("click", function () {
    moveDate(1);
  });

  nextButton.addEventListener("click", function () {
    moveDate(-1);
  });

  datePicker.addEventListener("change", function () {
    if (state.dates.indexOf(datePicker.value) >= 0) {
      showDate(datePicker.value);
    }
  });

  loadJson(indexUrl)
    .then(function (indexData) {
      state.dates = indexData.availableDates || [];
      updatedAtChip.textContent = "업데이트 " + formatUpdatedAt(indexData.updatedAt);
      datePicker.min = state.dates[state.dates.length - 1] || "";
      datePicker.max = state.dates[0] || "";

      if (!state.dates.length) {
        setMessage("표시할 데이터가 없습니다.");
        heroTitle.textContent = "데이터가 아직 생성되지 않았습니다.";
        heroSummary.textContent = "stockTracker 배치가 JSON 데이터를 만들면 여기에 표시됩니다.";
        return;
      }

      showDate(indexData.latestDate || state.dates[0]);
    })
    .catch(function () {
      updatedAtChip.textContent = "데이터 로드 실패";
      heroTitle.textContent = "JSON 데이터를 불러오지 못했습니다.";
      heroSummary.textContent = "data/report-index.json 생성 상태를 확인해 주세요.";
      setMessage("보고서 인덱스를 불러올 수 없습니다.");
    });
}());
