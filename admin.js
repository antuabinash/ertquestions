import { db } from "./firebase-config.js";
import { collection, onSnapshot, deleteDoc, doc, query, orderBy } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Basic Password Protection
const pass = prompt("Enter Admin Password:");
if(pass !== "admin123") { // You can change this simple password
    document.body.innerHTML = "<h1>Access Denied</h1>";
    throw new Error("Access Denied");
}

const tableBody = document.getElementById('tableBody');
const filterSelect = document.getElementById('filterSubject');
let allData = [];

// Load Data in Real-time
const q = query(collection(db, "questions"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    allData = [];
    tableBody.innerHTML = "";
    const subjects = new Set();

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        data.id = docSnap.id; // Save ID for deletion
        allData.push(data);
        subjects.add(data.subject);
    });

    // Populate Filter Dropdown
    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.innerText = sub;
        // prevent duplicates in dropdown
        if(![...filterSelect.options].some(o => o.value === sub)){
           filterSelect.appendChild(opt); 
        }
    });

    renderTable(allData);
});

function renderTable(data) {
    tableBody.innerHTML = "";
    data.forEach(item => {
        const row = `
            <tr>
                <td>${item.teacher}</td>
                <td>${item.subject}</td>
                <td>
                    ${item.question} <br>
                    <small style="color:gray">A: ${item.options.A} | B: ${item.options.B}...</small>
                </td>
                <td><b>${item.answer}</b></td>
                <td>
                    <button class="del-btn" onclick="removeQ('${item.id}')">Delete</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Filter Logic
window.filterData = () => {
    const selected = document.getElementById('filterSubject').value;
    if(selected === "all") {
        renderTable(allData);
    } else {
        const filtered = allData.filter(x => x.subject === selected);
        renderTable(filtered);
    }
}

// Delete Logic
window.removeQ = async (id) => {
    if(confirm("Are you sure you want to delete this question?")) {
        await deleteDoc(doc(db, "questions", id));
    }
}
