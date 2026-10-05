/* ===== School Timetable Generator - script.js =====
 * Sections: 1 data, 2 helpers, 3 validation, 4 timetable building,
 * 5 rendering, 6 edit dialog, 7 save/load, 8 print & PDF, 9 buttons.
 */
(function () {
  'use strict';

  /* ---------- 1. DATA ---------- */
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MAX_PERIODS = 9;
  var STORAGE_KEY = 'schoolTimetable.v1';

  // Default subjects (used by Quick Fill and the subject dropdown) with a fixed colour hue each
  var DEFAULT_SUBJECTS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'Computer Science', 'Tamil', 'Social Science', 'Physical Education', 'Library'
  ];
  var SUBJECT_HUES = {
    'mathematics': 215, 'physics': 265, 'chemistry': 160, 'biology': 100, 'english': 20,
    'computer science': 185, 'tamil': 330, 'social science': 45, 'physical education': 290, 'library': 0
  };

  // Teacher and room for each subject, used by the sample timetable
  var SAMPLE_INFO = {
    'Mathematics': ['Mr. Ravi Kumar', '101'],
    'Physics': ['Ms. Priya Nair', '102'],
    'Chemistry': ['Dr. Anitha Rao', '103'],
    'English': ['Mrs. Meena Joseph', '104'],
    'Computer Science': ['Mr. Arun Prakash', 'Lab 1'],
    'Tamil': ['Mrs. Lakshmi Devi', '105'],
    'Biology': ['Ms. Divya Menon', '106'],
    'Physical Education': ['Mr. Suresh Babu', 'Ground']
  };
  var SAMPLE_SCHEDULE = [
    ['Mathematics', 'Physics', 'Chemistry', 'English', 'Computer Science', 'Tamil'],
    ['Physics', 'Mathematics', 'English', 'Chemistry', 'Computer Science', 'Biology'],
    ['Chemistry', 'English', 'Mathematics', 'Physics', 'Biology', 'Computer Science'],
    ['English', 'Physics', 'Chemistry', 'Mathematics', 'Tamil', 'Computer Science'],
    ['Mathematics', 'Chemistry', 'Physics', 'English', 'Computer Science', 'Biology'],
    ['Computer Science', 'Mathematics', 'English', 'Physics', 'Chemistry', 'Physical Education']
  ];

  // Setup form fields (ids are shared by the inputs and their error messages)
  var FIELD_IDS = ['schoolName', 'className', 'section', 'academicYear', 'numDays', 'numPeriods',
    'startTime', 'periodDuration', 'breakAfter', 'breakDuration'];

  // timetable = { settings: {...}, grid: grid[dayIndex][periodIndex] = {subject, teacher, room} }
  var timetable = null;
  var editing = null; // the slot being edited: { day, period }

  /* ---------- 2. HELPERS ---------- */
  function $(id) { return document.getElementById(id); }

  function showToast(message, isError) {
    var toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = message;
    $('toasts').appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3200);
  }

  function emptyGrid() {
    var grid = [];
    for (var d = 0; d < DAYS.length; d++) {
      var row = [];
      for (var p = 0; p < MAX_PERIODS; p++) { row.push({ subject: '', teacher: '', room: '' }); }
      grid.push(row);
    }
    return grid;
  }

  // Make sure data coming from localStorage has the right shape and length
  function cleanGrid(raw) {
    var grid = emptyGrid();
    if (!Array.isArray(raw)) { return grid; }
    for (var d = 0; d < DAYS.length; d++) {
      for (var p = 0; p < MAX_PERIODS; p++) {
        var cell = raw[d] && raw[d][p];
        if (cell && typeof cell === 'object') {
          grid[d][p] = {
            subject: String(cell.subject || '').trim().slice(0, 40),
            teacher: String(cell.teacher || '').trim().slice(0, 40),
            room: String(cell.room || '').trim().slice(0, 20)
          };
        }
      }
    }
    return grid;
  }

  function toMinutes(timeText) {
    var parts = timeText.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function formatTime(totalMinutes) {
    var minutes = totalMinutes % 1440;
    var hours = Math.floor(minutes / 60);
    var suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return hours + ':' + String(minutes % 60).padStart(2, '0') + ' ' + suffix;
  }

  // Same subject name -> same colour. Default subjects have fixed hues; custom ones use a hash.
  function subjectColors(subject) {
    var key = subject.toLowerCase();
    var hue = SUBJECT_HUES[key];
    if (hue === undefined) {
      hue = 0;
      for (var i = 0; i < key.length; i++) { hue = (hue * 31 + key.charCodeAt(i)) % 360; }
    }
    return { bg: 'hsl(' + hue + ', 55%, 92%)', bar: 'hsl(' + hue + ', 45%, 45%)' };
  }

  /* ---------- 3. VALIDATION ---------- */
  function readSettings() {
    var raw = {};
    FIELD_IDS.forEach(function (id) { raw[id] = $(id).value.trim(); });

    var errors = {};
    var s = {
      schoolName: raw.schoolName, className: raw.className, section: raw.section,
      academicYear: raw.academicYear, startTime: raw.startTime,
      numDays: parseInt(raw.numDays, 10), numPeriods: parseInt(raw.numPeriods, 10),
      periodDuration: Number(raw.periodDuration), breakAfter: Number(raw.breakAfter),
      breakDuration: Number(raw.breakDuration)
    };

    if (!s.schoolName) { errors.schoolName = 'Please enter a school name.'; }
    if (!s.className) { errors.className = 'Please enter the class or grade.'; }
    if (s.numDays !== 5 && s.numDays !== 6) { errors.numDays = 'Choose 5 or 6 days.'; }
    if (!(s.numPeriods >= 5 && s.numPeriods <= MAX_PERIODS)) { errors.numPeriods = 'Choose 5 to 9 periods.'; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime)) { errors.startTime = 'Enter a valid start time.'; }
    if (!Number.isInteger(s.periodDuration) || s.periodDuration < 20 || s.periodDuration > 120) {
      errors.periodDuration = 'Enter 20 to 120 minutes.';
    }
    if (!Number.isInteger(s.breakAfter) || s.breakAfter < 0 || s.breakAfter >= s.numPeriods) {
      errors.breakAfter = 'Enter 0, or a period before the last one.';
    }
    if (!Number.isInteger(s.breakDuration) || s.breakDuration < 5 || s.breakDuration > 60) {
      errors.breakDuration = 'Enter 5 to 60 minutes.';
    }
    return { settings: s, errors: errors };
  }

  function showErrors(errors) {
    FIELD_IDS.forEach(function (id) {
      $('err-' + id).textContent = errors[id] || '';
      $(id).setAttribute('aria-invalid', errors[id] ? 'true' : 'false');
    });
  }

  /* ---------- 4. TIMETABLE BUILDING ---------- */
  // Turns settings into a list of rows: periods with times, plus the break row
  function buildRows(s) {
    var rows = [];
    var time = toMinutes(s.startTime);
    for (var p = 1; p <= s.numPeriods; p++) {
      rows.push({ type: 'period', index: p - 1, label: formatTime(time) + ' – ' + formatTime(time + s.periodDuration) });
      time += s.periodDuration;
      if (p === s.breakAfter) {
        rows.push({ type: 'break', label: formatTime(time) + ' – ' + formatTime(time + s.breakDuration), minutes: s.breakDuration });
        time += s.breakDuration;
      }
    }
    return rows;
  }

  function generateTimetable() {
    var result = readSettings();
    showErrors(result.errors);
    var firstError = Object.keys(result.errors)[0];
    if (firstError) {
      showToast(result.errors[firstError], true);
      $(firstError).focus();
      return;
    }
    // Keep existing entries when the user regenerates with new settings
    timetable = { settings: result.settings, grid: timetable ? timetable.grid : emptyGrid() };
    render();
    showToast('Timetable generated successfully.');
    $('timetableCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fillSetupForm(s) {
    FIELD_IDS.forEach(function (id) { $(id).value = s[id] === undefined ? '' : s[id]; });
  }

  /* ---------- 5. RENDERING (built with createElement, never innerHTML) ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function render() {
    var wrap = $('tableWrap');
    wrap.textContent = '';
    var hasTable = timetable !== null;
    $('ttInfo').hidden = !hasTable;
    $('tableHint').hidden = !hasTable;

    if (!hasTable) {
      wrap.appendChild(buildEmptyState());
      return;
    }
    renderInfo();
    wrap.appendChild(buildTable());
  }

  function buildEmptyState() {
    var box = el('div', 'empty-state');
    box.appendChild(el('div', 'empty-icon', '📅'));
    box.lastChild.setAttribute('aria-hidden', 'true');
    box.appendChild(el('h3', '', 'No timetable created yet'));
    box.appendChild(el('p', '', 'Enter your class details and generate your weekly timetable.'));
    var button = el('button', 'btn btn-primary', 'Create Timetable');
    button.type = 'button';
    button.addEventListener('click', function () {
      $('setupCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('schoolName').focus();
    });
    box.appendChild(button);
    return box;
  }

  function renderInfo() {
    var s = timetable.settings;
    var info = $('ttInfo');
    info.textContent = '';
    info.appendChild(el('div', 'tt-school', s.schoolName));
    info.appendChild(el('span', '', 'Class: ' + s.className));
    if (s.section) { info.appendChild(el('span', '', 'Section: ' + s.section)); }
    if (s.academicYear) { info.appendChild(el('span', '', 'Academic Year: ' + s.academicYear)); }
  }

  function buildTable() {
    var s = timetable.settings;
    var table = el('table', 'timetable');
    table.setAttribute('aria-label', 'Weekly timetable');

    // Header row: Time + one column per working day
    var headRow = el('tr');
    var timeHead = el('th', '', 'Time');
    timeHead.scope = 'col';
    headRow.appendChild(timeHead);
    for (var d = 0; d < s.numDays; d++) {
      var dayHead = el('th', '', DAYS[d]);
      dayHead.scope = 'col';
      headRow.appendChild(dayHead);
    }
    table.appendChild(el('thead')).appendChild(headRow);

    // Body: one row per period, plus the break row
    var body = el('tbody');
    buildRows(s).forEach(function (row) {
      var tr = el('tr');
      var th = el('th');
      th.scope = 'row';
      if (row.type === 'break') {
        th.textContent = row.label;
        tr.appendChild(th);
        var breakCell = el('td', 'break-cell', '☕ BREAK (' + row.minutes + ' min)');
        breakCell.colSpan = s.numDays;
        tr.appendChild(breakCell);
      } else {
        th.appendChild(el('span', '', 'Period ' + (row.index + 1)));
        th.appendChild(document.createTextNode(row.label));
        tr.appendChild(th);
        for (var day = 0; day < s.numDays; day++) {
          var td = el('td');
          td.appendChild(buildSlot(day, row.index));
          tr.appendChild(td);
        }
      }
      body.appendChild(tr);
    });
    table.appendChild(body);
    return table;
  }

  function buildSlot(day, period) {
    var entry = timetable.grid[day][period];
    var button = el('button', 'slot');
    button.type = 'button';
    button.dataset.day = day;
    button.dataset.period = period;

    if (!entry.subject) {
      button.classList.add('slot-empty');
      button.textContent = '+ Add';
      button.setAttribute('aria-label', 'Add subject for ' + DAYS[day] + ', period ' + (period + 1));
      return button;
    }
    var colors = subjectColors(entry.subject);
    button.style.setProperty('--bg-slot', colors.bg);
    button.style.setProperty('--bar', colors.bar);
    button.appendChild(el('div', 'slot-subject', entry.subject));
    if (entry.teacher) { button.appendChild(el('div', 'slot-meta', entry.teacher)); }
    if (entry.room) { button.appendChild(el('div', 'slot-meta', 'Room ' + entry.room)); }
    button.setAttribute('aria-label', DAYS[day] + ', period ' + (period + 1) + ': ' + entry.subject + '. Click to edit.');
    return button;
  }

  /* ---------- 6. EDIT DIALOG ---------- */
  function fillSubjectDropdown() {
    var select = $('slotSubjectSelect');
    select.textContent = '';
    select.appendChild(new Option('— No subject —', ''));
    DEFAULT_SUBJECTS.forEach(function (name) { select.appendChild(new Option(name, name)); });
    select.appendChild(new Option('Custom subject…', '__custom__'));
  }

  function toggleCustomField() {
    var isCustom = $('slotSubjectSelect').value === '__custom__';
    $('customWrap').hidden = !isCustom;
    if (isCustom) { $('slotSubjectCustom').focus(); }
  }

  function openSlotDialog(day, period) {
    editing = { day: day, period: period };
    var entry = timetable.grid[day][period];
    $('slotSub').textContent = DAYS[day] + ' · Period ' + (period + 1);
    $('err-slot').textContent = '';

    var select = $('slotSubjectSelect');
    if (entry.subject && DEFAULT_SUBJECTS.indexOf(entry.subject) === -1) {
      select.value = '__custom__';
      $('slotSubjectCustom').value = entry.subject;
    } else {
      select.value = entry.subject;
      $('slotSubjectCustom').value = '';
    }
    $('customWrap').hidden = select.value !== '__custom__';
    $('slotTeacher').value = entry.teacher;
    $('slotRoom').value = entry.room;
    $('slotDialog').showModal();
  }

  function saveSlot(event) {
    event.preventDefault();
    var select = $('slotSubjectSelect').value;
    var subject = (select === '__custom__' ? $('slotSubjectCustom').value : select).trim();
    var teacher = $('slotTeacher').value.trim();
    var room = $('slotRoom').value.trim();

    if (!subject && (teacher || room)) {
      $('err-slot').textContent = 'Please enter a subject name, or clear the teacher and room.';
      return;
    }
    timetable.grid[editing.day][editing.period] = { subject: subject, teacher: teacher, room: room };
    $('slotDialog').close();
    render();
    showToast(subject ? 'Entry saved.' : 'Entry cleared.');
  }

  function clearSlot() {
    timetable.grid[editing.day][editing.period] = { subject: '', teacher: '', room: '' };
    $('slotDialog').close();
    render();
    showToast('Entry cleared.');
  }

  /* ---------- 7. QUICK FILL, SAMPLE, SAVE / LOAD ---------- */
  function requireTimetable() {
    if (timetable) { return true; }
    showToast('Please generate a timetable first.', true);
    return false;
  }

  // Fill only the empty boxes by cycling through the default subjects
  function quickFill() {
    if (!requireTimetable()) { return; }
    var s = timetable.settings;
    for (var d = 0; d < s.numDays; d++) {
      for (var p = 0; p < s.numPeriods; p++) {
        var cell = timetable.grid[d][p];
        if (!cell.subject) { cell.subject = DEFAULT_SUBJECTS[(d * 3 + p) % DEFAULT_SUBJECTS.length]; }
      }
    }
    render();
    showToast('Empty periods filled with default subjects.');
  }

  function loadSample() {
    var settings = {
      schoolName: 'ABC Higher Secondary School', className: 'XII', section: 'A', academicYear: '2026-2027',
      numDays: 6, numPeriods: 6, startTime: '09:00', periodDuration: 45, breakAfter: 3, breakDuration: 15
    };
    var grid = emptyGrid();
    SAMPLE_SCHEDULE.forEach(function (daySubjects, d) {
      daySubjects.forEach(function (subject, p) {
        grid[d][p] = { subject: subject, teacher: SAMPLE_INFO[subject][0], room: SAMPLE_INFO[subject][1] };
      });
    });
    fillSetupForm(settings);
    showErrors({});
    timetable = { settings: settings, grid: grid };
    render();
    showToast('Sample timetable loaded.');
  }

  function formatSavedTime(isoText) {
    var date = new Date(isoText);
    return isNaN(date.getTime()) ? 'unknown' : date.toLocaleString();
  }

  function readSaved() {
    try {
      var text = localStorage.getItem(STORAGE_KEY);
      if (!text) { return null; }
      var data = JSON.parse(text);
      return data && data.settings && data.grid ? data : null;
    } catch (error) {
      return null; // storage blocked or data damaged
    }
  }

  function saveTimetable() {
    if (!requireTimetable()) { return; }
    var savedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: timetable.settings, grid: timetable.grid, savedAt: savedAt }));
      $('lastSaved').textContent = 'Last saved: ' + formatSavedTime(savedAt);
      $('restoreBar').hidden = true;
      showToast('Timetable saved successfully.');
    } catch (error) {
      showToast('Could not save. Your browser may be blocking storage.', true);
    }
  }

  function loadTimetable() {
    var saved = readSaved();
    if (!saved) {
      showToast('No saved timetable found.', true);
      return;
    }
    fillSetupForm(saved.settings);
    var result = readSettings();
    showErrors(result.errors);
    if (Object.keys(result.errors).length) {
      showToast('The saved timetable has invalid settings.', true);
      return;
    }
    timetable = { settings: result.settings, grid: cleanGrid(saved.grid) };
    render();
    $('restoreBar').hidden = true;
    showToast('Saved timetable loaded.');
  }

  function clearAll() {
    $('confirmDialog').close();
    if (!timetable) { return; }
    timetable.grid = emptyGrid();
    render();
    showToast('Timetable cleared.');
  }

  /* ---------- 8. PRINT & PDF ---------- */
  function printTimetable() {
    if (!requireTimetable()) { return; }
    window.print();
  }

  function downloadPdf() {
    if (!requireTimetable()) { return; }
    if (typeof window.html2pdf === 'undefined') {
      showToast('PDF tool could not load. Check your internet connection.', true);
      return;
    }
    // Copy the timetable into an off-screen box so it is captured at full width
    var stage = $('pdfStage');
    stage.textContent = '';
    stage.appendChild($('printArea').cloneNode(true));

    var options = {
      margin: 8, filename: 'School_Timetable.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 1152 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    window.html2pdf().set(options).from(stage).save()
      .then(function () { showToast('PDF downloaded.'); })
      .catch(function () { showToast('Could not create the PDF. Please try again.', true); })
      .then(function () { stage.textContent = ''; });
  }

  /* ---------- 9. START-UP & BUTTONS ---------- */
  function showSavedInfo() {
    var saved = readSaved();
    if (!saved) { return; }
    var when = formatSavedTime(saved.savedAt);
    $('lastSaved').textContent = 'Last saved: ' + when;
    $('restoreText').textContent = 'A saved timetable was found (saved ' + when + ').';
    $('restoreBar').hidden = false;
  }

  function init() {
    fillSubjectDropdown();
    $('setupForm').addEventListener('submit', function (e) { e.preventDefault(); generateTimetable(); });
    $('sampleBtn').addEventListener('click', loadSample);
    $('quickFillBtn').addEventListener('click', quickFill);
    $('saveBtn').addEventListener('click', saveTimetable);
    $('loadBtn').addEventListener('click', loadTimetable);
    $('restoreBtn').addEventListener('click', loadTimetable);
    $('printBtn').addEventListener('click', printTimetable);
    $('pdfBtn').addEventListener('click', downloadPdf);
    $('clearBtn').addEventListener('click', function () {
      if (requireTimetable()) { $('confirmDialog').showModal(); }
    });
    $('confirmYes').addEventListener('click', clearAll);
    $('confirmNo').addEventListener('click', function () { $('confirmDialog').close(); });

    $('slotForm').addEventListener('submit', saveSlot);
    $('slotCancel').addEventListener('click', function () { $('slotDialog').close(); });
    $('slotClear').addEventListener('click', clearSlot);
    $('slotSubjectSelect').addEventListener('change', toggleCustomField);

    // One click listener for every timetable box
    $('tableWrap').addEventListener('click', function (e) {
      var slot = e.target.closest('.slot');
      if (slot && timetable) { openSlotDialog(Number(slot.dataset.day), Number(slot.dataset.period)); }
    });

    render();
    showSavedInfo();
  }

  init();
})();
