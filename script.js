// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let medicines = [];
let history = [];
let currentDate = new Date();
let selectedDate = new Date();
let audioContext = null;
let alarmCheckInterval = null;
let searchQuery = '';
let soundEnabled = false;

// ========== ПРИВЕТСТВЕННЫЙ ЭКРАН (исчезает через 2 СЕКУНДЫ) ==========
function initWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    
    if (!welcomeScreen) return;
    
    // Показываем приветствие
    welcomeScreen.style.display = 'flex';
    welcomeScreen.style.opacity = '1';
    welcomeScreen.style.visibility = 'visible';
    
    // Запускаем таймер на 2 секунды (2000 миллисекунд)
    setTimeout(function() {
        // Анимация исчезновения
        welcomeScreen.style.transition = 'opacity 0.5s ease';
        welcomeScreen.style.opacity = '0';
        
        setTimeout(function() {
            welcomeScreen.style.display = 'none';
            welcomeScreen.style.visibility = 'hidden';
            playWelcomeSound();
        }, 500);
    }, 2000); // ← 2000 = 2 СЕКУНДЫ
}

function playWelcomeSound() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') audioContext.resume();
        
        const notes = [
            { freq: 523.25, delay: 0, duration: 0.15 },
            { freq: 659.25, delay: 0.12, duration: 0.15 },
            { freq: 783.99, delay: 0.24, duration: 0.25 }
        ];
        
        notes.forEach(({ freq, delay, duration }) => {
            setTimeout(() => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
                osc.start(audioContext.currentTime);
                osc.stop(audioContext.currentTime + duration);
            }, delay * 1000);
        });
    } catch(e) {
        console.log('Sound not available');
    }
}

// ========== ТЕМА ==========
function initTheme() {
    const savedTheme = localStorage.getItem('medtrek_theme');
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
        if (icon) icon.textContent = '☀️';
        if (text) text.textContent = 'Светлая';
    } else {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        if (icon) icon.textContent = '🌙';
        if (text) text.textContent = 'Тёмная';
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    
    if (isDark) {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        localStorage.setItem('medtrek_theme', 'light');
        if (icon) icon.textContent = '🌙';
        if (text) text.textContent = 'Тёмная';
    } else {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        localStorage.setItem('medtrek_theme', 'dark');
        if (icon) icon.textContent = '☀️';
        if (text) text.textContent = 'Светлая';
    }
}

// ========== АКТИВАЦИЯ ЗВУКА ==========
function enableSound() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        audioContext.resume().then(() => {
            soundEnabled = true;
            const bar = document.getElementById('soundPermissionBar');
            if (bar) bar.style.display = 'none';
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(audioContext.currentTime + 0.3);
            localStorage.setItem('medtrek_sound_enabled', 'true');
        });
    } catch(e) { console.log('Sound enable error:', e); }
}

function initSoundCheck() {
    if (localStorage.getItem('medtrek_sound_enabled') === 'true') {
        const bar = document.getElementById('soundPermissionBar');
        if (bar) bar.style.display = 'none';
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        audioContext.resume().then(() => { soundEnabled = true; });
    }
}

function showNotification() {
    if (Notification.permission === 'granted') {
        new Notification('💊 MedTrek', { body: 'Время принять лекарство!' });
    }
}

function playSuccessSound() {
    if (!soundEnabled) return;
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.2;
        osc.start();
        osc.stop(audioContext.currentTime + 0.2);
    } catch(e) {}
}

// ========== ДАННЫЕ ==========
function loadData() {
    try {
        const savedMeds = localStorage.getItem('medicines');
        const savedHistory = localStorage.getItem('history');
        
        if (savedMeds) medicines = JSON.parse(savedMeds);
        if (savedHistory) history = JSON.parse(savedHistory);
    } catch(e) {
        console.error('Error loading data:', e);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('medDate');
    if (dateInput) dateInput.value = today;
    
    renderAll();
    startAlarmChecker();
}

function saveData() {
    localStorage.setItem('medicines', JSON.stringify(medicines));
    localStorage.setItem('history', JSON.stringify(history));
    renderCalendar();
}

function renderAll() {
    renderMedicines();
    renderHistory();
    renderCalendar();
}

// ========== УПРАВЛЕНИЕ ЛЕКАРСТВАМИ ==========
function addMedicine() {
    const nameInput = document.getElementById('medName');
    const timeInput = document.getElementById('medTime');
    const dateInput = document.getElementById('medDate');
    
    if (!nameInput || !timeInput || !dateInput) return;
    
    const name = nameInput.value.trim() || 'Парацетамол';
    const time = timeInput.value;
    const date = dateInput.value;
    
    if (!date) {
        alert('Выберите дату приёма');
        return;
    }
    
    const newMed = {
        id: Date.now(),
        name: name,
        time: time,
        date: date,
        taken: false,
        takenAt: null
    };
    
    medicines.push(newMed);
    saveData();
    renderMedicines();
    renderCalendar();
    
    nameInput.value = '';
    nameInput.focus();
    
    if (navigator.vibrate) navigator.vibrate(15);
}

function markTaken(id) {
    const med = medicines.find(m => m.id === id);
    if (!med || med.taken) return;
    
    med.taken = true;
    med.takenAt = new Date().toISOString();
    
    history.unshift({
        id: Date.now(),
        name: med.name,
        time: med.time,
        date: med.date,
        takenAt: new Date().toLocaleString('ru-RU')
    });
    
    if (history.length > 100) history.pop();
    
    saveData();
    renderMedicines();
    renderHistory();
    renderCalendar();
    playSuccessSound();
    
    if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
}

function deleteMedicine(id) {
    if (confirm('Удалить напоминание?')) {
        medicines = medicines.filter(m => m.id !== id);
        saveData();
        renderMedicines();
        renderCalendar();
        if (navigator.vibrate) navigator.vibrate(10);
    }
}

// ========== ИСТОРИЯ ==========
function clearHistory() {
    if (confirm('Удалить всю историю приёмов?')) {
        history = [];
        saveData();
        renderHistory();
    }
}

function exportToCSV() {
    if (history.length === 0) {
        alert('Нет записей для экспорта');
        return;
    }
    
    let csv = '\uFEFFЛекарство,Время,Дата приёма,Время отметки\n';
    history.forEach(e => {
        const name = e.name.replace(/"/g, '""');
        csv += `"${name}","${e.time}","${e.date}","${e.takenAt}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medtrek_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ CSV экспортирован');
}

// ========== ДЛИННАЯ МЕЛОДИЯ БУДИЛЬНИКА ==========
function playAlarmSound() {
    if (!soundEnabled) {
        const bar = document.getElementById('soundPermissionBar');
        if (bar) bar.style.display = 'flex';
        showNotification();
        return;
    }
    
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        function playTone(freq, duration, delay, volume = 0.4, type = 'sine') {
            setTimeout(() => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.type = type;
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(volume, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
                osc.start(audioContext.currentTime);
                osc.stop(audioContext.currentTime + duration);
            }, delay * 1000);
        }
        
        // Мелодия
        playTone(523.25, 0.4, 0.0, 0.35);
        playTone(587.33, 0.4, 0.45, 0.35);
        playTone(659.25, 0.4, 0.90, 0.35);
        playTone(783.99, 0.5, 1.4, 0.4);
        playTone(880.00, 0.5, 2.0, 0.4);
        playTone(987.77, 0.6, 2.6, 0.45);
        playTone(1046.50, 0.8, 3.3, 0.5);
        playTone(987.77, 0.4, 4.2, 0.4);
        playTone(880.00, 0.4, 4.7, 0.4);
        playTone(783.99, 0.4, 5.2, 0.4);
        playTone(659.25, 0.6, 5.7, 0.45);
        playTone(783.99, 0.4, 6.5, 0.4);
        playTone(880.00, 0.4, 7.0, 0.4);
        playTone(987.77, 0.8, 7.5, 0.5);
        playTone(880.00, 0.6, 8.4, 0.45);
        playTone(1046.50, 0.3, 9.2, 0.5);
        playTone(987.77, 0.3, 9.6, 0.45);
        playTone(880.00, 0.3, 10.0, 0.45);
        playTone(783.99, 0.3, 10.4, 0.45);
        playTone(659.25, 0.4, 10.8, 0.4);
        playTone(1046.50, 0.5, 11.5, 0.55);
        playTone(987.77, 0.4, 12.1, 0.45);
        playTone(1046.50, 0.6, 12.6, 0.55);
        playTone(1174.66, 0.8, 13.3, 0.6);
        playTone(1046.50, 0.4, 14.2, 0.5);
        playTone(987.77, 0.4, 14.7, 0.45);
        playTone(880.00, 0.6, 15.2, 0.45);
        playTone(783.99, 0.8, 15.9, 0.4);
        playTone(659.25, 0.3, 16.8, 0.4);
        playTone(783.99, 0.3, 17.2, 0.45);
        playTone(880.00, 0.3, 17.6, 0.45);
        playTone(1046.50, 0.4, 18.0, 0.5);
        playTone(1174.66, 0.6, 18.6, 0.55);
        playTone(1046.50, 0.5, 19.3, 0.5);
        playTone(987.77, 0.5, 19.9, 0.45);
        playTone(880.00, 1.0, 20.5, 0.45);
        playTone(783.99, 0.5, 21.7, 0.35);
        playTone(659.25, 0.5, 22.3, 0.3);
        playTone(587.33, 0.6, 22.9, 0.25);
        playTone(523.25, 1.0, 23.6, 0.2);
        playTone(493.88, 1.5, 24.7, 0.15);
        
    } catch(e) {
        console.log('Alarm sound error:', e);
    }
    
    showNotification();
    
    if (navigator.vibrate) {
        navigator.vibrate([400, 100, 400, 100, 400, 200, 400]);
    }
}

// ========== ПРОВЕРКА БУДИЛЬНИКА ==========
function startAlarmChecker() {
    if (alarmCheckInterval) clearInterval(alarmCheckInterval);
    
    alarmCheckInterval = setInterval(() => {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        const currentDate = now.toISOString().split('T')[0];
        
        const dueMeds = medicines.filter(med => 
            !med.taken && 
            med.time === currentTime && 
            med.date === currentDate
        );
        
        if (dueMeds.length > 0) {
            const medNames = dueMeds.map(m => m.name).join(', ');
            const alarmText = document.getElementById('alarmText');
            if (alarmText) alarmText.innerHTML = `🔔 Сейчас: ${medNames}`;
            playAlarmSound();
            
            setTimeout(() => {
                const alarmTextElem = document.getElementById('alarmText');
                if (alarmTextElem) alarmTextElem.innerHTML = '⏰ Будильник активен';
            }, 10000);
        }
    }, 60000);
    
    setTimeout(() => {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        const currentDate = now.toISOString().split('T')[0];
        const dueMeds = medicines.filter(med => !med.taken && med.time === currentTime && med.date === currentDate);
        if (dueMeds.length > 0) {
            const alarmText = document.getElementById('alarmText');
            if (alarmText) alarmText.innerHTML = `🔔 Сейчас: ${dueMeds.map(m=>m.name).join(', ')}`;
            playAlarmSound();
        }
    }, 1000);
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ========== КАЛЕНДАРЬ ==========
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const monthYear = document.getElementById('currentMonthYear');
    if (monthYear) monthYear.textContent = `${monthNames[month]} ${year}`;
    
    let html = '';
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(day => {
        html += `<div class="weekday">${day}</div>`;
    });
    
    let startOffset = startWeekday === 0 ? 6 : startWeekday - 1;
    
    for (let i = startOffset - 1; i >= 0; i--) {
        html += `<div class="day other-month">${prevMonthDays - i}</div>`;
    }
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasMed = medicines.some(m => m.date === dateStr);
        
        let classes = ['day'];
        if (dateStr === todayStr) classes.push('today');
        if (hasMed) classes.push('has-med');
        
        html += `<div class="${classes.join(' ')}" data-date="${dateStr}">${d}</div>`;
    }
    
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (startOffset + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="day other-month">${i}</div>`;
    }
    
    const grid = document.getElementById('calendarGrid');
    if (grid) grid.innerHTML = html;
    
    document.querySelectorAll('.day:not(.other-month)').forEach(day => {
        day.addEventListener('click', () => {
            const date = day.dataset.date;
            if (date) {
                selectedDate = new Date(date);
                showMedsForDate(date);
                if (navigator.vibrate) navigator.vibrate(8);
            }
        });
    });
    
    showMedsForDate(selectedDate.toISOString().split('T')[0]);
}

function showMedsForDate(dateStr) {
    const meds = medicines.filter(m => m.date === dateStr);
    const container = document.getElementById('selectedDateMedsList');
    if (!container) return;
    
    if (meds.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); font-size:14px; padding:8px;">Нет напоминаний на этот день</div>';
        return;
    }
    
    container.innerHTML = meds.map(m => `
        <div class="med-row">
            <span><strong>${escapeHtml(m.name)}</strong> · ${m.time}</span>
            <span class="status-badge ${m.taken ? 'taken' : 'pending'}">
                ${m.taken ? '✅ Принято' : '⏳ Ожидает'}
            </span>
        </div>
    `).join('');
}

// ========== ОТРИСОВКА СПИСКОВ ==========
function renderMedicines() {
    const container = document.getElementById('medList');
    if (!container) return;
    
    let filtered = [...medicines];
    if (searchQuery) {
        filtered = filtered.filter(m => 
            m.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    filtered.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    
    if (filtered.length === 0) {
        const message = medicines.length === 0 
            ? '➕ Добавьте лекарство выше' 
            : '🔍 Ничего не найдено';
        container.innerHTML = `<div class="empty-state">${message}</div>`;
        return;
    }
    
    const now = new Date();
    container.innerHTML = filtered.map(med => {
        const medDate = new Date(`${med.date}T${med.time}`);
        const isOverdue = !med.taken && medDate < now;
        
        return `
            <div class="med-item ${isOverdue ? 'overdue' : ''}">
                <div class="med-info">
                    <div class="med-name">${escapeHtml(med.name)}</div>
                    <div class="med-meta">
                        <span>⏰ ${med.time}</span>
                        <span>📅 ${med.date}</span>
                    </div>
                </div>
                <div class="med-actions">
                    <button class="btn ${med.taken ? 'btn-success' : 'btn-primary'} btn-sm" 
                            onclick="markTaken(${med.id})" 
                            ${med.taken ? 'disabled' : ''}>
                        ${med.taken ? '✅' : '💊'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMedicine(${med.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    
    const last30 = history.slice(0, 30);
    
    if (last30.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Пока ничего нет</div>';
        return;
    }
    
    container.innerHTML = last30.map(e => `
        <div class="history-entry">
            <span>
                <strong>${escapeHtml(e.name)}</strong> · ${e.time}<br>
                <small>📅 ${e.date}</small>
            </span>
            <span style="color:var(--primary); font-size:12px;">✅ ${e.takenAt}</span>
        </div>
    `).join('');
}

// ========== УТИЛИТЫ ==========
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
    if (navigator.vibrate) navigator.vibrate(10);
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
    if (navigator.vibrate) navigator.vibrate(10);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    initWelcomeScreen();
    initTheme();
    initSoundCheck();
    loadData();
    requestNotificationPermission();
    
    const elements = {
        'themeToggle': { event: 'click', handler: toggleTheme },
        'searchInput': { event: 'input', handler: (e) => { searchQuery = e.target.value; renderMedicines(); } },
        'addBtn': { event: 'click', handler: addMedicine },
        'exportBtn': { event: 'click', handler: exportToCSV },
        'clearHistoryBtn': { event: 'click', handler: clearHistory },
        'prevMonthBtn': { event: 'click', handler: prevMonth },
        'nextMonthBtn': { event: 'click', handler: nextMonth },
        'testAlarmBtn': { event: 'click', handler: playAlarmSound },
        'enableSoundBtn': { event: 'click', handler: enableSound }
    };
    
    Object.entries(elements).forEach(([id, { event, handler }]) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener(event, handler);
    });
    
    const medNameInput = document.getElementById('medName');
    if (medNameInput) {
        medNameInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') addMedicine();
        });
    }
});

window.markTaken = markTaken;
window.deleteMedicine = deleteMedicine;