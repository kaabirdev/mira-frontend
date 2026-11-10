/* Mira auth screens: client-side validation, password reveal, strength meter,
   demo submission and password reset dialog. No credentials are sent anywhere. */
(function () {
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldWrap(input) {
    return input.closest('[data-field]') || input.parentElement;
  }

  function setError(input, message) {
    const wrap = fieldWrap(input);
    const error = document.querySelector('[data-error-for="' + input.name + '"]');
    wrap.classList.add('field-error');
    input.setAttribute('aria-invalid', 'true');
    if (error) {
      const text = error.querySelector('span');
      if (text) text.textContent = message;
      error.classList.remove('hidden');
    }
  }

  function clearError(input) {
    const wrap = fieldWrap(input);
    const error = document.querySelector('[data-error-for="' + input.name + '"]');
    wrap.classList.remove('field-error');
    input.removeAttribute('aria-invalid');
    if (error) error.classList.add('hidden');
  }

  function validateField(input) {
    const value = input.value.trim();
    if (input.type === 'checkbox') {
      if (input.required && !input.checked) {
        setError(input, 'Please accept the terms to continue.');
        return false;
      }
      clearError(input);
      return true;
    }
    if (input.required && !value) {
      setError(input, input.dataset.requiredMessage || 'This field is required.');
      return false;
    }
    if (input.type === 'email' && value && !EMAIL.test(value)) {
      setError(input, 'Enter a valid email address, e.g. you@company.com.');
      return false;
    }
    if (input.type === 'password' && input.minLength > 0 && value.length < input.minLength) {
      setError(input, 'Use at least ' + input.minLength + ' characters.');
      return false;
    }
    if (input.name === 'name' && value.length < 2) {
      setError(input, 'Enter your full name.');
      return false;
    }
    clearError(input);
    return true;
  }

  function initForm(form) {
    const inputs = Array.from(form.querySelectorAll('input[name]'));

    inputs.forEach((input) => {
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') validateField(input);
      });
      input.addEventListener('change', () => {
        if (input.type === 'checkbox') validateField(input);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let firstInvalid = null;
      inputs.forEach((input) => {
        const valid = validateField(input);
        if (!valid && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const submit = form.querySelector('[data-submit]');
      if (submit) {
        if (!submit.dataset.original) submit.dataset.original = submit.innerHTML;
        submit.disabled = true;
        submit.setAttribute('aria-busy', 'true');
        submit.innerHTML =
          '<span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"></span>' +
          '<span>' + (form.dataset.submitLabel || 'Signing in…') + '</span>';
      }

      window.setTimeout(() => {
        window.location.href = form.dataset.redirect || 'app/index.html';
      }, 900);
    });
  }

  function initPasswordToggles() {
    document.querySelectorAll('[data-password-toggle]').forEach((btn) => {
      const input = document.getElementById(btn.dataset.passwordToggle);
      if (!input) return;
      btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        const on = btn.querySelector('[data-eye-show]');
        const off = btn.querySelector('[data-eye-hide]');
        if (on) on.classList.toggle('hidden', show);
        if (off) off.classList.toggle('hidden', !show);
      });
    });
  }

  function scorePassword(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/[\d\W]/.test(value)) score++;
    return Math.min(4, score);
  }

  function initStrength() {
    document.querySelectorAll('[data-strength-for]').forEach((meter) => {
      const input = document.getElementById(meter.dataset.strengthFor);
      if (!input) return;
      const bars = Array.from(meter.querySelectorAll('[data-strength-bar]'));
      const label = meter.querySelector('[data-strength-label]');
      const tones = ['bg-line', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success'];
      const labels = ['Use 8+ characters', 'Weak', 'Fair', 'Good', 'Strong'];

      const update = () => {
        const value = input.value;
        const score = value ? scorePassword(value) : 0;
        bars.forEach((bar, index) => {
          bar.className = 'h-1 flex-1 rounded-full ' + (index < score ? tones[score] : 'bg-line');
        });
        if (label) {
          label.textContent = labels[score];
          label.className =
            'text-[11px] font-medium ' +
            (score >= 3 ? 'text-success' : score === 2 ? 'text-warning' : score === 1 ? 'text-danger' : 'text-muted');
        }
      };

      input.addEventListener('input', update);
      update();
    });
  }

  function initResetDialog() {
    const form = document.querySelector('[data-reset-form]');
    if (!form) return;
    const input = form.querySelector('input[type="email"]');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input) return;
      if (!input.value.trim() || !EMAIL.test(input.value.trim())) {
        setError(input, 'Enter the email you signed up with.');
        input.focus();
        return;
      }
      window.Mira.closeDialog('forgot-dialog');
      window.Mira.toast({
        title: 'Reset link sent',
        message: 'If an account exists for ' + input.value.trim() + ', the link expires in 30 minutes.',
        type: 'success',
      });
      form.reset();
      clearError(input);
    });

    if (input) input.addEventListener('input', () => clearError(input));
  }

  function initDemoButtons() {
    document.querySelectorAll('[data-demo-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.Mira.toast({
          title: btn.dataset.demoAction || 'Not available in the demo',
          message: 'This frontend build has no backend connected yet.',
          type: 'info',
        });
      });
    });
  }

  function init() {
    document.querySelectorAll('[data-auth-form]').forEach(initForm);
    initPasswordToggles();
    initStrength();
    initResetDialog();
    initDemoButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
