// ── CHANGE PIN HERE ──────────────────────────────────
const CORRECT_PIN = '1234';
// API is same-origin (server serves frontend)
const API_BASE = 'https://tceme.onrender.com';
// ────────────────────────────────────────────────────

let currentPin = '';
let currentBatch = 'all';
let debounceTimer;

// PIN
function pinPress(d) {
    if (currentPin.length >= 4) return;
    currentPin += d;
    updateDots();
    if (currentPin.length === 4) setTimeout(checkPin, 100);
}
function pinDelete() {
    currentPin = currentPin.slice(0, -1);
    updateDots();
    document.getElementById('pinError').textContent = '';
}
function updateDots() {
    for (let i = 1; i <= 4; i++)
        document.getElementById('d' + i).classList.toggle('filled', i <= currentPin.length);
}
function checkPin() {
    if (currentPin === CORRECT_PIN) {
        document.getElementById('pin-page').style.display = 'none';
        document.getElementById('app-page').style.display = 'block';
        document.getElementById('lockBtn').style.display = 'block';
        loadStudents();
    } else {
        document.getElementById('pinError').textContent = 'Incorrect PIN. Try again.';
        const card = document.querySelector('.pin-card');
        ['-10px','10px','-6px','0'].forEach((x, i) =>
            setTimeout(() => card.style.transform = `translateX(${x})`, i * 80));
        currentPin = '';
        updateDots();
    }
}
function logout() {
    currentPin = ''; updateDots();
    document.getElementById('pinError').textContent = '';
    document.getElementById('pin-page').style.display = 'flex';
    document.getElementById('app-page').style.display = 'none';
    document.getElementById('lockBtn').style.display = 'none';
    document.getElementById('searchInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    document.getElementById('suggestions').style.display = 'none';
    document.getElementById('studentList').innerHTML = '';
    document.getElementById('listHeader').textContent = 'Loading students...';
    document.querySelectorAll('.batch-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.batch-btn').classList.add('active');
    currentBatch = 'all';
}

// Load students
async function loadStudents(batch) {
    const list   = document.getElementById('studentList');
    const header = document.getElementById('listHeader');
    list.innerHTML = '<div class="loading">Loading...</div>';
    try {
        const url = (batch && batch !== 'all')
            ? `/api/students?batch=${encodeURIComponent(batch)}`
            : '/api/students';
        const data = await (await fetch(url)).json();
        header.textContent = `${data.length} Student${data.length !== 1 ? 's' : ''}`;
        renderStudents(data);
    } catch {
        list.innerHTML = '<div class="no-results"><div class="emoji">⚠️</div><p>Could not load students</p></div>';
    }
}

function renderStudents(data) {
    const list = document.getElementById('studentList');
    if (!data.length) {
        list.innerHTML = '<div class="no-results"><div class="emoji">🔍</div><p>No students found</p></div>';
        return;
    }
    list.innerHTML = data.map(s => `
        <div class="student-card" onclick="openDetail('${s._id}')">
            <div class="s-avatar">${s.name[0].toUpperCase()}</div>
            <div class="s-info">
                <div class="s-name">${escapeHtml(s.name)}</div>
                <div class="s-sub">${s.regNo || ''}${s.regNo && s.batch ? ' · ' : ''}${s.batch || ''}${s.section ? ' · Sec ' + s.section : ''}</div>
            </div>
            <span class="s-arrow">›</span>
        </div>`).join('');
}

// Batch filter
function setBatch(batch, btn) {
    currentBatch = batch;
    document.querySelectorAll('.batch-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const q = document.getElementById('searchInput').value.trim();
    if (q) searchStudents(q);
    else loadStudents(batch === 'all' ? null : batch);
}

// Search
const searchInput   = document.getElementById('searchInput');
const suggestionsEl = document.getElementById('suggestions');
const clearBtn      = document.getElementById('clearBtn');

searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    clearBtn.style.display = q ? 'block' : 'none';
    clearTimeout(debounceTimer);
    if (!q) {
        suggestionsEl.style.display = 'none';
        loadStudents(currentBatch === 'all' ? null : currentBatch);
        return;
    }
    debounceTimer = setTimeout(() => showSuggestions(q), 280);
});

searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        suggestionsEl.style.display = 'none';
        searchStudents(searchInput.value.trim());
    }
});

async function showSuggestions(q) {
    try {
        const batch = currentBatch !== 'all' ? `&batch=${encodeURIComponent(currentBatch)}` : '';
        const data  = await (await fetch(`/api/students/search?q=${encodeURIComponent(q)}${batch}`)).json();
        if (!data.length) { suggestionsEl.style.display = 'none'; return; }
        suggestionsEl.innerHTML = data.slice(0, 6).map(s => `
            <div class="suggestion-item" onclick="selectStudent('${s._id}','${escapeHtml(s.name)}')">
                <span class="sug-name">${escapeHtml(s.name)}</span>
                <span class="sug-reg">${s.regNo || ''}</span>
            </div>`).join('');
        suggestionsEl.style.display = 'block';
    } catch { suggestionsEl.style.display = 'none'; }
}

function selectStudent(id, name) {
    searchInput.value = name;
    suggestionsEl.style.display = 'none';
    openDetail(id);
}

async function searchStudents(q) {
    if (!q) { loadStudents(currentBatch === 'all' ? null : currentBatch); return; }
    const list   = document.getElementById('studentList');
    const header = document.getElementById('listHeader');
    list.innerHTML = '<div class="loading">Searching...</div>';
    try {
        const batch = currentBatch !== 'all' ? `&batch=${encodeURIComponent(currentBatch)}` : '';
        const data  = await (await fetch(`/api/students/search?q=${encodeURIComponent(q)}${batch}`)).json();
        header.textContent = `${data.length} result${data.length !== 1 ? 's' : ''} for "${q}"`;
        renderStudents(data);
    } catch {
        list.innerHTML = '<div class="no-results"><div class="emoji">⚠️</div><p>Search failed</p></div>';
    }
}

function clearSearch() {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    suggestionsEl.style.display = 'none';
    loadStudents(currentBatch === 'all' ? null : currentBatch);
}

document.addEventListener('click', e => {
    if (!e.target.closest('.search-bar-wrap')) suggestionsEl.style.display = 'none';
});

// Detail modal
async function openDetail(id) {
    suggestionsEl.style.display = 'none';
    try {
        const s = await (await fetch(`/api/students/${id}`)).json();
        document.getElementById('modalContent').innerHTML = `
            <div class="m-avatar">${s.name[0].toUpperCase()}</div>
            <div class="m-name">${escapeHtml(s.name)}</div>
            <div class="m-reg">${s.regNo || ''}</div>
            <div class="m-center"><span class="m-dept">${s.department || 'Mechanical Engineering'}</span></div>
            ${s.phone ? `
            <div class="contact-box">
                <div class="contact-icon">📞</div>
                <div class="contact-info">
                    <div class="contact-label">Phone</div>
                    <div class="contact-value">${s.phone}</div>
                </div>
                <button class="copy-btn" onclick="copyText('${s.phone}')">Copy</button>
            </div>` : ''}
            ${s.email ? `
            <div class="contact-box">
                <div class="contact-icon">✉️</div>
                <div class="contact-info">
                    <div class="contact-label">Email</div>
                    <div class="contact-value">${s.email}</div>
                </div>
                <button class="copy-btn" onclick="copyText('${s.email}')">Copy</button>
            </div>` : ''}
            ${s.phone || s.email ? `
            <div class="action-grid">
                ${s.phone ? `
                <button class="action-btn btn-call" onclick="window.location='tel:${s.phone}'">📞 Call</button>
                <button class="action-btn btn-wa" onclick="window.open('https://wa.me/91${s.phone}')">💬 WhatsApp</button>` : ''}
                ${s.email ? `
                <button class="action-btn btn-email" onclick="window.location='mailto:${s.email}'">✉️ Email</button>` : ''}
            </div>` : ''}
            <div class="detail-section">
                <div class="detail-title">Details</div>
                <div class="detail-grid">
                    <div class="detail-item"><label>Batch</label><p>${s.batch || '—'}</p></div>
                    ${s.tutorName ? `<div class="detail-item"><label>Tutor</label><p>${s.tutorName}</p></div>` : ''}
                </div>
            </div>`;
        document.getElementById('detailModal').classList.add('open');
    } catch { alert('Could not load student details'); }
}

function closeModal(e) {
    if (!e || e.target === document.getElementById('detailModal'))
        document.getElementById('detailModal').classList.remove('open');
}

function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => alert(text));
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
