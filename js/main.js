import { subscribeToDateSlots, submitAppointment } from "./booking-firebase.js";
import { DOCTORS } from "./doctors.js";

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize i18n
  await I18n.init();

  // --- Mobile Menu Toggle ---
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.navbar-menu');

  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navMenu.classList.toggle('open');
  });

  // Close mobile menu when a nav link is clicked
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      navMenu.classList.remove('open');
    });
  });

  // --- Language Switcher ---
  const langBtn = document.querySelector('.lang-btn');
  const langDropdown = document.querySelector('.lang-dropdown');

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    langDropdown.classList.remove('open');
  });

  langDropdown.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = btn.dataset.lang;
      I18n.loadLanguage(lang);
      langDropdown.classList.remove('open');
    });
  });

  // --- Active Nav Link on Scroll ---
  const sections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.navbar-menu a[href^="#"]');

  function updateActiveNav() {
    const scrollY = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav);
  updateActiveNav();

  // --- Scroll Fade-In Animation ---
  const fadeElements = document.querySelectorAll('.fade-in');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  fadeElements.forEach(el => observer.observe(el));

  // --- Before/After Comparison Sliders ---
  function initComparisonSliders() {
    document.querySelectorAll('.comparison-slider').forEach((slider) => {
      const handle = slider.querySelector('.comparison-handle');
      if (!handle) return;

      let isDragging = false;

      const setPosition = (value) => {
        const percent = Math.max(0, Math.min(100, value));
        slider.style.setProperty('--compare-position', `${percent}%`);
        handle.setAttribute('aria-valuenow', String(Math.round(percent)));
      };

      const setPositionFromClientX = (clientX) => {
        const rect = slider.getBoundingClientRect();
        const percent = ((clientX - rect.left) / rect.width) * 100;
        setPosition(percent);
      };

      const startDragging = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        isDragging = true;
        slider.classList.add('dragging');
        setPositionFromClientX(event.clientX);
        if (slider.setPointerCapture) {
          slider.setPointerCapture(event.pointerId);
        }
        event.preventDefault();
      };

      const stopDragging = (event) => {
        if (!isDragging) return;
        isDragging = false;
        slider.classList.remove('dragging');
        if (slider.releasePointerCapture && slider.hasPointerCapture?.(event.pointerId)) {
          slider.releasePointerCapture(event.pointerId);
        }
      };

      setPosition(parseFloat(slider.dataset.compareStart || '50'));

      slider.addEventListener('pointerdown', startDragging);
      slider.addEventListener('pointermove', (event) => {
        if (!isDragging) return;
        setPositionFromClientX(event.clientX);
      });
      slider.addEventListener('pointerup', stopDragging);
      slider.addEventListener('pointercancel', stopDragging);

      slider.addEventListener('click', (event) => {
        if (isDragging) return;
        setPositionFromClientX(event.clientX);
      });

      handle.addEventListener('keydown', (event) => {
        const current = parseFloat(handle.getAttribute('aria-valuenow') || '50');

        if (event.key === 'ArrowLeft') {
          setPosition(current - 5);
          event.preventDefault();
        }

        if (event.key === 'ArrowRight') {
          setPosition(current + 5);
          event.preventDefault();
        }

        if (event.key === 'Home') {
          setPosition(0);
          event.preventDefault();
        }

        if (event.key === 'End') {
          setPosition(100);
          event.preventDefault();
        }
      });
    });
  }

  initComparisonSliders();

  // --- Booking Calendar ---
  const BookingCalendar = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDoctor: null,
    selectedDate: null,
    selectedSlot: null,
    unsubscribe: null,          // Firestore listener cleanup
    currentSlotStatus: new Map(), // time -> "pending" | "accepted"

    init() {
      this.renderDoctorGrid();
      this.renderCalendar();
      this.bindEvents();
      this.bindDoctorBookButtons();
      I18n.onChangeCallbacks.push(() => {
        this.renderDoctorGrid();
        this.renderCalendar();
        if (this.selectedDate) this.renderSlots();
      });
    },

    renderDoctorGrid() {
      const grid = document.getElementById('doctor-select-grid');
      grid.innerHTML = DOCTORS.map(doc => `
        <div class="doctor-select-card" data-doctor-id="${doc.id}">
          <img src="${doc.photo}" alt="${doc.name}">
          <div class="doctor-select-text">
            <div class="doctor-select-name">${doc.name}</div>
            <div class="doctor-select-role" data-i18n="${doc.roleKey}">${I18n.t(doc.roleKey)}</div>
          </div>
          <span class="doctor-select-arrow">&#x203A;</span>
        </div>
      `).join('');

      grid.querySelectorAll('.doctor-select-card').forEach(card => {
        card.addEventListener('click', () => {
          this.selectDoctor(card.dataset.doctorId);
        });
      });
    },

    selectDoctor(id) {
      const doc = DOCTORS.find(d => d.id === id);
      if (!doc) return;
      this.selectedDoctor = doc;
      this.selectedDate = null;
      this.selectedSlot = null;
      this.cleanupListener();

      // Show doctor name in chip
      const chip = document.getElementById('selected-doctor-chip');
      chip.textContent = `${doc.name} — ${I18n.t(doc.roleKey)}`;

      this.renderCalendar();
      this.showStep('date');
    },

    bindDoctorBookButtons() {
      document.querySelectorAll('.team-card[data-doctor-id]').forEach(card => {
        const btn = card.querySelector('.btn-book-doctor');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const doctorId = card.dataset.doctorId;
          this.selectDoctor(doctorId);
          // Scroll to appointment section
          document.getElementById('appointment').scrollIntoView({ behavior: 'smooth' });
        });
      });
    },

    bindEvents() {
      document.getElementById('cal-prev').addEventListener('click', () => {
        this.currentMonth--;
        if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
        this.renderCalendar();
      });

      document.getElementById('cal-next').addEventListener('click', () => {
        this.currentMonth++;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        this.renderCalendar();
      });

      document.getElementById('back-to-doctors').addEventListener('click', () => {
        this.cleanupListener();
        this.selectedDoctor = null;
        this.selectedDate = null;
        this.selectedSlot = null;
        this.showStep('doctor');
      });

      document.getElementById('back-to-calendar').addEventListener('click', () => {
        this.cleanupListener();
        this.showStep('date');
        this.selectedSlot = null;
      });

      document.getElementById('back-to-slots').addEventListener('click', () => {
        this.showStep('time');
      });

      const form = document.getElementById('appointment-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('booking-name').value.trim();
        const phone = document.getElementById('booking-phone').value.trim();
        const reason = document.getElementById('booking-reason').value.trim();
        if (!name || !phone) return;

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '...';

        try {
          const dateStr = this.toFirestoreDateStr(this.selectedDate);
          await submitAppointment(this.selectedDoctor.id, dateStr, this.selectedSlot, name, phone, reason);

          // Show success
          this.cleanupListener();
          this.showStep('none');
          const successMsg = document.getElementById('form-success');
          successMsg.classList.add('show');
          form.reset();
          this.selectedDoctor = null;
          this.selectedDate = null;
          this.selectedSlot = null;

          setTimeout(() => {
            successMsg.classList.remove('show');
            this.showStep('doctor');
            this.renderCalendar();
          }, 5000);
        } catch (err) {
          console.error('Booking failed:', err);
          alert(I18n.t('booking_booked'));
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    },

    showStep(step) {
      document.getElementById('booking-step-doctor').classList.toggle('hidden', step !== 'doctor');
      document.getElementById('booking-step-date').classList.toggle('hidden', step !== 'date');
      document.getElementById('booking-step-time').classList.toggle('hidden', step !== 'time');
      document.getElementById('booking-step-form').classList.toggle('hidden', step !== 'form');
    },

    toFirestoreDateStr(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    renderCalendar() {
      const t = (k) => I18n.t(k);

      // Month/year header
      document.getElementById('cal-month-year').textContent =
        t(`month_${this.currentMonth + 1}`) + ' ' + this.currentYear;

      // Weekday headers
      const weekdaysEl = document.getElementById('cal-weekdays');
      const dayKeys = ['day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat', 'day_sun'];
      weekdaysEl.innerHTML = dayKeys.map(k =>
        `<span class="cal-weekday">${t(k)}</span>`
      ).join('');

      // Days grid
      const daysEl = document.getElementById('cal-days');
      const firstDay = new Date(this.currentYear, this.currentMonth, 1);
      const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
      const totalDays = lastDay.getDate();

      // getDay() returns 0=Sun. We want Mon=0, so shift.
      let startIdx = firstDay.getDay() - 1;
      if (startIdx < 0) startIdx = 6;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let html = '';

      // Empty cells before first day
      for (let i = 0; i < startIdx; i++) {
        html += '<span class="cal-day cal-day--empty"></span>';
      }

      for (let d = 1; d <= totalDays; d++) {
        const date = new Date(this.currentYear, this.currentMonth, d);
        const dayOfWeek = date.getDay(); // 0=Sun
        const isPast = date < today;
        const isSunday = dayOfWeek === 0;
        const isToday = date.getTime() === today.getTime();
        const isSelected = this.selectedDate &&
          this.selectedDate.getTime() === date.getTime();

        let classes = 'cal-day';
        if (isToday) classes += ' cal-day--today';
        if (isSelected) classes += ' cal-day--selected';
        if (isPast) classes += ' cal-day--disabled';
        if (isSunday) classes += ' cal-day--sunday cal-day--disabled';

        const disabled = isPast || isSunday;

        html += `<span class="${classes}" data-day="${d}" ${disabled ? '' : 'tabindex="0"'}>${d}</span>`;
      }

      daysEl.innerHTML = html;

      // Attach click handlers
      daysEl.querySelectorAll('.cal-day:not(.cal-day--disabled):not(.cal-day--empty)').forEach(el => {
        el.addEventListener('click', () => {
          const day = parseInt(el.dataset.day);
          this.selectDate(day);
        });
      });

      // Disable prev button if we're at current month
      const prevBtn = document.getElementById('cal-prev');
      const now = new Date();
      if (this.currentYear === now.getFullYear() && this.currentMonth === now.getMonth()) {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.pointerEvents = 'none';
      } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
      }
    },

    selectDate(day) {
      this.selectedDate = new Date(this.currentYear, this.currentMonth, day);
      this.selectedSlot = null;
      this.renderCalendar();

      // Clean up previous Firestore listener
      this.cleanupListener();

      // Subscribe to real-time slot data for the selected doctor + date
      const dateStr = this.toFirestoreDateStr(this.selectedDate);
      this.unsubscribe = subscribeToDateSlots(this.selectedDoctor.id, dateStr, (slotStatus) => {
        this.currentSlotStatus = slotStatus;
        this.renderSlots();
      });

      this.showStep('time');
    },

    cleanupListener() {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    },

    getTimeSlots(date) {
      const dayOfWeek = date.getDay();
      let startHour, endHour;

      if (dayOfWeek === 6) { // Saturday
        startHour = 9; endHour = 14;
      } else { // Mon-Fri
        startHour = 8; endHour = 19;
      }

      const slots = [];
      for (let h = startHour; h <= endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
      }
      return slots;
    },

    renderSlots() {
      const slotsEl = document.getElementById('booking-slots');
      const chipEl = document.getElementById('selected-date-chip');

      const dateStr = this.formatDate(this.selectedDate);
      chipEl.textContent = `${this.selectedDoctor.name} — ${dateStr}`;

      const times = this.getTimeSlots(this.selectedDate);

      slotsEl.innerHTML = times.map(time => {
        const status = this.currentSlotStatus.get(time); // "pending" | "accepted" | undefined
        let cls = 'slot';
        let disabled = false;

        if (status === 'accepted') {
          cls += ' slot--booked';
          disabled = true;
        } else if (status === 'pending') {
          cls += ' slot--pending';
          disabled = true;
        } else {
          cls += ' slot--available';
        }

        return `<button class="${cls}" data-time="${time}" ${disabled ? 'disabled' : ''}>${time}</button>`;
      }).join('');

      slotsEl.querySelectorAll('.slot--available').forEach(el => {
        el.addEventListener('click', () => {
          this.selectSlot(el.dataset.time);
        });
      });
    },

    selectSlot(time) {
      this.selectedSlot = time;

      // Highlight selected
      document.querySelectorAll('#booking-slots .slot').forEach(el => {
        el.classList.toggle('slot--selected', el.dataset.time === time);
      });

      // Show form with summary (doctor + date + time)
      const chipEl = document.getElementById('selected-datetime-chip');
      chipEl.textContent = `${this.selectedDoctor.name} — ${this.formatDate(this.selectedDate)} — ${time}`;
      this.showStep('form');
    },

    formatDate(date) {
      const t = (k) => I18n.t(k);
      const dayNames = [
        t('day_sun'), t('day_mon'), t('day_tue'), t('day_wed'),
        t('day_thu'), t('day_fri'), t('day_sat')
      ];
      const day = date.getDate();
      const monthName = t(`month_${date.getMonth() + 1}`);
      const dayName = dayNames[date.getDay()];
      return `${dayName}, ${day} ${monthName} ${date.getFullYear()}`;
    }
  };

  BookingCalendar.init();

  // --- Navbar background on scroll ---
  const navbar = document.querySelector('.navbar');

  // --- Back to Top Button ---
  const backToTop = document.querySelector('.back-to-top');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.style.boxShadow = '0 2px 20px rgba(13,92,63,0.5)';
    } else {
      navbar.style.boxShadow = '0 2px 15px rgba(13,92,63,0.4)';
    }

    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
