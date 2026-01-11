import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// TODO: PASTE YOUR FIREBASE KEYS HERE
const firebaseConfig = {
    apiKey: "AIzaSyB54YuV-seHAxRhTia0nuuDmE5Sh2ta61w",
  authDomain: "ertquiz.firebaseapp.com",
  projectId: "ertquiz",
  storageBucket: "ertquiz.firebasestorage.app",
  messagingSenderId: "204115314828",
  appId: "1:204115314828:web:148207f1b134f6d5fd13a9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
