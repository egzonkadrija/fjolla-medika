const I18n = {
  currentLang: 'en',
  translations: {},
  onChangeCallbacks: [],

  async init() {
    const saved = localStorage.getItem('fjolla-lang');
    this.currentLang = saved || 'en';
    await this.loadLanguage(this.currentLang);
    this.updateLangButton();
  },

  async loadLanguage(lang) {
    try {
      const response = await fetch(`lang/${lang}.json`);
      this.translations = await response.json();
      this.currentLang = lang;
      localStorage.setItem('fjolla-lang', lang);
      this.apply();
      this.updateLangButton();
      this.onChangeCallbacks.forEach(cb => cb(lang));
    } catch (error) {
      console.error(`Failed to load language: ${lang}`, error);
    }
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (this.translations[key]) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = this.translations[key];
        } else if (el.tagName === 'OPTION' && el.value === '') {
          el.textContent = this.translations[key];
        } else {
          el.textContent = this.translations[key];
        }
      }
    });

    // Update select options that use data-i18n
    document.querySelectorAll('option[data-i18n]').forEach(option => {
      const key = option.getAttribute('data-i18n');
      if (this.translations[key]) {
        option.textContent = this.translations[key];
      }
    });

    // Set html lang attribute
    document.documentElement.lang = this.currentLang;
  },

  t(key) {
    return this.translations[key] || key;
  },

  updateLangButton() {
    const langNames = { en: 'EN', sq: 'SQ', mk: 'MK', tr: 'TR' };
    const btn = document.querySelector('.lang-current');
    if (btn) {
      btn.textContent = langNames[this.currentLang] || 'EN';
    }

    // Highlight active in dropdown
    document.querySelectorAll('.lang-dropdown button').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === this.currentLang);
    });
  }
};
