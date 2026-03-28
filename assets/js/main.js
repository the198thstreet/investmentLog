(function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var yearNodes = document.querySelectorAll('[data-current-year]');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      header.classList.toggle('is-open', !expanded);
    });
  }
  yearNodes.forEach(function (node) { node.textContent = String(new Date().getFullYear()); });
  var start = document.querySelector('#report-date-start');
  var end = document.querySelector('#report-date-end');
  var reset = document.querySelector('#report-filter-reset');
  var count = document.querySelector('#report-filter-count');
  var empty = document.querySelector('#report-empty-state');
  var items = document.querySelectorAll('[data-report-date]');
  function formatLocalDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function applyDefaultRange() {
    if (!items.length) return;
    var dates = Array.prototype.map.call(items, function (item) { return item.getAttribute('data-report-date'); }).sort().reverse();
    if (end) end.value = dates[0];
    if (start) {
      var latest = new Date(dates[0] + 'T00:00:00');
      latest.setMonth(latest.getMonth() - 1);
      start.value = formatLocalDate(latest);
    }
  }
  function filterReports() {
    var visibleCount = 0;
    items.forEach(function (item) {
      var itemDate = item.getAttribute('data-report-date');
      var visible = (!start || !start.value || itemDate >= start.value) && (!end || !end.value || itemDate <= end.value);
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (count) count.textContent = '결과 ' + visibleCount + '건';
    if (empty) empty.hidden = visibleCount !== 0;
  }
  if (items.length) {
    applyDefaultRange();
    filterReports();
  }
  if (start) start.addEventListener('change', filterReports);
  if (end) end.addEventListener('change', filterReports);
  if (reset) reset.addEventListener('click', function () {
    applyDefaultRange();
    filterReports();
  });
})();
