// ── Real backend contract ────────────────────────────────────────
    // Same endpoint + field names the MuslimEdu app itself posts to
    // (see src/services/schoolRegistrationService.ts:submitSchoolRegistration).
    // Unauthenticated multipart POST → { status: 'pending', registration_id }.
    // A submission here lands in the exact same superadmin review queue
    // (Pending Registrations) as one made from the app.
    var API_BASE_URL = 'https://manhaje.com/apps/api';
    var SUBMIT_ENDPOINT = API_BASE_URL + '/school_registration_submit';

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Same taxonomy + copy as the app's institution-type picker.
    var STANDARD_FEATURES = [
      'Classes, attendance & gradebook',
      'Exams, grading & report cards',
      'Fee collection & student enrollment'
    ];
    var INSTITUTION_TYPES = [
      { type: 'mahad', name: 'Mahad', icon: '🕌', tagline: 'Islamic seminary or full-time program', features: STANDARD_FEATURES },
      { type: 'madrasa', name: 'Madrasa', icon: '📖', tagline: 'Part-time or weekend Islamic school', features: STANDARD_FEATURES },
      { type: 'markaz', name: 'Markaz', icon: '🏛️', tagline: 'Community learning center', features: STANDARD_FEATURES.concat(['Quran memorization (Hifz) tracking']) },
      { type: 'regular_school', name: 'Regular School', icon: '🏫', tagline: 'Full curriculum school', features: STANDARD_FEATURES },
      { type: 'orphanage', name: 'Orphan School', icon: '🤲', tagline: 'Orphan care institution — no class-based curriculum', features: ['Orphan child profiles & care records', 'Monthly progress reports from teachers & admin', 'Sponsorship & donor management'] }
    ];

    // Same rules as the app's PASSWORD_RULES / isPasswordStrong.
    var PASSWORD_RULES = [
      { key: 'length', label: 'At least 8 characters', test: function (pw) { return pw.length >= 8; } },
      { key: 'upper', label: 'One uppercase letter (A-Z)', test: function (pw) { return /[A-Z]/.test(pw); } },
      { key: 'lower', label: 'One lowercase letter (a-z)', test: function (pw) { return /[a-z]/.test(pw); } },
      { key: 'number', label: 'One number (0-9)', test: function (pw) { return /[0-9]/.test(pw); } },
      { key: 'special', label: 'One special character (!@#$...)', test: function (pw) { return /[^A-Za-z0-9]/.test(pw); } }
    ];
    function passwordStrong(pw) {
      return PASSWORD_RULES.every(function (r) { return r.test(pw); });
    }

    // ── State ────────────────────────────────────────────────────────
    var state = {
      institutionType: null,
      idFile: null,       // resized Blob ready to upload
      selfieFile: null,
    };

    // ── Institution type grid ───────────────────────────────────────
    var typeGrid = document.getElementById('typeGrid');
    INSTITUTION_TYPES.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'type-tile';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.dataset.type = opt.type;
      btn.innerHTML = '<span class="type-tile-icon">' + opt.icon + '</span><span class="type-tile-name">' + opt.name + '</span>';
      btn.addEventListener('click', function () { selectType(opt.type); });
      typeGrid.appendChild(btn);
    });

    function selectType(type) {
      state.institutionType = type;
      Array.prototype.forEach.call(typeGrid.children, function (el) {
        var active = el.dataset.type === type;
        el.classList.toggle('active', active);
        el.setAttribute('aria-checked', String(active));
      });
      var meta = INSTITUTION_TYPES.filter(function (o) { return o.type === type; })[0];
      var preview = document.getElementById('typePreview');
      preview.classList.add('filled');
      document.getElementById('typePreviewTag').textContent = meta.tagline;
      var list = document.getElementById('typePreviewList');
      list.innerHTML = '';
      meta.features.forEach(function (f) {
        var row = document.createElement('div');
        row.className = 'type-preview-feature';
        row.textContent = f;
        list.appendChild(row);
      });
      validateForm();
    }

    // ── Password checklist ──────────────────────────────────────────
    var pwChecklist = document.getElementById('pwChecklist');
    PASSWORD_RULES.forEach(function (rule) {
      var row = document.createElement('div');
      row.className = 'pw-rule';
      row.id = 'pwRule_' + rule.key;
      row.innerHTML = '<span class="pw-rule-dot">✓</span><span>' + rule.label + '</span>';
      pwChecklist.appendChild(row);
    });

    var passwordInput = document.getElementById('password');
    var confirmInput = document.getElementById('confirmPassword');
    passwordInput.addEventListener('input', function () {
      var pw = passwordInput.value;
      pwChecklist.classList.toggle('show', pw.length > 0);
      PASSWORD_RULES.forEach(function (rule) {
        document.getElementById('pwRule_' + rule.key).classList.toggle('met', rule.test(pw));
      });
      checkConfirmMatch();
      validateForm();
    });
    confirmInput.addEventListener('input', function () { checkConfirmMatch(); validateForm(); });
    function checkConfirmMatch() {
      var mismatch = confirmInput.value.length > 0 && confirmInput.value !== passwordInput.value;
      document.getElementById('confirmErr').style.display = mismatch ? 'block' : 'none';
      confirmInput.classList.toggle('field-invalid', mismatch);
    }

    // ── Admin email live check ──────────────────────────────────────
    var adminEmailInput = document.getElementById('adminEmail');
    adminEmailInput.addEventListener('input', function () {
      var v = adminEmailInput.value.trim();
      var ok = document.getElementById('adminEmailOk');
      var err = document.getElementById('adminEmailErr');
      if (!v) { ok.style.display = 'none'; err.style.display = 'none'; adminEmailInput.classList.remove('field-invalid'); }
      else if (EMAIL_RE.test(v)) { ok.style.display = 'flex'; err.style.display = 'none'; adminEmailInput.classList.remove('field-invalid'); }
      else { ok.style.display = 'none'; err.style.display = 'block'; adminEmailInput.classList.add('field-invalid'); }
      validateForm();
    });

    // ── Photo upload + client-side downscale (mirrors the app's
    //    ~200KB on-device compression before upload, done here with
    //    a canvas since a browser can't call the native resizer). ──
    function compressImage(file, maxDim, maxBytes) {
      maxDim = maxDim || 1600;
      maxBytes = maxBytes || 200 * 1024;
      return new Promise(function (resolve, reject) {
        var img = new Image();
        var url = URL.createObjectURL(file);
        img.onload = function () {
          URL.revokeObjectURL(url);
          var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale);
          var h = Math.round(img.height * scale);
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);

          var qualities = [0.85, 0.7, 0.55, 0.4];
          function tryQuality(i) {
            canvas.toBlob(function (blob) {
              if (!blob) { resolve(file); return; } // fall back to the original file
              if (blob.size <= maxBytes || i === qualities.length - 1) resolve(blob);
              else tryQuality(i + 1);
            }, 'image/jpeg', qualities[i]);
          }
          tryQuality(0);
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(file); }; // best-effort - upload original rather than block the user
        img.src = url;
      });
    }

    function wireUpload(inputId, previewId, stateKey) {
      var input = document.getElementById(inputId);
      var preview = document.getElementById(previewId);
      var card = input.closest('.upload-card');
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        preview.src = URL.createObjectURL(file);
        card.classList.add('has-file');
        compressImage(file).then(function (resized) {
          state[stateKey] = resized;
          validateForm();
        });
      });
    }
    wireUpload('idDocument', 'idPreview', 'idFile');
    wireUpload('selfie', 'selfiePreview', 'selfieFile');

    // ── Required-text-field live validity ───────────────────────────
    ['schoolName', 'adminName'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', validateForm);
    });

    // ── Overall validity ─────────────────────────────────────────────
    function validateForm() {
      var ok =
        !!state.institutionType &&
        document.getElementById('schoolName').value.trim().length > 0 &&
        document.getElementById('adminName').value.trim().length > 0 &&
        EMAIL_RE.test(adminEmailInput.value.trim()) &&
        passwordStrong(passwordInput.value) &&
        passwordInput.value === confirmInput.value &&
        !!state.idFile &&
        !!state.selfieFile;
      document.getElementById('submitBtn').disabled = !ok;
      return ok;
    }

    // ── Submit ───────────────────────────────────────────────────────
    var form = document.getElementById('regForm');
    var submitBtn = document.getElementById('submitBtn');
    var formError = document.getElementById('formError');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm() || submitBtn.classList.contains('loading')) return;

      formError.style.display = 'none';
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      var fd = new FormData();
      fd.append('school_name', document.getElementById('schoolName').value.trim());
      fd.append('institution_type', state.institutionType);
      var address = document.getElementById('schoolAddress').value.trim();
      if (address) fd.append('school_address', address);
      var schoolEmail = document.getElementById('schoolEmail').value.trim();
      if (schoolEmail) fd.append('school_email', schoolEmail);
      var schoolPhone = document.getElementById('schoolPhone').value.trim();
      if (schoolPhone) fd.append('school_phone', schoolPhone);
      fd.append('admin_name', document.getElementById('adminName').value.trim());
      fd.append('admin_email', adminEmailInput.value.trim());
      var adminPhone = document.getElementById('adminPhone').value.trim();
      if (adminPhone) fd.append('admin_phone', adminPhone);
      fd.append('password', passwordInput.value);
      fd.append('id_document', state.idFile, 'id_document.jpg');
      fd.append('selfie', state.selfieFile, 'selfie.jpg');

      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 45000);

      fetch(SUBMIT_ENDPOINT, { method: 'POST', body: fd, signal: controller.signal })
        .then(function (res) {
          clearTimeout(timeoutId);
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data && data.message ? data.message : 'Request failed (' + res.status + ')');
            return data;
          });
        })
        .then(function () {
          form.style.display = 'none';
          document.getElementById('successCard').style.display = 'block';
          document.getElementById('successCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        })
        .catch(function (err) {
          clearTimeout(timeoutId);
          var msg = err && err.name === 'AbortError'
            ? 'Request timed out. Check your connection and try again.'
            : (err && err.message ? err.message : 'Could not reach the server. Check your connection and try again.');
          formError.textContent = msg;
          formError.style.display = 'block';
          formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .finally(function () {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = !validateForm();
        });
    });
