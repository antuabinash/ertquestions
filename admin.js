import { db } from "./firebase-config.js";
import { collection, onSnapshot, deleteDoc, updateDoc, doc, query, orderBy } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const pass = prompt("Enter Admin Password:");
if(pass !== "admin123") { document.body.innerHTML = "<h1 style='text-align:center; margin-top:50px; color:red;'>⛔ Access Denied</h1>"; throw new Error("Stop"); }

let allData = [];
const examSelect = document.getElementById('filterExam');
const teacherSelect = document.getElementById('filterTeacher');
const subjectSelect = document.getElementById('filterSubject');

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

// 1. Fetch Data
onSnapshot(query(collection(db, "questions"), orderBy("timestamp", "desc")), (snapshot) => {
    allData = [];
    snapshot.forEach(doc => allData.push({ ...doc.data(), id: doc.id }));
    updateDropdowns();
});

function updateDropdowns() {
    const exams = [...new Set(allData.map(d => d.exam).filter(Boolean))];
    populateSelect(examSelect, exams, "All Exams");

    const teachers = [...new Set(allData.map(d => d.teacher))];
    populateSelect(teacherSelect, teachers, "All Teachers");

    const subjects = [...new Set(allData.map(d => d.subject))];
    populateSelect(subjectSelect, subjects, "All Subjects");
    
    applyFilters();
}

function populateSelect(el, items, defaultText) {
    const currentVal = el.value;
    el.innerHTML = `<option value="all">${defaultText}</option>`;
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item; 
        opt.innerText = item;
        if(item === currentVal) opt.selected = true;
        el.appendChild(opt);
    });
}

window.applyFilters = () => {
    const e = examSelect.value;
    const t = teacherSelect.value;
    const s = subjectSelect.value;
    
    const filtered = allData.filter(item => {
        return (e === "all" || item.exam === e) &&
               (t === "all" || item.teacher === t) && 
               (s === "all" || item.subject === s);
    });
    renderTable(filtered);
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = "";
    
    if(data.length === 0) { tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:30px; color:#777;'>No questions found.</td></tr>"; return; }
    
    data.forEach(item => {
        // --- BUTTON LOGIC IS HERE ---
        const isVerified = item.verified === true;
        
        // 1. Badge (Shows above question)
        const verifiedBadge = isVerified ? `<div class="badge-verified">✅ Verified</div>` : '';

        // 2. Button (Shows in Action column)
        const verifyBtn = isVerified 
            ? `<button class="btn-unverify" onclick="toggleVerify('${item.id}', false)" title="Undo Verification">↩ Undo</button>`
            : `<button class="btn-verify" onclick="toggleVerify('${item.id}', true)">✅ Verify</button>`;

        tbody.innerHTML += `
            <tr>
                <td>
                    <span style="color:#0d47a1; font-weight:bold; text-transform:uppercase;">${item.exam || 'No Exam'}</span><br>
                    <b>${item.teacher}</b><br>
                    <small style="color:gray">${item.subject}</small>
                </td>
                <td>
                    ${verifiedBadge}
                    <div id="disp-q-${item.id}">
                        ${item.question}
                        ${item.imageUrl ? `<br><a href="${item.imageUrl}" target="_blank"><img src="${item.imageUrl}" class="thumb"></a>` : ''}
                    </div>

                    <div id="edit-${item.id}" class="edit-box">
                        <label>Question:</label> <textarea id="txt-${item.id}" rows="2">${item.question}</textarea>
                        <label>New Image:</label> <input type="file" id="file-${item.id}">
                        <label>Options:</label>
                        <input type="text" id="opA-${item.id}" value="${item.options.A}">
                        <input type="text" id="opB-${item.id}" value="${item.options.B}">
                        <input type="text" id="opC-${item.id}" value="${item.options.C}">
                        <input type="text" id="opD-${item.id}" value="${item.options.D}">
                        <label>Ans:</label>
                        <select id="ans-${item.id}">
                            <option value="A" ${item.answer === 'A' ? 'selected' : ''}>A</option>
                            <option value="B" ${item.answer === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" ${item.answer === 'C' ? 'selected' : ''}>C</option>
                            <option value="D" ${item.answer === 'D' ? 'selected' : ''}>D</option>
                        </select>
                        <div class="edit-btns">
                            <button onclick="saveAdminEdit('${item.id}')" style="background:#0d47a1; color:white; border:none; padding:5px 10px;">Save</button>
                            <button onclick="toggleEdit('${item.id}')" style="background:#777; color:white; border:none; padding:5px 10px;">Cancel</button>
                        </div>
                    </div>
                </td>
                <td>
                    <div id="disp-ops-${item.id}">
                        A: ${item.options.A}<br>B: ${item.options.B}<br>
                        C: ${item.options.C}<br>D: ${item.options.D}<br>
                        <strong style="color:#d32f2f;">Ans: ${item.answer}</strong>
                    </div>
                </td>
                <td>
                    <div class="action-container">
                        ${verifyBtn}  <button class="btn-edit" onclick="toggleEdit('${item.id}')">✏ Edit</button>
                        <button class="btn-delete" onclick="deleteQ('${item.id}')">🗑</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// --- VERIFY FUNCTION ---
window.toggleVerify = async (id, status) => {
    try {
        await updateDoc(doc(db, "questions", id), { verified: status });
    } catch (e) {
        alert("Error: " + e.message);
    }
}

window.deleteQ = async (id) => {
    if(confirm("Delete permanently?")) await deleteDoc(doc(db, "questions", id));
}

window.toggleEdit = (id) => {
    const box = document.getElementById(`edit-${id}`);
    const dispQ = document.getElementById(`disp-q-${id}`);
    const dispOps = document.getElementById(`disp-ops-${id}`);

    if (box.style.display === "block") {
        box.style.display = "none";
        dispQ.style.display = "block";
        dispOps.style.visibility = "visible";
    } else {
        box.style.display = "block";
        dispQ.style.display = "none";
        dispOps.style.visibility = "hidden";
    }
}

window.saveAdminEdit = async (id) => {
    const btn = document.querySelector(`#edit-${id} button`);
    btn.innerText = "Saving...";
    try {
        const file = document.getElementById(`file-${id}`).files[0];
        const updates = {
            question: document.getElementById(`txt-${id}`).value,
            options: {
                A: document.getElementById(`opA-${id}`).value,
                B: document.getElementById(`opB-${id}`).value,
                C: document.getElementById(`opC-${id}`).value,
                D: document.getElementById(`opD-${id}`).value,
            },
            answer: document.getElementById(`ans-${id}`).value
        };
        if (file) {
            if(file.size > 5 * 1024 * 1024) throw new Error("File too large");
            updates.imageUrl = await compressImage(file);
        }
        await updateDoc(doc(db, "questions", id), updates);
        alert("Updated!");
    } catch (e) {
        alert("Error: " + e.message);
        btn.innerText = "Save";
    }
}

window.downloadJSON = () => {
    const e = examSelect.value;
    const t = teacherSelect.value;
    const s = subjectSelect.value;
    const dataToDownload = allData.filter(item => {
        return (e === "all" || item.exam === e) &&
               (t === "all" || item.teacher === t) && 
               (s === "all" || item.subject === s);
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToDownload, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `questions_export_${Date.now()}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
}
