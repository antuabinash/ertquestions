import { db } from "./firebase-config.js";
import { collection, addDoc, enableIndexedDbPersistence } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Enable Offline Mode
enableIndexedDbPersistence(db).catch((err) => console.log("Offline mode error", err));

// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').style.display = 'block';
});
document.getElementById('installBtn').addEventListener('click', () => {
    deferredPrompt.prompt();
});

// UI Logic
window.startApp = () => {
    const name = document.getElementById('teacherName').value;
    const sub = document.getElementById('subject').value;
    if(!name || !sub) return alert("Fill details");
    
    localStorage.setItem('tName', name);
    localStorage.setItem('tSub', sub);
    
    document.getElementById('displayTeacher').innerText = `${name} (${sub})`;
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('input-section').classList.remove('hidden');
}

window.saveQuestion = async () => {
    const btn = document.querySelector('button[onclick="saveQuestion()"]');
    btn.innerText = "Saving...";
    
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

        // Show local preview so teacher knows it worked
        const preview = document.getElementById('local-preview');
        preview.innerHTML = `<div class="q-preview">✅ <strong>Saved:</strong> ${questionData.question}</div>` + preview.innerHTML;
        
        // Reset fields
        document.getElementById('qText').value = "";
        document.getElementById('opA').value = "";
        document.getElementById('opB').value = "";
        document.getElementById('opC').value = "";
        document.getElementById('opD').value = "";
        btn.innerText = "Submit Question";

    } catch (e) {
        alert("Error saving: " + e.message);
        btn.innerText = "Try Again";
    }
}
