import { db, auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, orderBy } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let isSignup = false;
let currentUser = null;

// --- AUTH LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        loadMyQuestions(user.uid);
    } else {
        currentUser = null;
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard-section').classList.add('hidden');
    }
});

window.toggleAuthMode = () => {
    isSignup = !isSignup;
    document.getElementById('auth-title').innerText = isSignup ? "Teacher Signup" : "Teacher Login";
    document.getElementById('authBtn').innerText = isSignup ? "Create Account" : "Login";
    document.getElementById('signup-fields').classList.toggle('hidden', !isSignup);
};

window.handleAuth = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    try {
        if (isSignup) {
            const name = document.getElementById('tName').value;
            const subject = document.getElementById('tSubject').value;
            if(!name || !subject) throw new Error("Name and Subject are required for signup.");
            
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            // Store name and subject in the user profile (Name|Subject)
            await updateProfile(cred.user, { displayName: `${name}|${subject}` });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (e) {
        alert("Error: " + e.message);
    }
};

window.logout = () => signOut(auth);

// --- IMAGE COMPRESSION (Base64) ---
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Resize to max 600px width
                const maxWidth = 600;
                const scaleSize = maxWidth / img.width;
                canvas.width = (img.width > maxWidth) ? maxWidth : img.width;
                canvas.height = (img.width > maxWidth) ? (img.height * scaleSize) : img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Compress to JPEG 0.6 quality
                resolve(canvas.toDataURL('image/jpeg', 0.6)); 
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

// --- DATA LOGIC ---
window.saveQuestion = async () => {
    const editId = document.getElementById('editId').value;
    const qText = document.getElementById('qText').value;
    const file = document.getElementById('qImage').files[0];
    const btn = document.getElementById('saveBtn');
    
    if(!qText) return alert("Question text is required");

    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        let imageString = "";
        
        if (file) {
            if(file.size > 5 * 1024 * 1024) throw new Error("File too large. Max 5MB");
            imageString = await compressImage(file);
        }

        const data = {
            question: qText,
            options: {
                A: document.getElementById('opA').value,
                B: document.getElementById('opB').value,
                C: document.getElementById('opC').value,
                D: document.getElementById('opD').value,
            },
            answer: document.getElementById('correctAns').value,
            timestamp: Date.now(),
            imageUrl: imageString || (editId ? undefined : "")
        };

        if(editId && !file) delete data.imageUrl; 

        if (editId) {
            await updateDoc(doc(db, "questions", editId), data);
            alert("Updated Successfully!");
            cancelEdit();
        } else {
            // Check if profile exists
            if(!currentUser.displayName) throw new Error("Profile error. Please relogin.");
            
            const [name, subject] = currentUser.displayName.split('|');
            data.teacher = name;
            data.subject = subject;
            data.uid = currentUser.uid;
            
            await addDoc(collection(db, "questions"), data);
            alert("Added Successfully!");
            resetForm();
        }

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "Submit Question";
        btn.disabled = false;
    }
};

function loadMyQuestions(uid) {
    const qList = document.getElementById('my-questions-list');
    const q = query(collection(db, "questions"), where("uid", "==", uid), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        qList.innerHTML = "";
        if(snapshot.empty) { qList.innerHTML = "<p>No questions added yet.</p>"; return; }
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = "q-item";
            div.innerHTML = `
                <div style="font-weight:bold; margin-bottom:5px;">${data.question}</div>
                ${data.imageUrl ? `<img src="${data.imageUrl}" class="q-img-preview">` : ''}
                <div style="margin-top:10px;">
                    <button class="secondary" style="width:auto; padding:6px 12px;" onclick="editQ('${docSnap.id}')">✏ Edit</button>
                    <button class="delete" style="width:auto; padding:6px 12px;" onclick="deleteQ('${docSnap.id}')">🗑 Delete</button>
                </div>
            `;
            div.dataset.json = JSON.stringify(data);
            div.dataset.id = docSnap.id;
            qList.appendChild(div);
        });
    });
}

window.deleteQ = async (id) => {
    if(confirm("Are you sure you want to delete this question?")) {
        await deleteDoc(doc(db, "questions", id));
    }
};

window.editQ = (id) => {
    const el = document.querySelector(`div[data-id="${id}"]`);
    const data = JSON.parse(el.dataset.json);

    document.getElementById('editId').value = id;
    document.getElementById('qText').value = data.question;
    document.getElementById('opA').value = data.options.A;
    document.getElementById('opB').value = data.options.B;
    document.getElementById('opC').value = data.options.C;
    document.getElementById('opD').value = data.options.D;
    document.getElementById('correctAns').value = data.answer;
    
    document.getElementById('saveBtn').innerText = "Update Question";
    document.getElementById('cancelBtn').classList.remove('hidden');
    document.querySelector('.card').scrollIntoView({behavior: 'smooth'});
};

window.cancelEdit = () => {
    resetForm();
    document.getElementById('editId').value = "";
    document.getElementById('saveBtn').innerText = "Submit Question";
    document.getElementById('cancelBtn').classList.add('hidden');
};

function resetForm() {
    document.getElementById('qText').value = "";
    document.getElementById('qImage').value = "";
    document.getElementById('opA').value = "";
    document.getElementById('opB').value = "";
    document.getElementById('opC').value = "";
    document.getElementById('opD').value = "";
}
