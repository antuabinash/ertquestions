import { db, auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, orderBy } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let isSignup = false;
let currentUser = null;

const examSubjects = {
    "OAV": ["English", "Math", "Science", "Social Science"],
    "NAVODAYA": ["Mental Ability", "Math", "Language"],
    "EKALABYA": ["Mental Ability", "Math", "English"],
    "PATHANI SAMANTA": ["Math"],
    "NMMS": ["Mental Ability", "Math", "Science", "Social Science"]
};

window.updateSubjects = () => {
    const examSelect = document.getElementById("qExam");
    const subjectSelect = document.getElementById("qSubject");
    const selectedExam = examSelect.value;
    
    localStorage.setItem('prefExam', selectedExam);

    subjectSelect.innerHTML = '<option value="" disabled selected>-- Choose Subject --</option>';
    
    if (selectedExam && examSubjects[selectedExam]) {
        examSubjects[selectedExam].forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub;
            opt.innerText = sub;
            subjectSelect.appendChild(opt);
        });
    }
};

window.saveSubjectPreference = () => {
    const sub = document.getElementById("qSubject").value;
    localStorage.setItem('prefSubject', sub);
}

function loadPreferences() {
    const savedExam = localStorage.getItem('prefExam');
    const savedSubject = localStorage.getItem('prefSubject');

    if (savedExam) {
        const examSelect = document.getElementById("qExam");
        examSelect.value = savedExam;
        window.updateSubjects();
        if (savedSubject) {
            document.getElementById("qSubject").value = savedSubject;
        }
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('logoutBtn').style.display = 'block';
        loadPreferences();
        loadMyQuestions(user.uid);
    } else {
        currentUser = null;
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard-section').classList.add('hidden');
        document.getElementById('logoutBtn').style.display = 'none';
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
            if(!name) throw new Error("Name is required.");
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(cred.user, { displayName: name });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (e) {
        alert("Error: " + e.message);
    }
};

window.logout = () => signOut(auth);

const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxWidth = 600;
                const scaleSize = maxWidth / img.width;
                canvas.width = (img.width > maxWidth) ? maxWidth : img.width;
                canvas.height = (img.width > maxWidth) ? (img.height * scaleSize) : img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6)); 
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

window.saveQuestion = async () => {
    const editId = document.getElementById('editId').value;
    const qExam = document.getElementById('qExam').value;
    const qSubject = document.getElementById('qSubject').value;
    const qText = document.getElementById('qText').value;
    const file = document.getElementById('qImage').files[0];
    const btn = document.getElementById('saveBtn');
    
    if(!qExam) return alert("Please select an Exam.");
    if(!qSubject) return alert("Please select a Subject.");
    if(!qText) return alert("Question text is required.");

    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        let imageString = "";
        if (file) {
            if(file.size > 5 * 1024 * 1024) throw new Error("File too large. Max 5MB");
            imageString = await compressImage(file);
        }

        const data = {
            exam: qExam,
            subject: qSubject,
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
            data.teacher = currentUser.displayName;
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
        if(snapshot.empty) { qList.innerHTML = "<p style='text-align:center; color:#777;'>No questions added yet.</p>"; return; }
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // --- NEW: VERIFIED CHECK ---
            const verifiedBadge = data.verified === true 
                ? `<span class="verified-badge-teacher">✅ Verified</span>` 
                : '';

            const div = document.createElement('div');
            div.className = "q-item";
            div.innerHTML = `
                <div style="font-size:0.85em; color:var(--primary); font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">
                    ${data.exam} &bull; ${data.subject} 
                    ${verifiedBadge}
                </div>
                <div style="margin-bottom:8px; font-size:1.05em;">${data.question}</div>
                ${data.imageUrl ? `<img src="${data.imageUrl}" class="q-img-preview">` : ''}
                <div style="margin-top:12px;">
                    <button class="secondary" style="padding:6px 12px; cursor:pointer;" onclick="editQ('${docSnap.id}')">✏ Edit</button>
                    <button class="delete" style="padding:6px 12px; cursor:pointer; margin-left:5px;" onclick="deleteQ('${docSnap.id}')">🗑 Delete</button>
                </div>
            `;
            div.dataset.json = JSON.stringify(data);
            div.dataset.id = docSnap.id;
            qList.appendChild(div);
        });
    });
}

// --- CONFIRMATION DIALOG ENSURED ---
window.deleteQ = async (id) => {
    // This pops up the box asking Yes/No
    if(confirm("Are you sure you want to delete this question? This cannot be undone.")) {
        await deleteDoc(doc(db, "questions", id));
    }
};

window.editQ = (id) => {
    const el = document.querySelector(`div[data-id="${id}"]`);
    const data = JSON.parse(el.dataset.json);

    document.getElementById('editId').value = id;
    document.getElementById('qExam').value = data.exam;
    
    // We update subjects dropdown based on exam so the correct subject can be selected
    const subjectSelect = document.getElementById("qSubject");
    subjectSelect.innerHTML = '<option value="" disabled selected>-- Choose Subject --</option>';
    if (data.exam && examSubjects[data.exam]) {
        examSubjects[data.exam].forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub;
            opt.innerText = sub;
            subjectSelect.appendChild(opt);
        });
    }
    
    document.getElementById('qSubject').value = data.subject;
    document.getElementById('qText').value = data.question;
    document.getElementById('opA').value = data.options.A;
    document.getElementById('opB').value = data.options.B;
    document.getElementById('opC').value = data.options.C;
    document.getElementById('opD').value = data.options.D;
    document.getElementById('correctAns').value = data.answer;
    
    if(data.imageUrl) {
        document.getElementById('currentImgPreview').style.display = 'block';
        document.getElementById('currentImgPreview').innerHTML = `<img src="${data.imageUrl}" style="height:50px;"> <br> Upload new to replace`;
    }

    document.getElementById('saveBtn').innerText = "Update Question";
    document.getElementById('cancelBtn').classList.remove('hidden');
    document.querySelector('.card').scrollIntoView({behavior: 'smooth'});
};

window.cancelEdit = () => {
    resetForm(); 
    document.getElementById('editId').value = "";
    document.getElementById('saveBtn').innerText = "Submit Question";
    document.getElementById('cancelBtn').classList.add('hidden');
    document.getElementById('currentImgPreview').style.display = 'none';
};

function resetForm() {
    loadPreferences();
    document.getElementById('qText').value = "";
    document.getElementById('qImage').value = "";
    document.getElementById('opA').value = "";
    document.getElementById('opB').value = "";
    document.getElementById('opC').value = "";
    document.getElementById('opD').value = "";
}
