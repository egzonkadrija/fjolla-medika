// Firebase v9 modular SDK — loaded via CDN in index.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDydftH_c9JDmk5r5MXgodGQlrQ-hPnXgI",
  authDomain: "fjolla-medika.firebaseapp.com",
  projectId: "fjolla-medika",
  storageBucket: "fjolla-medika.firebasestorage.app",
  messagingSenderId: "110123370248",
  appId: "1:110123370248:web:7f58c83fc96f7b1eb00ebd"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
