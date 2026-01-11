import { db } from "./firebase-config.js";
import { collection, onSnapshot, deleteDoc, updateDoc, doc, query, orderBy } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const pass = prompt("Enter Admin Password:");
if(pass !== "admin123") { document.body.innerHTML = "<h1 style='text-align:center; margin-top:50px;'>⛔ Access Denied</h1>"; throw new Error("Stop"); }

let allData = [];
const teacherSelect = document.getElementById('filterTeacher');
const subjectSelect = document.getElementById('filterSubject');

// 1. Fetch Data Real-time
onSnapshot(query(collection(db, "questions"), orderBy("timestamp", "desc")), (snapshot) => {
    allData = [];
    snapshot.forEach(doc => allData.push({ ...doc.data(), id: doc.id }));
    
    updateTeacherDropdown();
    applyFilters();
});

// 2. Dropdown Logic
function updateTeacherDropdown() {
    const currentT = teacherSelect.value; // Remember selection
    const teachers = [...new Set(allData.map(d => d.teacher))];
    teacherSelect.innerHTML = '<option value="all">All Teachers</option>';
    teachers.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.innerText = t;
        if(t === currentT) opt.selected = true;
        teacherSelect.appendChild(opt);
    });
}

window.populateSubjects = () => {
    const selectedTeacher = teacherSelect.value;
    let subjects = [];
    
    if(selectedTeacher === "all") {
        subjects = [...new Set(allData.map(d => d.subject))];
    } else {
        subjects = [...new Set(allData.filter(d => d.teacher === selectedTeacher).map(d => d.subject))];
    }

    subjectSelect.innerHTML = '<option value="all">All Subjects</option>';
    subjects.forEach(s => {
        subjectSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });
    applyFilters();
}

// 3. Filter & Render
window.applyFilters = () => {
    const t = teacherSelect.value;
    const s = subjectSelect.value;
    
    const filtered = allData.filter(item => {
        return (t === "all" || item.teacher === t) && 
               (s === "all" || item.subject === s);
    });

    renderTable(filtered);
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = "";
    
    if(data.length === 0) { tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px;'>No questions found.</td></tr>"; return; }
    
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>
                    <b>${item.teacher}</b><br>
                    <small style="color:gray">${item.subject}</small>
                </td>
                <td>
                    ${item.question}
                    ${item.imageUrl ? `<br><a href="${item.imageUrl}" target="_blank"><img src="${item.imageUrl}" class="thumb"></a>` : ''}
                    
                    <div id="edit-${item.id}" class="edit-box">
                        <textarea id="txt-${item.id}" rows="3" style="width:100%">${item.question}</textarea>
                        <button onclick="saveAdminEdit('${item.id}')">Save</button>
                        <button onclick="toggleEdit('${item.id}')">Cancel</button>
                    </div>
                </td>
                <td>
                    A: ${item.options.A}<br>
                    B: ${item.options.B}<br>
                    C: ${item.options.C}<br>
                    D: ${item.options.D}<br>
                    <strong>Ans: ${item.answer}</strong>
                </td>
                <td>
                    <button onclick="toggleEdit('${item.id}')">✏ Edit</button>
                    <button onclick="deleteQ('${item.id}')" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:3px;">🗑</button>
                </td>
            </tr>
        `;
    });
}

// 4. Actions
window.deleteQ = async (id) => {
    if(confirm("Permanently delete this question?")) await deleteDoc(doc(db, "questions", id));
}

window.toggleEdit = (id) => {
    const box = document.getElementById(`edit-${id}`);
    box.style.display = box.style.display === "block" ? "none" : "block";
}

window.saveAdminEdit = async (id) => {
    const newQ = document.getElementById(`txt-${id}`).value;
    await updateDoc(doc(db, "questions", id), { question: newQ });
    alert("Question Text Updated!");
    toggleEdit(id);
}

window.downloadJSON = () => {
    const t = teacherSelect.value;
    const s = subjectSelect.value;
    
    const dataToDownload = allData.filter(item => {
        return (t === "all" || item.teacher === t) && 
               (s === "all" || item.subject === s);
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToDownload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `questions_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
