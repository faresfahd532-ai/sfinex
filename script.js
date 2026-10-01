document.addEventListener('DOMContentLoaded', () => {
  // ===== Elements =====
  const langToggle = document.getElementById('lang-toggle');
  const langLabel = document.getElementById('lang-label');
  const passwordInput = document.getElementById('password-input');
  const meterFill = document.getElementById('meter-fill');
  const strengthLabel = document.getElementById('strength-label');
  const feedbackList = document.getElementById('feedback-list');
  const toggleVisibility = document.getElementById('toggle-visibility');
  const plainTextEl = document.getElementById('plain-text');
  const encPassEl = document.getElementById('enc-pass');
  const encResultEl = document.getElementById('enc-result');
  const btnEncrypt = document.getElementById('btn-encrypt');
  const btnDecrypt = document.getElementById('btn-decrypt');
  const btnClear = document.getElementById('btn-clear');
  const btnCopy = document.getElementById('btn-copy');

  let currentLang = localStorage.getItem('sfinex-lang') || 'en';

  const commonPatterns = [
    '123456', 'password', 'qwerty', 'abc123', '111111', '12345678',
    '123456789', '12345', '1234', 'admin', 'welcome', 'monkey'
  ];

  function evaluatePassword(pw) {
    const feedback = [];
    let score = 0;
    if (!pw) return { score: 0, label: '—', className: '', feedback: [] };

    if (pw.length >= 12) score += 30;
    else if (pw.length >= 8) {
      score += 20;
      feedback.push(currentLang === 'ar' ? 'يفضّل أن تكون 12 حرفًا أو أكثر' : 'Prefer 12+ characters');
    } else {
      score += 5;
      feedback.push(currentLang === 'ar' ? 'قصيرة جدًا (8 أحرف كحد أدنى مُستحسن)' : 'Too short (8+ characters recommended)');
    }

    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    let variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
    score += variety * 15;
    if (variety < 3) {
      feedback.push(currentLang === 'ar' ? 'أضف أحرفًا كبيرة وصغيرة وأرقامًا ورموزًا' : 'Add uppercase, lowercase, numbers and symbols');
    }

    const lowerPw = pw.toLowerCase();
    if (commonPatterns.some(p => lowerPw.includes(p))) {
      score = Math.max(0, score - 25);
      feedback.push(currentLang === 'ar' ? 'تحتوي على نمط شائع أو كلمة مرور معروفة' : 'Contains a common pattern or known weak password');
    }
    if (/(.)\1{2,}/.test(pw)) {
      score = Math.max(0, score - 10);
      feedback.push(currentLang === 'ar' ? 'تجنب تكرار نفس الحرف كثيرًا' : 'Avoid repeating the same character many times');
    }
    if (/abc|bcd|cde|123|234|345|456|567|678|789/i.test(pw)) {
      score = Math.max(0, score - 10);
      feedback.push(currentLang === 'ar' ? 'تجنب التسلسلات البسيطة (مثل 123 أو abc)' : 'Avoid simple sequences (like 123 or abc)');
    }

    score = Math.min(100, Math.max(0, score));
    let label, className;
    if (score < 30) { label = currentLang === 'ar' ? 'ضعيفة' : 'Weak'; className = 'weak'; }
    else if (score < 55) { label = currentLang === 'ar' ? 'متوسطة' : 'Fair'; className = 'fair'; }
    else if (score < 80) { label = currentLang === 'ar' ? 'جيدة' : 'Good'; className = 'good'; }
    else { label = currentLang === 'ar' ? 'قوية' : 'Strong'; className = 'strong'; }
    return { score, label, className, feedback };
  }

  function updateMeter() {
    if (!passwordInput || !meterFill || !strengthLabel) return;
    const result = evaluatePassword(passwordInput.value);
    meterFill.style.width = result.score + '%';
    meterFill.className = 'meter-fill ' + result.className;
    strengthLabel.textContent = (currentLang === 'ar' ? 'القوة: ' : 'Strength: ') + result.label;
    if (feedbackList) {
      feedbackList.innerHTML = '';
      result.feedback.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        feedbackList.appendChild(li);
      });
    }
  }

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('sfinex-lang', lang);
    const isAr = lang === 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', isAr);
    if (langLabel) langLabel.textContent = isAr ? 'English' : 'عربي';

    document.querySelectorAll('[data-en]').forEach(el => {
      const text = isAr ? el.getAttribute('data-ar') : el.getAttribute('data-en');
      if (text !== null) el.textContent = text;
    });

    // Placeholders
    document.querySelectorAll('[data-en-placeholder]').forEach(el => {
      el.placeholder = isAr ? el.getAttribute('data-ar-placeholder') : el.getAttribute('data-en-placeholder');
    });
    if (passwordInput) passwordInput.placeholder = isAr ? 'اكتب هنا...' : 'Type here...';
    if (plainTextEl) plainTextEl.placeholder = isAr ? 'أدخل النص هنا...' : 'Enter text here...';
    if (encPassEl) encPassEl.placeholder = isAr ? 'اختر عبارة مرور' : 'Choose a passphrase';
    if (encResultEl) encResultEl.placeholder = isAr ? 'ستظهر النتيجة هنا...' : 'Output will appear here...';

    updateMeter();
  }

  setLanguage(currentLang);

  if (langToggle) {
    langToggle.addEventListener('click', () => setLanguage(currentLang === 'en' ? 'ar' : 'en'));
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', updateMeter);
    updateMeter();
  }
  if (toggleVisibility && passwordInput) {
    toggleVisibility.addEventListener('click', () => {
      const show = passwordInput.type === 'password';
      passwordInput.type = show ? 'text' : 'password';
      toggleVisibility.textContent = show ? '🙈' : '👁';
    });
  }

  // ===== AES Encryption =====
  async function deriveKey(passphrase, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function base64ToBuf(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  if (btnEncrypt) {
    btnEncrypt.addEventListener('click', async () => {
      const text = plainTextEl.value;
      const pass = encPassEl.value;
      if (!text || !pass) {
        encResultEl.value = currentLang === 'ar' ? 'أدخل النص وعبارة المرور' : 'Enter both text and passphrase';
        return;
      }
      try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(pass, salt);
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
        encResultEl.value = bufToBase64(salt) + '.' + bufToBase64(iv) + '.' + bufToBase64(ciphertext);
      } catch (e) {
        encResultEl.value = currentLang === 'ar' ? 'حدث خطأ أثناء التشفير' : 'Encryption error';
      }
    });
  }

  if (btnDecrypt) {
    btnDecrypt.addEventListener('click', async () => {
      // Prefer result field, otherwise plain-text field (user can paste ciphertext there)
      const packed = (encResultEl.value.trim() || plainTextEl.value.trim());
      const pass = encPassEl.value;
      if (!packed || !pass) {
        encResultEl.value = currentLang === 'ar' ? 'الصق النص المشفر وضع عبارة المرور ثم اضغط فك التشفير' : 'Paste ciphertext, enter passphrase, then click Decrypt';
        return;
      }
      try {
        const parts = packed.split('.');
        if (parts.length !== 3) throw new Error('Invalid format');
        const salt = base64ToBuf(parts[0]);
        const iv = base64ToBuf(parts[1]);
        const data = base64ToBuf(parts[2]);
        const key = await deriveKey(pass, new Uint8Array(salt));
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, data);
        encResultEl.value = new TextDecoder().decode(decrypted);
      } catch (e) {
        encResultEl.value = currentLang === 'ar' ? 'فشل فك التشفير — تحقق من عبارة المرور أو أن النص مشفر بشكل صحيح' : 'Decryption failed — check passphrase or that the text is valid ciphertext';
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (plainTextEl) plainTextEl.value = '';
      if (encPassEl) encPassEl.value = '';
      if (encResultEl) encResultEl.value = '';
    });
  }

  if (btnCopy && encResultEl) {
    btnCopy.addEventListener('click', async () => {
      if (!encResultEl.value) return;
      try {
        await navigator.clipboard.writeText(encResultEl.value);
        const old = btnCopy.textContent;
        btnCopy.textContent = currentLang === 'ar' ? 'تم النسخ!' : 'Copied!';
        setTimeout(() => { btnCopy.textContent = old; }, 1500);
      } catch (e) {}
    });
  }

  // ===== Simulated Penetration Test =====
  const btnSimPentest = document.getElementById('btn-sim-pentest');
  if (btnSimPentest) {
    btnSimPentest.addEventListener('click', () => {
      const wrap = document.getElementById('sim-progress-wrap');
      const fill = document.getElementById('sim-progress-fill');
      const status = document.getElementById('sim-status');
      const results = document.getElementById('sim-results');
      const target = document.getElementById('sim-target')?.value.trim() || 'target.example';

      results.hidden = true;
      wrap.hidden = false;
      fill.style.width = '0%';
      btnSimPentest.disabled = true;

      const steps = currentLang === 'ar' ? [
        'جاري التهيئة...',
        'فحص المنافذ الشائعة (تجريبي)...',
        'تحليل الرؤوس والاستجابات...',
        'البحث عن إعدادات ضعيفة...',
        'تجميع النتائج التجريبية...'
      ] : [
        'Initializing...',
        'Checking common ports (simulated)...',
        'Analyzing headers and responses...',
        'Looking for weak configurations...',
        'Compiling sample findings...'
      ];

      let progress = 0;
      let step = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 18 + 8;
        if (progress > 100) progress = 100;
        fill.style.width = progress + '%';
        if (step < steps.length) {
          status.textContent = steps[step] + '  [' + target + ']';
          step++;
        }
        if (progress >= 100) {
          clearInterval(interval);
          status.textContent = currentLang === 'ar' ? 'اكتملت المحاكاة' : 'Simulation complete';
          results.hidden = false;
          btnSimPentest.disabled = false;
          // Re-apply language to new visible elements
          setLanguage(currentLang);
        }
      }, 450);
    });
  }

  // ===== Simulated Network Check =====
  const btnSimNetwork = document.getElementById('btn-sim-network');
  if (btnSimNetwork) {
    btnSimNetwork.addEventListener('click', () => {
      const wrap = document.getElementById('net-progress-wrap');
      const fill = document.getElementById('net-progress-fill');
      const status = document.getElementById('net-status');
      const results = document.getElementById('net-results');
      const tbody = document.getElementById('net-table-body');
      const target = document.getElementById('net-target')?.value.trim() || '192.168.1.0/24';

      results.hidden = true;
      wrap.hidden = false;
      fill.style.width = '0%';
      btnSimNetwork.disabled = true;
      tbody.innerHTML = '';

      const steps = currentLang === 'ar' ? [
        'تحضير الفحص التجريبي...',
        'محاكاة اكتشاف المضيفين...',
        'توليد بيانات المنافذ...',
        'إنهاء الملخص...'
      ] : [
        'Preparing simulated check...',
        'Simulating host discovery...',
        'Generating port data...',
        'Finalizing summary...'
      ];

      let progress = 0;
      let step = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 10;
        if (progress > 100) progress = 100;
        fill.style.width = progress + '%';
        if (step < steps.length) {
          status.textContent = steps[step] + '  [' + target + ']';
          step++;
        }
        if (progress >= 100) {
          clearInterval(interval);
          status.textContent = currentLang === 'ar' ? 'اكتملت المحاكاة' : 'Simulation complete';

          // Fake hosts
          const fakeHosts = [
            { host: '192.168.1.1', status: 'up', ports: '22, 80, 443' },
            { host: '192.168.1.10', status: 'up', ports: '80, 443, 8080' },
            { host: '192.168.1.25', status: 'up', ports: '22' },
            { host: '192.168.1.50', status: 'down', ports: '—' },
            { host: '192.168.1.100', status: 'up', ports: '3389, 445' }
          ];

          fakeHosts.forEach(h => {
            const tr = document.createElement('tr');
            const statusClass = h.status === 'up' ? 'status-up' : 'status-down';
            const statusText = h.status === 'up'
              ? (currentLang === 'ar' ? 'نشط' : 'Up')
              : (currentLang === 'ar' ? 'غير نشط' : 'Down');
            tr.innerHTML = `
              <td>${h.host}</td>
              <td class="${statusClass}">${statusText}</td>
              <td>${h.ports}</td>
            `;
            tbody.appendChild(tr);
          });

          results.hidden = false;
          btnSimNetwork.disabled = false;
          setLanguage(currentLang);
        }
      }, 400);
    });
  }
});
