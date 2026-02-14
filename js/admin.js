import { db, auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- DOM refs ---
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const listEl = document.getElementById('appointments-list');
const pendingBadge = document.getElementById('pending-badge');

let currentFilter = 'pending';
let allAppointments = [];
let prevPendingCount = 0;
let unsubFirestore = null;

// --- Auth State ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    startListening();
  } else {
    dashboard.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
  }
});

// --- Login ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = 'Invalid email or password.';
  }
});

// --- Logout ---
document.getElementById('btn-logout').addEventListener('click', () => {
  signOut(auth);
});

// --- Tabs ---
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderAppointments();
  });
});

// --- Real-time listener ---
function startListening() {
  const q = query(collection(db, "appointments"), orderBy("date"), orderBy("time"));
  unsubFirestore = onSnapshot(q, (snapshot) => {
    allAppointments = [];
    snapshot.forEach((d) => {
      allAppointments.push({ id: d.id, ...d.data() });
    });

    const pendingCount = allAppointments.filter(a => a.status === 'pending').length;

    // Browser notification for new pending
    if (pendingCount > prevPendingCount && prevPendingCount !== 0) {
      showNotification(pendingCount - prevPendingCount);
    }
    prevPendingCount = pendingCount;

    updateCounts();
    renderAppointments();
  });

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showNotification(newCount) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Fjolla Medika', {
      body: `${newCount} new appointment request${newCount > 1 ? 's' : ''}!`,
      icon: 'images/hero.jpg'
    });
  }
}

// --- Update tab counts ---
function updateCounts() {
  const pending = allAppointments.filter(a => a.status === 'pending').length;
  const accepted = allAppointments.filter(a => a.status === 'accepted').length;

  document.getElementById('count-pending').textContent = pending || '';
  document.getElementById('count-accepted').textContent = accepted || '';
  document.getElementById('count-all').textContent = allAppointments.length || '';
  pendingBadge.textContent = pending || '';
}

// --- Render ---
function renderAppointments() {
  let filtered = allAppointments;
  if (currentFilter !== 'all') {
    filtered = allAppointments.filter(a => a.status === currentFilter);
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="admin-empty">No appointments found.</p>';
    return;
  }

  listEl.innerHTML = filtered.map(a => {
    const isPending = a.status === 'pending';
    return `
      <div class="appt-card appt-card--${a.status}">
        <div class="appt-info">
          <div class="appt-datetime">${a.date} &mdash; ${a.time}</div>
          <div class="appt-client">${escapeHtml(a.name)}</div>
          <div class="appt-phone">${escapeHtml(a.phone)}</div>
          ${a.reason ? `<div class="appt-reason">${escapeHtml(a.reason)}</div>` : ''}
        </div>
        <span class="appt-status appt-status--${a.status}">${a.status}</span>
        <div class="appt-actions">
          ${isPending ? `
            <button class="btn-accept" data-id="${a.id}">Accept</button>
            <button class="btn-reject" data-id="${a.id}">Reject</button>
          ` : ''}
          ${a.status === 'accepted' ? `
            <button class="btn-cancel" data-id="${a.id}">Cancel</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Bind accept/reject
  listEl.querySelectorAll('.btn-accept').forEach(btn => {
    btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'accepted'));
  });
  listEl.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'rejected'));
  });
  listEl.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => cancelAppointment(btn.dataset.id));
  });
}

// --- Accept / Reject ---
async function updateStatus(docId, status) {
  try {
    await updateDoc(doc(db, "appointments", docId), { status });
  } catch (err) {
    console.error('Failed to update appointment:', err);
  }
}

// --- Cancel (delete doc, frees the slot) ---
async function cancelAppointment(docId) {
  if (!confirm('Cancel this appointment? The time slot will become available again.')) return;
  try {
    await deleteDoc(doc(db, "appointments", docId));
  } catch (err) {
    console.error('Failed to cancel appointment:', err);
  }
}

// --- Helpers ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
