// Teacher: Enter Grades — class/subject picker, then a Q1-Q4 table for
// that roster (same layout as student-grades.js's My Grades table). Only
// the selected quarter's column is editable; the other three show
// whatever has already been filed for that student under that quarter's
// exam category, fetched in parallel so the whole table is visible at
// once instead of one quarter at a time.
//
// Backend: GradebookApi trait (teacher_gradebook_classes / _roster /
// _submit). Quarter categories (Q1-Q4) are auto-provisioned server-side
// the first time a school's teacher opens this page, so the tabs below
// are never empty even for a brand new school. Saving a quarter writes
// into that exact category's Gradebook row — the same row
// /student_quarterly_report reads on the student's My Grades page, so
// what a teacher fills in here is exactly what the student sees there.

let gbClasses = [];
let quarterCategories = [];      // the 4 quarter-tagged exam categories, sorted Q1-Q4
let selectedClass = null;        // one entry from gbClasses (section_id+subject_id pair)
let activeQuarter = 1;           // 1-4, which quarter's mark is editable right now
let rosterByQuarter = {};        // quarter number -> last-fetched teacher_gradebook_roster response
let studentOrder = [];           // student_id order for the current class, taken from quarter 1's roster
let currentStudentIndex = 0;     // which student's card the wizard is currently showing
let gbBooted = false;

function classKey(c) {
  return c.section_id + ':' + c.subject_id;
}
function classLabel(c) {
  return (c.subject_name || t('teacher_attendance.subject_fallback', 'Subject')) + ' — ' + (c.section_name || t('teacher_attendance.section_fallback', 'Section')) + (c.class_name ? ' (' + c.class_name + ')' : '');
}

function fetchGradebookClasses(token) {
  return authedPost('/teacher_gradebook_classes', token).then(d => ({
    classes: d.classes || [],
    examCategories: d.exam_categories || [],
  }));
}
function fetchGradebookRoster(token, sectionId, subjectId, examCategoryId) {
  return authedPost('/teacher_gradebook_roster', token, {
    section_id: sectionId,
    subject_id: subjectId,
    exam_category_id: examCategoryId,
  });
}
function submitGradebook(token, sectionId, subjectId, examCategoryId, records) {
  return authedPost('/teacher_gradebook_submit', token, {
    section_id: sectionId,
    subject_id: subjectId,
    exam_category_id: examCategoryId,
    records: records,
  });
}

function renderPickerRows(token) {
  const classRow = document.getElementById('classRow');
  classRow.innerHTML =
    '<span class="util-row-title">' + escapeHtml(t('teacher_attendance.class_subject_label', 'Class & Subject')) + '</span>' +
    '<span class="util-row-value">' + escapeHtml(selectedClass ? classLabel(selectedClass) : t('teacher_attendance.select', 'Select')) + '</span>' +
    icon('chevron', { size: 18, color: 'var(--subtle)' });
  classRow.onclick = () => {
    if (!gbClasses.length) { showToast(t('teacher_attendance.no_class_assigned_toast', 'You are not assigned to any classes yet.')); return; }
    openOptionSheet(
      t('teacher_attendance.class_subject_label', 'Class & Subject'),
      gbClasses.map(c => ({ key: classKey(c), label: classLabel(c) })),
      selectedClass ? classKey(selectedClass) : null,
      (key) => {
        selectedClass = gbClasses.find(c => classKey(c) === key) || null;
        onSelectionChanged(token);
      }
    );
  };
}

function onSelectionChanged(token) {
  renderPickerRows(token);
  rosterByQuarter = {};
  studentOrder = [];
  currentStudentIndex = 0;
  activeQuarter = quarterCategories[0] ? quarterCategories[0].quarter : 1;

  if (selectedClass && quarterCategories.length) {
    document.getElementById('quarterWrap').style.display = '';
    renderQuarterTabs(token);
    loadAllQuarters(token);
  } else {
    document.getElementById('quarterWrap').style.display = 'none';
    document.getElementById('gradesContent').innerHTML = selectedClass
      ? '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('teacher_grades.no_quarters_title', 'No quarters set up')) + '</div><div class="list-empty-sub">' + escapeHtml(t('teacher_grades.no_quarters_sub', 'Ask an admin to set up grading quarters for this session.')) + '</div></div>'
      : '';
    document.getElementById('saveBarWrap').style.display = 'none';
  }
}

function renderQuarterTabs(token) {
  const row = document.getElementById('quarterRow');
  row.innerHTML = '';
  quarterCategories.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'gb-quarter-chip' + (cat.quarter === activeQuarter ? ' active' : '');
    chip.textContent = 'Q' + cat.quarter;
    chip.addEventListener('click', () => {
      if (cat.quarter === activeQuarter) return;
      activeQuarter = cat.quarter;
      currentStudentIndex = 0;
      renderQuarterTabs(token);
      renderGradesWizard(token);
    });
    row.appendChild(chip);
  });
  const activeCat = quarterCategories.find(c => c.quarter === activeQuarter);
  document.getElementById('gbHint').textContent = activeCat
    ? t('teacher_grades.hint_filling', 'Filling {name}. The other quarters are shown read-only for reference.').replace('{name}', activeCat.name || t('teacher_grades.quarter_fallback', 'Quarter {n}').replace('{n}', activeQuarter))
    : '';
}

function loadAllQuarters(token) {
  const wrap = document.getElementById('gradesContent');
  document.getElementById('saveBarWrap').style.display = 'none';
  wrap.innerHTML = '<div class="list-loading">' + escapeHtml(t('teacher_attendance.loading_roster', 'Loading roster…')) + '</div>';

  Promise.all(
    quarterCategories.map(cat =>
      fetchGradebookRoster(token, selectedClass.section_id, selectedClass.subject_id, cat.id)
        .then(data => ({ quarter: cat.quarter, data }))
    )
  ).then(results => {
    rosterByQuarter = {};
    results.forEach(r => { rosterByQuarter[r.quarter] = r.data; });
    const first = rosterByQuarter[quarterCategories[0].quarter];
    studentOrder = (first && first.students || []).map(s => s.student_id);
    currentStudentIndex = 0;
    renderGradesWizard(token);
  }).catch(() => {
    wrap.innerHTML =
      '<div class="list-error">' + escapeHtml(t('teacher_attendance.load_roster_error', 'Could not load the roster.')) + '<br><button type="button" class="list-retry-btn" id="rosterRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('rosterRetryBtn')?.addEventListener('click', () => loadAllQuarters(token));
  });
}

function studentRowData(studentId) {
  const out = { name: null, byQuarter: {} };
  quarterCategories.forEach(cat => {
    const roster = rosterByQuarter[cat.quarter];
    const row = roster && (roster.students || []).find(s => s.student_id === studentId);
    if (row && out.name == null) out.name = row.student_name;
    out.byQuarter[cat.quarter] = row || null;
  });
  return out;
}

// Same normalization the backend's student_quarterly_report uses, so the
// preview average shown here matches what the student will actually see.
function computeAverage(byQuarter) {
  const scores = [];
  quarterCategories.forEach(cat => {
    const roster = rosterByQuarter[cat.quarter];
    const row = byQuarter[cat.quarter];
    if (!row || row.mark === null || row.mark === undefined) return;
    const total = roster ? roster.total_marks : null;
    const normalized = (total && total > 0 && total !== 100) ? (row.mark / total) * 100 : row.mark;
    scores.push(normalized);
  });
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function fmtCell(mark) {
  return mark === null || mark === undefined ? '—' : mark;
}
function fmtAvg(avg) {
  return avg === null ? '—' : avg.toFixed(2);
}

// Small reference chips under each student's card - every quarter's mark
// at a glance plus the running average, so the number that used to live
// in its own read-only table column is still visible, just not crammed
// into a column that had to squeeze a whole name next to it.
function studentReferenceChipsHtml(data, avg) {
  const marks = quarterCategories.map(cat => {
    const row = data.byQuarter[cat.quarter];
    const isCurrent = cat.quarter === activeQuarter;
    return '<span class="gbw-ref-chip' + (isCurrent ? ' current' : '') + '">Q' + cat.quarter + ': ' + escapeHtml(String(fmtCell(row && row.mark))) + '</span>';
  }).join('');
  return marks + '<span class="gbw-ref-chip avg">' + escapeHtml(t('teacher_grades.header_avg', 'AVG')) + ': ' + escapeHtml(fmtAvg(avg)) + '</span>';
}

// One student at a time instead of a Student × Q1-Q4 × AVG table crammed
// into a phone-width row (which is what was truncating names and packing
// every quarter's mark into unreadable little cells). Every student's
// card is built up front and kept in the DOM the whole time - Prev/Next
// only toggle which one is visible - so collectRecords() below can still
// read every student's input regardless of which card the teacher is
// currently looking at, exactly like the old table let them fill several
// rows before ever hitting Save.
function renderGradesWizard(token) {
  const wrap = document.getElementById('gradesContent');
  if (!studentOrder.length) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('teacher_attendance.no_students', 'No students in this class')) + '</div></div>';
    document.getElementById('saveBarWrap').style.display = 'none';
    return;
  }
  if (currentStudentIndex >= studentOrder.length) currentStudentIndex = 0;

  const activeRoster = rosterByQuarter[activeQuarter];
  const totalMarks = activeRoster ? activeRoster.total_marks : null;
  const markLabel = t('teacher_grades.mark_label', 'Q{q} Mark').replace('{q}', activeQuarter);
  const outOfSuffix = totalMarks !== null && totalMarks !== undefined
    ? ' <span class="gbw-mark-label-suffix">' + escapeHtml(t('teacher_grades.out_of_short', '(out of {total})').replace('{total}', String(totalMarks))) + '</span>'
    : '';

  const cardsHtml = studentOrder.map((studentId, idx) => {
    const data = studentRowData(studentId);
    const avg = computeAverage(data.byQuarter);
    const activeRow = data.byQuarter[activeQuarter];
    const val = activeRow && activeRow.mark !== null && activeRow.mark !== undefined ? activeRow.mark : '';

    return (
      '<div class="gbw-card" data-student-card="' + studentId + '"' + (idx === currentStudentIndex ? '' : ' style="display:none;"') + '>' +
        '<div class="gbw-student-header">' +
          postAvatarHtml(null, data.name, 48) +
          '<span class="gbw-student-name">' + escapeHtml(data.name || '') + '</span>' +
        '</div>' +
        '<div class="gbw-mark-block">' +
          '<label class="gbw-mark-label">' + escapeHtml(markLabel) + outOfSuffix + '</label>' +
          '<input type="number" inputmode="decimal" class="gbw-mark-input" data-mark-for="' + studentId + '" ' +
            'min="0"' + (totalMarks !== null && totalMarks !== undefined ? ' max="' + totalMarks + '"' : '') + ' ' +
            'value="' + escapeHtml(String(val)) + '" placeholder="—" />' +
        '</div>' +
        '<div class="gbw-comment-block">' +
          '<label>' + escapeHtml(t('teacher_grades.comment_title', 'Comment')) + ' <span class="gbw-mark-label-suffix">(' + escapeHtml(t('teacher_grades.optional', 'optional')) + ')</span></label>' +
          '<textarea data-comment-for="' + studentId + '" placeholder="' + escapeHtml(t('teacher_grades.comment_placeholder', 'Comment for Q{q} (optional)').replace('{q}', activeQuarter)) + '">' + escapeHtml((activeRow && activeRow.comment) || '') + '</textarea>' +
        '</div>' +
        '<div class="gbw-reference-row">' + studentReferenceChipsHtml(data, avg) + '</div>' +
      '</div>'
    );
  }).join('');

  wrap.innerHTML =
    '<div class="gbw-progress-row">' +
      '<span class="gbw-progress-label" id="gbwProgressLabel"></span>' +
      '<div class="gbw-progress-track"><div class="gbw-progress-fill" id="gbwProgressFill"></div></div>' +
    '</div>' +
    cardsHtml +
    '<div class="gbw-nav-row">' +
      '<button type="button" class="gbw-nav-btn" id="gbwPrevBtn">' + escapeHtml(t('teacher_grades.prev_student', '‹ Prev')) + '</button>' +
      '<button type="button" class="gbw-nav-btn primary" id="gbwNextBtn">' + escapeHtml(t('teacher_grades.next_student', 'Next ›')) + '</button>' +
    '</div>' +
    '<div class="gbw-last-hint" id="gbwLastHint" style="display:none;">' + escapeHtml(t('teacher_grades.last_student_hint', "That's everyone - tap Save below when you're ready.")) + '</div>';

  document.getElementById('gbwPrevBtn').addEventListener('click', () => goToStudent(currentStudentIndex - 1));
  document.getElementById('gbwNextBtn').addEventListener('click', () => goToStudent(currentStudentIndex + 1));
  updateWizardChrome();

  document.getElementById('saveGradesLabel').textContent = t('teacher_grades.save_q_grades', 'Save Q{q} Grades').replace('{q}', activeQuarter);
  document.getElementById('saveBarWrap').style.display = '';
}

// Just swaps which card is visible - never rebuilds the cards themselves,
// so nothing a teacher already typed on another student is ever touched
// by moving around between them.
function goToStudent(index) {
  if (index < 0 || index >= studentOrder.length) return;
  const current = document.querySelector('[data-student-card="' + studentOrder[currentStudentIndex] + '"]');
  if (current) current.style.display = 'none';
  currentStudentIndex = index;
  const next = document.querySelector('[data-student-card="' + studentOrder[currentStudentIndex] + '"]');
  if (next) next.style.display = '';
  updateWizardChrome();
}

function updateWizardChrome() {
  const total = studentOrder.length;
  const n = currentStudentIndex + 1;
  const label = document.getElementById('gbwProgressLabel');
  const fill = document.getElementById('gbwProgressFill');
  const prevBtn = document.getElementById('gbwPrevBtn');
  const nextBtn = document.getElementById('gbwNextBtn');
  const lastHint = document.getElementById('gbwLastHint');
  if (!label) return;
  label.textContent = t('teacher_grades.student_progress', 'Student {n} of {total}').replace('{n}', String(n)).replace('{total}', String(total));
  fill.style.width = (total > 0 ? (n / total * 100) : 0) + '%';
  prevBtn.disabled = currentStudentIndex === 0;
  const isLast = currentStudentIndex === total - 1;
  nextBtn.disabled = isLast;
  lastHint.style.display = isLast ? '' : 'none';
}

function collectRecords() {
  const activeRoster = rosterByQuarter[activeQuarter];
  const students = (activeRoster && activeRoster.students) || [];
  const records = [];

  students.forEach(s => {
    const markInput = document.querySelector('[data-mark-for="' + s.student_id + '"]');
    const commentInput = document.querySelector('[data-comment-for="' + s.student_id + '"]');
    const rawMark = markInput ? markInput.value.trim() : '';
    const rawComment = commentInput ? commentInput.value.trim() : '';

    const hadComment = !!(s.comment || '').trim();
    const commentChanged = rawComment !== (s.comment || '');

    if (rawMark === '' && !commentChanged) return;

    const record = { student_id: s.student_id, mark: rawMark === '' ? null : Number(rawMark) };
    if (commentChanged || hadComment) record.comment = rawComment || null;
    records.push(record);
  });

  return records;
}

function saveGrades(token) {
  const activeCat = quarterCategories.find(c => c.quarter === activeQuarter);
  const activeRoster = rosterByQuarter[activeQuarter];
  if (!selectedClass || !activeCat || !activeRoster) return;

  const totalMarks = activeRoster.total_marks;
  const records = collectRecords();

  if (!records.length) { showToast(t('teacher_grades.enter_mark_first', 'Enter at least one mark or comment first.')); return; }

  for (const r of records) {
    if (r.mark !== null && (isNaN(r.mark) || r.mark < 0)) {
      showToast(t('teacher_grades.marks_nonneg', 'Marks must be zero or higher.'));
      return;
    }
    if (r.mark !== null && totalMarks !== null && totalMarks !== undefined && r.mark > totalMarks) {
      showToast(t('teacher_grades.mark_exceeds_total', 'A mark exceeds the total of {total}.').replace('{total}', totalMarks));
      return;
    }
  }

  const btn = document.getElementById('saveGradesBtn');
  const label = document.getElementById('saveGradesLabel');
  const savedLabel = t('teacher_grades.save_q_grades', 'Save Q{q} Grades').replace('{q}', activeQuarter);
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  submitGradebook(token, selectedClass.section_id, selectedClass.subject_id, activeCat.id, records)
    .then(() => {
      showToast(t('teacher_grades.saved_toast', 'Q{q} grades saved.').replace('{q}', activeQuarter));
      return fetchGradebookRoster(token, selectedClass.section_id, selectedClass.subject_id, activeCat.id);
    })
    .then(data => {
      rosterByQuarter[activeQuarter] = data;
      renderGradesWizard(token);
    })
    .catch(err => {
      showToast(err && err.message ? err.message : t('teacher_grades.save_failed', 'Could not save grades.'));
    })
    .finally(() => {
      btn.disabled = false;
      label.textContent = savedLabel;
    });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('teacher_grades.title', 'Enter Grades'), t('teacher_grades.subtitle', 'Record marks for your assigned classes, by quarter.'), 'teacher-dashboard.php', null);
}
renderHeaderText();

let taTokenRef = null;

onLocaleChange(() => {
  renderHeaderText();
  if (!gbBooted) return;
  renderPickerRows(taTokenRef);
  if (selectedClass && quarterCategories.length) {
    renderQuarterTabs(taTokenRef);
    if (studentOrder.length) renderGradesWizard(taTokenRef); else loadAllQuarters(taTokenRef);
  } else if (selectedClass) {
    document.getElementById('gradesContent').innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('teacher_grades.no_quarters_title', 'No quarters set up')) + '</div><div class="list-empty-sub">' + escapeHtml(t('teacher_grades.no_quarters_sub', 'Ask an admin to set up grading quarters for this session.')) + '</div></div>';
  } else if (!gbClasses.length) {
    document.getElementById('gradesContent').innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('teacher_attendance.no_classes_title', 'No classes assigned')) + '</div>' +
      '<div class="list-empty-sub">' + escapeHtml(t('teacher_grades.no_classes_sub', 'Ask your admin to assign you to a class and subject.')) + '</div></div>';
  }
});

guardDashboard('teacher', function (user, token) {
  taTokenRef = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('teacher');

  document.getElementById('saveGradesBtn').addEventListener('click', () => saveGrades(token));

  document.getElementById('gradesContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('teacher_attendance.loading_classes', 'Loading your classes…')) + '</div>';
  fetchGradebookClasses(token).then(({ classes, examCategories }) => {
    gbClasses = classes;
    quarterCategories = examCategories
      .filter(c => c.quarter != null)
      .sort((a, b) => a.quarter - b.quarter);
    renderPickerRows(token);
    document.getElementById('gradesContent').innerHTML = '';
    gbBooted = true;
    if (!gbClasses.length) {
      document.getElementById('gradesContent').innerHTML =
        '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('teacher_attendance.no_classes_title', 'No classes assigned')) + '</div>' +
        '<div class="list-empty-sub">' + escapeHtml(t('teacher_grades.no_classes_sub', 'Ask your admin to assign you to a class and subject.')) + '</div></div>';
    }
  }).catch(() => {
    document.getElementById('gradesContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('teacher_attendance.load_classes_error', 'Could not load your classes.')) + '<br><button type="button" class="list-retry-btn" id="classesRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('classesRetryBtn')?.addEventListener('click', () => location.reload());
  });
});
