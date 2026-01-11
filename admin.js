import { db } from "./firebase-config.js";
import { collection, onSnapshot, deleteDoc, doc, query, orderBy } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Password Check (Simple)
const pass = prompt("Enter Admin Password:");
if(pass !== "admin123") {
    document.body.innerHTML = "<h1 style='text-align:center; margin-top:50px;'>⛔ Access Denied</h1>";
    throw new Error("Access Denied");
}

const tableBody = document.getElementById('tableBody');
const filterSelect = document.getElementById('filterSubject');
let allData = [];

// Load Data
const q = query(collection(db, "questions"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    allData = [];
    const subjects = new Set();

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        data.id = docSnap.id; // Store ID for deletion
        allData.push(data);
        subjects.add(data.subject);
    });

    // Update Filter Dropdown
    // Clear old options except the first one
    while (filterSelect.options.length > 1) {
        filterSelect.remove(1);
    }
    
    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.innerText = sub;
        filterSelect.appendChild(opt);
    });

    renderTable(allData);
});

function renderTable(data) {
    tableBody.innerHTML = "";
    
    if(data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No questions found.</td></tr>";
        return;
    }

    data.forEach(item => {
        const row = `
            <tr>
                <td><b>${item.teacher}</b></td>
                <td>${item.subject}</td>
                <td>
                    ${item.question} <br>
                    <div style="font-size:0.85em; color:#666; margin-top:4px;">
                        A) ${item.options.A} <br>
                        B) ${item.options.B} <br>
                        C) ${item.options.C} <br>
                        D) ${item.options.D}
                    </div>
                </td>
                <td style="text-align:center; font-weight:bold;">${item.answer}</td>
                <td style="text-align:center;">
                    <button class="del-btn" onclick="removeQ('${item.id}')">Delete</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Filter Function
window.filterData = () => {
    const selected = document.getElementById('filterSubject').value;
    if(selected === "all") {
        renderTable(allData);
    } else {
        const filtered = allData.filter(x => x.subject === selected);
        renderTable(filtered);
    }
}

// Delete Function
window.removeQ = async (id) => {
    if(confirm("Are you sure you want to permanently delete this question?")) {
        try {
            await deleteDoc(doc(db, "questions", id));
        } catch(e) {
            alert("Error deleting: " + e.message);
        }
    }
}
