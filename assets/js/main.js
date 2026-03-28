(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  var yearNodes = document.querySelectorAll("[data-current-year]");

  if (toggle && header && nav) {
    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      header.classList.toggle("is-open", !expanded);
    });

    nav.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        toggle.setAttribute("aria-expanded", "false");
        header.classList.remove("is-open");
      }
    });
  }

  if (yearNodes.length) {
    var currentYear = new Date().getFullYear();
    yearNodes.forEach(function (node) {
      node.textContent = String(currentYear);
    });
  }

  var reportDateStart = document.querySelector("#report-date-start");
  var reportDateEnd = document.querySelector("#report-date-end");
  var reportFilterReset = document.querySelector("#report-filter-reset");
  var reportFilterCount = document.querySelector("#report-filter-count");
  var reportEmptyState = document.querySelector("#report-empty-state");
  var reportItems = document.querySelectorAll("[data-report-date]");

  function updateReportCount(visibleCount) {
    if (reportFilterCount) {
      reportFilterCount.textContent = "결과 " + visibleCount + "건";
    }
  }

  function formatLocalDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function applyDefaultReportRange() {
    if (!reportItems.length) {
      return;
    }

    var reportDates = Array.prototype.map.call(reportItems, function (item) {
      return item.getAttribute("data-report-date");
    }).sort().reverse();
    var latestReportDate = reportDates[0];

    if (!latestReportDate) {
      return;
    }

    if (reportDateEnd) {
      reportDateEnd.value = latestReportDate;
    }

    if (reportDateStart) {
      var latestDate = new Date(latestReportDate + "T00:00:00");
      latestDate.setMonth(latestDate.getMonth() - 1);
      reportDateStart.value = formatLocalDate(latestDate);
    }
  }

  function filterReports() {
    if (!reportItems.length) {
      return;
    }

    var startDate = reportDateStart ? reportDateStart.value : "";
    var endDate = reportDateEnd ? reportDateEnd.value : "";
    var visibleCount = 0;

    reportItems.forEach(function (item) {
      var itemDate = item.getAttribute("data-report-date");
      var afterStart = !startDate || itemDate >= startDate;
      var beforeEnd = !endDate || itemDate <= endDate;
      var visible = afterStart && beforeEnd;

      item.hidden = !visible;

      if (visible) {
        visibleCount += 1;
      }
    });

    if (reportEmptyState) {
      reportEmptyState.hidden = visibleCount !== 0;
    }

    updateReportCount(visibleCount);
  }

  if (reportItems.length) {
    applyDefaultReportRange();
    filterReports();
  }

  if (reportDateStart) {
    reportDateStart.addEventListener("change", filterReports);
  }

  if (reportDateEnd) {
    reportDateEnd.addEventListener("change", filterReports);
  }

  if (reportFilterReset) {
    reportFilterReset.addEventListener("click", function () {
      applyDefaultReportRange();
      filterReports();
    });
  }
})();
