import { db } from "./firebase-config.js";
import { collection, addDoc, enableIndexedDbPersistence } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Enable Offline Mode
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
    } else if (err.code == 'unimplemented') {
        console.log("Browser doesn't support persistence");
    }
});

// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').style.display = 'block';
});
document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        document.getElementById('installBtn').style.display = 'none';
    }
});

// UI Logic
window.startApp = () => {
    const name = document.getElementById('teacherName').value;
    const sub = document.getElementById('subject').value;
    if(!name || !sub) return alert("Please fill in your details.");
    
    localStorage.setItem('tName', name);
    localStorage.setItem('tSub', sub);
    
    document.getElementById('displayTeacher').innerText = `${name} (${sub})`;
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('input-section').classList.remove('hidden');
}

window.saveQuestion = async () => {
    const btn = document.querySelector('button[onclick="saveQuestion()"]');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;
    
    try {
        const questionData = {
            teacher: localStorage.getItem('tName'),
            subject: localStorage.getItem('tSub'),
            question: document.getElementById('qText').value,
            options: {
                A: document.getElementById('opA').value,
                B: document.getElementById('opB').value,
                C: document.getElementById('opC').value,
                D: document.getElementById('opD').value,
            },
            answer: document.getElementById('correctAns').value,
            timestamp: Date.now()
        };

        // Save to Firebase
        await addDoc(collection(db, "questions"), questionData);

        // Show local preview
        const preview = document.getElementById('local-preview');
        const newEntry = document.createElement('div');
        newEntry.className = "q-preview";
        newEntry.innerHTML = `✅ <strong>${questionData.question}</strong><br><small>Ans: ${questionData.answer}</small>`;
        preview.prepend(newEntry);
        
        // Reset fields
        document.getElementById('qText').value = "";
        document.getElementById('opA').value = "";
        document.getElementById('opB').value = "";
        document.getElementById('opC').value = "";
        document.getElementById('opD').value = "";
        
        alert("Question Saved Successfully!");

    } catch (e) {
        alert("Error saving: " + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
