// ----------------- Constants and Configuration -----------------
const USERS_KEY = 'cms_users_v2';
const TX_KEY_PREFIX = 'cms_tx_'; // Changed to prefix for user-specific keys
const SESSION_KEY = 'cms_session_v2';
const DEMO_USER = { email: 'student@school.edu', name: 'Demo Student', pin: '1234' };

// ----------------- Utilities -----------------
function nowTimestamp() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return { date: `${mm}/${dd}/${yy}`, time: `${hh}:${min}:${ss}`, iso: d.toISOString() };
}

function uid(prefix = 'id') {
    return prefix + Math.random().toString(36).slice(2, 9);
}

function formatCurrency(amount) {
    return '₱' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const [mm, dd, yy] = dateStr.split('/').map(Number);
    return new Date(2000 + yy, mm - 1, dd);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPin(pin) {
    return pin && pin.length >= 4 && pin.length <= 12 && /^\d+$/.test(pin);
}

function showAlert(message, type = 'info', duration = 5000) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.position = 'fixed';
    alert.style.bottom = '0px';
    alert.style.left = '50%';
    alert.style.transform = 'translateX(-50%)';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '250px';
    alert.style.maxWidth = '90vw';
    alert.style.textAlign = 'center';

    document.body.appendChild(alert);

    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, duration);
    }

    return alert;
}

// ----------------- Storage Functions -----------------
function load(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (e) {
        console.error('Error loading from storage:', e);
        return null;
    }
}

function save(key, val) {
    try {
        localStorage.setItem(key, JSON.stringify(val));
        return true;
    } catch (e) {
        console.error('Error saving to storage:', e);
        showAlert('Error saving data. Please try again.', 'error');
        return false;
    }
}

function getUsers() { return load(USERS_KEY) || []; }
function saveUsers(u) { return save(USERS_KEY, u); }

// User-specific transaction functions
function getTxKey() {
    const session = getSession();
    return session && session.email ? `${TX_KEY_PREFIX}${session.email}` : null;
}

function getTx() {
    const txKey = getTxKey();
    return txKey ? load(txKey) || [] : [];
}

function saveTx(arr) {
    const txKey = getTxKey();
    return txKey ? save(txKey, arr) : false;
}

function getSession() { return load(SESSION_KEY); }
function setSession(session) { return save(SESSION_KEY, session); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

// ----------------- Authentication -----------------
function initAuth() {
    const loginEmail = document.getElementById('login-email');
    const loginPin = document.getElementById('login-pin');
    const btnLogin = document.getElementById('btn-login');
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnRegister = document.getElementById('btn-register');
    const regPin = document.getElementById('reg-pin');
    const passwordStrength = document.getElementById('password-strength');

    // Toggle between login and register forms
    btnShowRegister.addEventListener('click', () => {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    });

    btnShowLogin.addEventListener('click', () => {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });

    // Password strength indicator
    regPin.addEventListener('input', function () {
        const pin = this.value;
        if (!pin) {
            passwordStrength.style.display = 'none';
            return;
        }

        passwordStrength.style.display = 'block';
        if (pin.length < 4) {
            passwordStrength.textContent = 'PIN too short (min 4 digits)';
            passwordStrength.style.color = 'var(--danger)';
        } else if (pin.length > 12) {
            passwordStrength.textContent = 'PIN too long (max 12 digits)';
            passwordStrength.style.color = 'var(--danger)';
        } else if (!/^\d+$/.test(pin)) {
            passwordStrength.textContent = 'PIN should contain only digits';
            passwordStrength.style.color = 'var(--danger)';
        } else {
            passwordStrength.textContent = 'PIN is valid';
            passwordStrength.style.color = 'var(--success)';
        }
    });

    // Register new user
    btnRegister.addEventListener('click', () => {
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const pin = regPin.value;

        if (!name || !email || !pin) {
            showAlert('Please fill all fields', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showAlert('Please enter a valid email address', 'error');
            return;
        }

        if (!isValidPin(pin)) {
            showAlert('PIN must be 4-12 digits', 'error');
            return;
        }

        const users = getUsers();
        if (users.some(u => u.email === email)) {
            showAlert('Email already registered', 'error');
            return;
        }

        users.push({ email, name, pin });
        if (saveUsers(users)) {
            // Initialize empty transaction storage for new user
            const userTxKey = `${TX_KEY_PREFIX}${email}`;
            save(userTxKey, []);

            showAlert('Account created successfully. You may now login.', 'success');
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('login-email').value = email;
        }
    });

    // On page load, populate email if remembered
    window.addEventListener('DOMContentLoaded', () => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            loginEmail.value = rememberedEmail;
            document.getElementById('remember-me').checked = true;
        }
    });

    // Login user
    btnLogin.addEventListener('click', () => {
        const email = loginEmail.value.trim().toLowerCase();
        const pin = loginPin.value;
        const remember = document.getElementById('remember-me').checked;

        if (!email || !pin) {
            showAlert('Please enter both email and PIN', 'error');
            return;
        }

        const users = getUsers();
        const u = users.find(x => x.email === email && x.pin === pin);
        if (!u) {
            showAlert('Invalid email or PIN', 'error');
            return;
        }

        // Remember me
        if (remember) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        const session = { email: u.email, name: u.name, loginAt: nowTimestamp() };
        if (setSession(session)) {
            showAlert('You have been logged in', 'success');
            renderApp();
        }
    });
    //forgot pin
    document.getElementById('btn-forgot-pin').addEventListener('click', () => {
        const email = prompt("Please enter your registered email to reset your PIN / Password:");
        if (!email) {
            showAlert('Email is required to reset PIN / Password', 'error');
            return;
        }
        const users = getUsers();
        const userIndex = users.findIndex(u => u.email === email.trim().toLowerCase());
        if (userIndex === -1) {
            showAlert('Email not found', 'error');
            return;
        }
        const newPin = prompt("Enter your new PIN / Password (4-12 digits):");
        if (!isValidPin(newPin)) {
            showAlert('PIN must be 4-12 digits', 'error');
            return;
        }
        users[userIndex].pin = newPin;
        if (saveUsers(users)) {
            showAlert('PIN has been reset successfully. You may now login with your new PIN / Password.', 'success');
        }
    });

    // Logout with confirmation
    document.getElementById('btn-logout').addEventListener('click', () => {
        const confirmLogout = confirm("Are you sure you want to logout?");
        if (confirmLogout) {
            clearSession();       // clear user session/localStorage data
            renderApp();          // re-render login screen
            showAlert('You have been logged out', 'info'); // optional alert
        } else {
            // user canceled logout, do nothing
            showAlert('Logout canceled', 'info'); // optional
        }
    });

}
function initProfileEditor() {
    const btnEditProfile = document.getElementById('btn-edit-profile');
    const modal = document.getElementById('profile-modal');
    const closeModal = document.getElementById('close-profile-modal');
    const cancelBtn = document.getElementById('cancel-profile');
    const saveBtn = document.getElementById('save-profile');

    btnEditProfile.addEventListener('click', () => {
        const session = getSession();
        document.getElementById('edit-name').value = session.name;
        document.getElementById('edit-pin').value = "";
        modal.classList.add('active');
    });

    function closeProfileModal() {
        modal.classList.remove('active');
    }

    closeModal.addEventListener('click', closeProfileModal);
    cancelBtn.addEventListener('click', closeProfileModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProfileModal(); });

    saveBtn.addEventListener('click', () => {
        const newName = document.getElementById('edit-name').value.trim();
        const newPin = document.getElementById('edit-pin').value;

        let users = getUsers();
        let session = getSession();

        // Update user record
        const userIndex = users.findIndex(u => u.email === session.email);
        if (userIndex !== -1) {
            users[userIndex].name = newName;
            if (newPin !== "") {
                if (!isValidPin(newPin)) {
                    showAlert('PIN must be 4–12 digits', 'error');
                    return;
                }
                users[userIndex].pin = newPin;
            }
            saveUsers(users);

            // Update session so UI updates immediately
            session.name = newName;
            setSession(session);

            renderApp();
            showAlert('Profile updated successfully!', 'success');
        }

        closeProfileModal();
    });
}
// ----------------- Transaction Management -----------------
function initTransactions() {
    const btnAddTrans = document.getElementById('btn-add-trans');
    const modal = document.getElementById('modal');
    const btnCancelTrans = document.getElementById('btn-cancel-trans');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnSaveTrans = document.getElementById('btn-save-trans');
    const transType = document.getElementById('trans-type');
    const transAmount = document.getElementById('trans-amount');
    const transNote = document.getElementById('trans-note');
    const modalTitle = document.getElementById('modal-title');
    const editMeta = document.getElementById('edit-meta');

    let editingId = null;

    // Open modal for adding/editing transactions
    btnAddTrans.addEventListener('click', () => openModal());
    btnCancelTrans.addEventListener('click', closeModal);
    btnCloseModal.addEventListener('click', closeModal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Save transaction
    btnSaveTrans.addEventListener('click', saveTransaction);

    function openModal(tx = null) {
        editingId = null;
        modal.classList.add('active');

        if (tx) {
            modalTitle.textContent = 'Edit transaction';
            transType.value = tx.type;
            transAmount.value = tx.amount;
            transNote.value = tx.note;
            editingId = tx.id;
            editMeta.style.display = 'block';
            editMeta.textContent = `Created by ${tx.createdBy} on ${tx.createdAt.date} ${tx.createdAt.time}` +
                (tx.editedBy ? ` — Last edited by ${tx.editedBy} on ${tx.editedAt.date} ${tx.editedAt.time}` : '');
        } else {
            modalTitle.textContent = 'Add transaction';
            transType.value = 'inflow';
            transAmount.value = '';
            transNote.value = '';
            editMeta.style.display = 'none';
        }
    }

    function closeModal() {
        modal.classList.remove('active');
        editingId = null;
    }

    function saveTransaction() {
        const session = getSession();
        if (!session) {
            showAlert('Not logged in', 'error');
            return;
        }

        const type = transType.value;
        const amount = parseFloat(transAmount.value);
        const note = transNote.value.trim();

        if (isNaN(amount) || amount <= 0) {
            showAlert('Please enter a valid amount', 'error');
            return;
        }

        if (!note) {
            showAlert('Please enter a note/description', 'error');
            return;
        }

        const txs = getTx();

        if (editingId) {
            // Update existing transaction
            const idx = txs.findIndex(x => x.id === editingId);
            if (idx === -1) {
                showAlert('Transaction not found', 'error');
                closeModal();
                return;
            }

            txs[idx].type = type;
            txs[idx].amount = amount;
            txs[idx].note = note;
            txs[idx].editedBy = session.email;
            txs[idx].editedAt = nowTimestamp();

            if (saveTx(txs)) {
                showAlert('Transaction updated successfully', 'success');
            }
        } else {
            // Create new transaction
            const ts = nowTimestamp();
            const tx = {
                id: uid('tx_'),
                type,
                amount,
                note,
                date: ts.date,
                time: ts.time,
                createdBy: session.email,
                createdAt: ts
            };

            txs.push(tx);
            if (saveTx(txs)) {
                showAlert('Transaction saved successfully', 'success');
            }
        }

        closeModal();
        loadAndRender();
    }

    // Expose edit and delete functions globally for inline buttons
    window.editTx = function (id) {
        const txs = getTx();
        const tx = txs.find(x => x.id === id);
        if (!tx) return;
        openModal(tx);
    };

    window.deleteTx = function (id) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;

        const txs = getTx().filter(x => x.id !== id);
        if (saveTx(txs)) {
            showAlert('Transaction deleted', 'success');
            loadAndRender();
        }
    };
}

// ----------------- Filtering and Controls -----------------
function initFilters() {
    const filterStart = document.getElementById('filter-start');
    const filterEnd = document.getElementById('filter-end');
    const btnApplyFilter = document.getElementById('btn-apply-filter');
    const btnClearFilter = document.getElementById('btn-clear-filter');
    const viewType = document.getElementById('view-type');
    const searchInput = document.getElementById('search');

    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    filterStart.valueAsDate = firstDay;
    filterEnd.valueAsDate = lastDay;

    // Apply filters
    btnApplyFilter.addEventListener('click', loadAndRender);
    btnClearFilter.addEventListener('click', () => {
        filterStart.value = '';
        filterEnd.value = '';
        loadAndRender();
    });

    // Update on filter changes
    viewType.addEventListener('change', loadAndRender);
    searchInput.addEventListener('input', debounce(loadAndRender, 300));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ----------------- Data Rendering -----------------
function loadAndRender() {
    const txs = getTx();
    const session = getSession();
    const start = document.getElementById('filter-start').value ? new Date(document.getElementById('filter-start').value) : null;
    const end = document.getElementById('filter-end').value ? new Date(document.getElementById('filter-end').value) : null;
    const viewType = document.getElementById('view-type').value;
    const searchQuery = (document.getElementById('search').value || '').toLowerCase();

    // Filter transactions
    let filtered = txs.filter(tx => {
        // Filter by date range
        if (start && new Date(tx.createdAt.iso) < start) return false;
        if (end) {
            const endDate = new Date(end);
            endDate.setDate(endDate.getDate() + 1);
            if (new Date(tx.createdAt.iso) >= endDate) return false;
        }

        // Filter by view type
        if (viewType !== 'all' && tx.type !== viewType) return false;

        // Filter by search query
        if (searchQuery &&
            !tx.note.toLowerCase().includes(searchQuery) &&
            !String(tx.amount).includes(searchQuery)) {
            return false;
        }

        return true;
    });

    // Update statistics
    updateStatistics(filtered);

    // Render transactions
    renderTransactions(filtered);

    // Render daily summary
    renderDailySummary(filtered);

    // Render savings history
    renderHistory(txs);
    updateMonthlySavingsChart();
}

function updateStatistics(transactions) {
    // Get ALL transactions for the selected period (not filtered by view type)
    const allTransactions = getTx();
    const start = document.getElementById('filter-start').value ? new Date(document.getElementById('filter-start').value) : null;
    const end = document.getElementById('filter-end').value ? new Date(document.getElementById('filter-end').value) : null;

    // Filter by date range only (not by view type)
    let periodTransactions = allTransactions.filter(tx => {
        if (start && new Date(tx.createdAt.iso) < start) return false;
        if (end) {
            const endDate = new Date(end);
            endDate.setDate(endDate.getDate() + 1);
            if (new Date(tx.createdAt.iso) >= endDate) return false;
        }
        return true;
    });

    // Calculate statistics from ALL transactions in the period
    const stats = periodTransactions.reduce((acc, tx) => {
        if (tx.type === 'inflow') {
            acc.inflow += tx.amount;
        } else {
            acc.outflow += tx.amount;
        }
        acc.count++;
        return acc;
    }, { inflow: 0, outflow: 0, count: 0 });

    document.getElementById('stat-inflow').textContent = formatCurrency(stats.inflow);
    document.getElementById('stat-outflow').textContent = formatCurrency(stats.outflow);
    document.getElementById('stat-savings').textContent = formatCurrency(stats.inflow - stats.outflow);
    document.getElementById('stat-count').textContent = stats.count;
}

function renderTransactions(transactions) {
    const container = document.getElementById('transactions');

    if (transactions.length === 0) {
        container.innerHTML = '<div class="text-center muted mt-3">No transactions found</div>';
        return;
    }

    // Get ALL transactions for savings calculation
    const allTransactions = getTx();

    // Group ALL transactions by date for savings calculation
    const allByDate = {};
    allTransactions.forEach(tx => {
        if (!allByDate[tx.date]) allByDate[tx.date] = { inflow: 0, outflow: 0 };
        if (tx.type === 'inflow') allByDate[tx.date].inflow += tx.amount;
        else allByDate[tx.date].outflow += tx.amount;
    });

    // Sort dates in ASCENDING order for savings calculation
    const datesAsc = Object.keys(allByDate).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateA - dateB;
    });

    // Calculate cumulative savings in ascending order
    let runningBalance = 0;
    const savingsByDate = {};
    
    datesAsc.forEach(date => {
        const data = allByDate[date];
        const dailySavings = data.inflow - data.outflow;
        runningBalance += dailySavings;
        savingsByDate[date] = runningBalance;
    });

    // Group filtered transactions by date for display
    const byDate = {};
    transactions.forEach(tx => {
        if (!byDate[tx.date]) byDate[tx.date] = [];
        byDate[tx.date].push(tx);
    });

    // Sort dates in descending order for display
    const datesDesc = Object.keys(byDate).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateB - dateA;
    });

    // Render transactions by date
    container.innerHTML = '';
    datesDesc.forEach(date => {
        // Sort newest first (LIFO)
        const dateTransactions = byDate[date].sort((a, b) => b.time.localeCompare(a.time));

        // Calculate totals for ALL transactions of this date for the current user
        const allDateTransactions = allTransactions.filter(tx => tx.date === date);
        const dateTotal = allDateTransactions.reduce((acc, tx) => {
            if (tx.type === 'inflow') acc.inflow += tx.amount;
            else acc.outflow += tx.amount;
            return acc;
        }, { inflow: 0, outflow: 0 });

        // Use cumulative savings from savingsByDate
        const savings = savingsByDate[date] || 0;

        const dateHeader = document.createElement('div');
        dateHeader.className = 'card';
        dateHeader.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <strong>${date}</strong>
                    <div class="muted small">Total inflow: ${formatCurrency(dateTotal.inflow)} — outflow: ${formatCurrency(dateTotal.outflow)}</div>
                </div>
                <div class="text-right">
                    <div class="badge ${savings >= 0 ? 'badge-success' : 'badge-danger'}" style="padding:6px 10px">
                        Savings ${formatCurrency(savings)}
                    </div>
                </div>
            </div>
        `;

        const list = document.createElement('div');
        list.className = 'trans-list';

        // Only show transactions that match the current view filter
        dateTransactions.forEach(tx => {
            const item = document.createElement('div');
            item.className = 'trans-item';
            item.innerHTML = `
                <div class="trans-info">
                    <div class="flex items-center gap-2">
                        <div class="badge ${tx.type === 'inflow' ? 'badge-success' : 'badge-danger'}">
                            ${tx.type === 'inflow' ? 'IN' : 'OUT'}
                        </div>
                        <div>
                            <div class="trans-amount">${formatCurrency(tx.amount)}</div>
                            <div class="muted">${tx.note || ''}</div>
                        </div>
                    </div>
                    <div class="trans-meta">
                        ${tx.date} ${tx.time} — by ${tx.createdBy}
                        ${tx.editedBy ? ` — edited by ${tx.editedBy} ${tx.editedAt.date} ${tx.editedAt.time}` : ''}
                    </div>
                </div>
                <div class="trans-actions no-print">
                    <button class="btn-secondary btn-small" onclick="editTx('${tx.id}')">Edit</button>
                    <button class="btn-danger btn-small" onclick="deleteTx('${tx.id}')">Delete</button>
                </div>
            `;
            list.appendChild(item);
        });

        dateHeader.appendChild(list);
        container.appendChild(dateHeader);
    });
}

function renderDailySummary(transactions) {
    const container = document.getElementById('daily-summary');

    // Get ALL transactions for the selected period (not filtered by view type)
    const allTransactions = getTx();
    const start = document.getElementById('filter-start').value ? new Date(document.getElementById('filter-start').value) : null;
    const end = document.getElementById('filter-end').value ? new Date(document.getElementById('filter-end').value) : null;

    // Filter by date range only (not by view type)
    let periodTransactions = allTransactions.filter(tx => {
        if (start && new Date(tx.createdAt.iso) < start) return false;
        if (end) {
            const endDate = new Date(end);
            endDate.setDate(endDate.getDate() + 1);
            if (new Date(tx.createdAt.iso) >= endDate) return false;
        }
        return true;
    });

    if (periodTransactions.length === 0) {
        container.innerHTML = '<div class="muted">No transactions for selected period.</div>';
        return;
    }

    // Group by date and calculate totals from ALL transactions in the period
    const byDate = {};
    periodTransactions.forEach(tx => {
        if (!byDate[tx.date]) byDate[tx.date] = { inflow: 0, outflow: 0 };
        if (tx.type === 'inflow') byDate[tx.date].inflow += tx.amount;
        else byDate[tx.date].outflow += tx.amount;
    });

    // Sort dates in ASCENDING order for savings calculation
    const datesAsc = Object.keys(byDate).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateA - dateB;
    });

    // Calculate cumulative savings in ascending order
    let runningBalance = 0;
    const savingsByDate = {};
    
    datesAsc.forEach(date => {
        const data = byDate[date];
        const dailySavings = data.inflow - data.outflow;
        runningBalance += dailySavings;
        savingsByDate[date] = runningBalance;
    });

    // Sort dates in DESCENDING order for display
    const datesDesc = Object.keys(byDate).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateB - dateA;
    });

    // Create table
    let html = '<table><thead><tr><th>Date</th><th>Inflow</th><th>Outflow</th><th class="text-center">Savings</th></tr></thead><tbody>';

    datesDesc.forEach(date => {
        const data = byDate[date];
        const savings = savingsByDate[date];
        html += `
            <tr>
                <td>${date}</td>
                <td>${formatCurrency(data.inflow)}</td>
                <td>${formatCurrency(data.outflow)}</td>
                <td class="${savings >= 0 ? 'badge-success' : 'badge-danger'}" style="text-align:center">${formatCurrency(savings)}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderHistory(allTransactions) {
    const container = document.getElementById('history-list');

    if (allTransactions.length === 0) {
        container.innerHTML = '<div class="muted">No history yet.</div>';
        return;
    }

    // Group by date and calculate totals
    const byDate = {};
    allTransactions.forEach(tx => {
        if (!byDate[tx.date]) byDate[tx.date] = { inflow: 0, outflow: 0 };
        if (tx.type === 'inflow') byDate[tx.date].inflow += tx.amount;
        else byDate[tx.date].outflow += tx.amount;
    });

    // Sort dates in ASCENDING order for savings calculation
    const datesAsc = Object.keys(byDate).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateA - dateB;
    });

    // Calculate cumulative savings in ascending order
    let runningBalance = 0;
    const savingsByDate = {};
    
    datesAsc.forEach(date => {
        const data = byDate[date];
        const dailySavings = data.inflow - data.outflow;
        runningBalance += dailySavings;
        savingsByDate[date] = runningBalance;
    });

    // Sort dates in DESCENDING order for display
    const datesDesc = Object.keys(byDate).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateB - dateA;
    });

    // Create table
    let html = '<table><thead><tr><th>Date</th><th>Savings</th><th>Notes</th></tr></thead><tbody>';

    datesDesc.forEach(date => {
        const data = byDate[date];
        const savings = savingsByDate[date];
        html += `
            <tr>
                <td>${date}</td>
                <td class="${savings >= 0 ? 'badge-success' : 'badge-danger'}" style="text-align:center">${formatCurrency(savings)}</td>
                <td class="muted">Inflow: ${formatCurrency(data.inflow)} | Outflow: ${formatCurrency(data.outflow)}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}
// ----------------- Print and Export -----------------
function initPrintExport() {
    const btnPrint = document.getElementById('btn-print');

    btnPrint.addEventListener('click', showPrintOptions);
}

function showPrintOptions() {
    // Create a modal for print options
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Print Report</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div>
                <label for="print-report-type">Select Report Type:</label>
                <select id="print-report-type" class="w-full mt-2">
                    <option value="daily-cash-inflows">A. Daily Cash Inflows Report</option>
                    <option value="daily-cash-outflows">B. Daily Cash Outflows Report</option>
                    <option value="daily-savings">C. Daily Savings Summary</option>
                </select>
                <div class="flex gap-2 mt-3">
                    <button id="btn-confirm-print" class="btn-primary">Print</button>
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Set up the confirm print button
    document.getElementById('btn-confirm-print').addEventListener('click', () => {
        const reportType = document.getElementById('print-report-type').value;
        modal.remove();
        printReport(reportType);
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function printReport(reportType = null) {
    // Use provided reportType or fall back to the dropdown selection
    const selectedReportType = reportType || document.getElementById('report-type').value;
    const txs = getTx();
    const start = document.getElementById('filter-start').value ? new Date(document.getElementById('filter-start').value) : null;
    const end = document.getElementById('filter-end').value ? new Date(document.getElementById('filter-end').value) : null;

    // Filter transactions by date range
    let filtered = txs.filter(tx => {
        if (start && new Date(tx.createdAt.iso) < start) return false;
        if (end) {
            const endDate = new Date(end);
            endDate.setDate(endDate.getDate() + 1);
            if (new Date(tx.createdAt.iso) >= endDate) return false;
        }
        return true;
    });

    // Prepare printable content
    let html = '<h2>Student Cash Management System - Report</h2>';
    const session = getSession();
    const timestamp = nowTimestamp();

    if (session) {
        html += `<div><strong>User:</strong> ${session.email} (${session.name})</div>`;
    }
    html += `<div><strong>Generated:</strong> ${timestamp.date} ${timestamp.time}</div>`;

    if (start || end) {
        html += `<div><strong>Period:</strong> ${start ? start.toLocaleDateString() : 'Start'} to ${end ? end.toLocaleDateString() : 'End'}</div>`;
    }

    html += '<hr style="margin:1rem 0">';

    // helper to sort dates descending
    const sortDatesDesc = (a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateB - dateA;
    };

    if (selectedReportType === 'daily-cash-inflows') {
        html += '<h3>Daily Cash Inflows Report</h3>';
        // group by date
        const byDate = {};
        filtered.forEach(tx => {
            if (tx.type !== 'inflow') return;
            if (!byDate[tx.date]) byDate[tx.date] = [];
            byDate[tx.date].push(tx);
        });

        html += '<table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Timestamp</th><th>Edited By</th></tr></thead><tbody>';
        Object.keys(byDate).sort(sortDatesDesc).forEach(date => {
            const items = byDate[date].sort((a, b) => a.time.localeCompare(b.time));
            items.forEach(tx => {
                const edited = tx.editedBy ? `${tx.editedBy} (${tx.editedAt.date} ${tx.editedAt.time})` : '-';
                html += `<tr>
                            <td>${date}</td>
                            <td>${tx.note || '-'}</td>
                            <td>${formatCurrency(tx.amount)}</td>
                            <td>${tx.createdAt.date} ${tx.createdAt.time}</td>
                            <td>${edited}</td>
                         </tr>`;
            });
        });
        html += '</tbody></table>';

    } else if (selectedReportType === 'daily-cash-outflows') {
        html += '<h3>Daily Cash Outflows Report</h3>';
        // group by date
        const byDate = {};
        filtered.forEach(tx => {
            if (tx.type !== 'outflow') return;
            if (!byDate[tx.date]) byDate[tx.date] = [];
            byDate[tx.date].push(tx);
        });

        html += '<table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Timestamp</th><th>Edited By</th></tr></thead><tbody>';
        Object.keys(byDate).sort(sortDatesDesc).forEach(date => {
            const items = byDate[date].sort((a, b) => a.time.localeCompare(b.time));
            items.forEach(tx => {
                const edited = tx.editedBy ? `${tx.editedBy} (${tx.editedAt.date} ${tx.editedAt.time})` : '-';
                html += `<tr>
                            <td>${date}</td>
                            <td>${tx.note || '-'}</td>
                            <td>${formatCurrency(tx.amount)}</td>
                            <td>${tx.createdAt.date} ${tx.createdAt.time}</td>
                            <td>${edited}</td>
                         </tr>`;
            });
        });
        html += '</tbody></table>';

    } else {
        // Daily Savings Summary - show per-date savings and include timestamp & edited-by summary
        html += '<h3>Daily Savings Summary</h3>';
        const byDate = {};
        filtered.forEach(tx => {
            if (!byDate[tx.date]) byDate[tx.date] = { inflow: 0, outflow: 0, latestIso: null, editors: new Set() };
            if (tx.type === 'inflow') byDate[tx.date].inflow += tx.amount;
            else byDate[tx.date].outflow += tx.amount;

            // track latest timestamp for the date
            if (!byDate[tx.date].latestIso || new Date(tx.createdAt.iso) > new Date(byDate[tx.date].latestIso)) {
                byDate[tx.date].latestIso = tx.createdAt.iso;
            }

            if (tx.editedBy) byDate[tx.date].editors.add(`${tx.editedBy} (${tx.editedAt.date} ${tx.editedAt.time})`);
        });

        html += '<table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Timestamp</th><th>Edited By</th></tr></thead><tbody>';
        Object.keys(byDate).sort(sortDatesDesc).forEach(date => {
            const data = byDate[date];
            const savings = data.inflow - data.outflow;
            const ts = data.latestIso ? new Date(data.latestIso) : null;
            const tsDisplay = ts ? `${String(ts.getMonth() + 1).padStart(2, '0')}/${String(ts.getDate()).padStart(2, '0')}/${String(ts.getFullYear()).slice(-2)} ${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}` : '-';
            const editorsArr = Array.from(data.editors);
            const editorsDisplay = editorsArr.length ? editorsArr.join('; ') : '-';

            html += `<tr>
                        <td>${date}</td>
                        <td>Daily Savings</td>
                        <td>${formatCurrency(savings)}</td>
                        <td>${tsDisplay}</td>
                        <td>${editorsDisplay}</td>
                     </tr>`;
        });
        html += '</tbody></table>';
    }

    // Open print windowA
    const w = window.open('', '_blank');
    w.document.write(`
        <html>
            <head>
                <title>Student Cash Management System - Report</title>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width,initial-scale=1"/>
                <style>
                    body { font-family: Arial, Helvetica, sans-serif; padding: 1rem; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                    th, td { padding: 0.75rem; border: 1px solid #ddd; text-align: left; vertical-align: top; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    hr { margin: 1rem 0; border: 0; border-top: 1px solid #eee; }
                    h2, h3 { margin-bottom: 0.5rem; }
                </style>
            </head>
            <body>
                ${html}
            </body>
        </html>
    `);
    w.document.close();
    w.print();
}
// ----------------- Monthly Savings Chart -----------------
let monthlySavingsChart;

function initMonthlySavingsChart() {
    const ctx = document.getElementById('weeklySavingsChart');
    if (!ctx) return;

    const { labels, data } = getMonthlySavings();

    monthlySavingsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: "Daily Savings (₱)",
                data: data,
                borderWidth: 3,
                pointRadius: 4,
                tension: 0.4,
                borderColor: "#4CAF50",
                pointBackgroundColor: "#4CAF50"
            },
            {
                // GOAL LINE
                label: "Daily Goal",
                data: Array(12).fill(100), // Example goal = ₱100 per day
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.3,
                borderColor: "#FF9800",
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: { enabled: true },
                legend: { position: "bottom" }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Amount (₱)" }
                },
            }
        }
    });
}

function updateMonthlySavingsChart() {
    if (!monthlySavingsChart) return;

    const { labels, data } = getMonthlySavings();
    monthlySavingsChart.data.labels = labels;
    monthlySavingsChart.data.datasets[0].data = data;
    monthlySavingsChart.update();
}

function getMonthlySavings() {
    const currentYear = new Date().getFullYear();
    const tx = getTx(); // all transactions

    // Initialize savings array for each month of the year
    const savingsData = Array(12).fill(0);
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    tx.forEach(t => {
        const date = parseDate(t.date);
        if (date && date.getFullYear() === currentYear) {
            const monthIndex = date.getMonth(); // 0-11
            savingsData[monthIndex] += (t.type === "inflow" ? t.amount : -t.amount);
        }
    });

    return { labels, data: savingsData };
}

function exportData() {
    const txs = getTx();
    const session = getSession();
    const data = {
        exportedAt: nowTimestamp(),
        user: session ? { email: session.email, name: session.name } : null,
        transactions: txs
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash_management_${nowTimestamp().date.replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showAlert('Data exported successfully', 'success');
}

// ----------------- App Initialization -----------------
function renderApp() {
    const session = getSession();
    const authSection = document.getElementById('auth');
    const dashboard = document.getElementById('dashboard');
    const logoutBtn = document.getElementById('btn-logout');

    if (!session) {
        authSection.style.display = 'block';
        dashboard.style.display = 'none';
        logoutBtn.style.display = 'none';
        return;
    }

    authSection.style.display = 'none';
    dashboard.style.display = 'block';
    logoutBtn.style.display = 'inline-block';

    document.getElementById('u-email').textContent = session.email;
    document.getElementById('u-name').textContent = session.name || '';
    initProfileEditor();
    loadAndRender();
}
function initApp() {
    // Create demo user if no users exist
    const users = getUsers();
    if (users.length === 0) {
        users.push(DEMO_USER);
        saveUsers(users);
    }

    // Initialize all components
    initAuth();
    initTransactions();
    initFilters();
    initPrintExport();
    initMonthlySavingsChart();
    updateMonthlySavingsChart();
    // Render the app based on current session
    renderApp();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
