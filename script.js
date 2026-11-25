const lampBtn = document.getElementById('lampBtn');
const bulbBody = document.getElementById('bulbBody');
const cordGroup = document.getElementById('cordGroup');
const lampHint = document.getElementById('lampHint');
const btnLogin = document.getElementById('btnLogin');
const btnGuest = document.getElementById('btnGuest');
const btnLogout = document.getElementById('btnLogout');
const btnAdd = document.getElementById('btnAdd');
const userGreeting = document.getElementById('userGreeting');
const taskList = document.getElementById('taskList');
const loginError = document.getElementById('loginError');

let tasks = [];
try {
  tasks = JSON.parse(localStorage.getItem('myScheduleTasks')) || [];
} catch (e) {
  tasks = [];
}

function toggleLamp(animateCord = true) {
  if (animateCord) {
    lampBtn.classList.add('pulled');
    setTimeout(() => {
      lampBtn.classList.remove('pulled');
    }, 220);
  }

  lampBtn.classList.remove('swinging');
  void lampBtn.offsetWidth;
  lampBtn.classList.add('swinging');

  const isOn = document.body.classList.toggle('light-on');
  lampHint.textContent = isOn
    ? 'اسحب الحبل أو اضغط على اللمبة للإطفاء 💡'
    : 'اسحب الحبل للأسفل أو اضغط على اللمبة 💡';
  playSwitchSound(isOn);
}

bulbBody.addEventListener('click', () => {
  toggleLamp(true);
});

let isDraggingCord = false;
let startY = 0;
let cordTriggered = false;

cordGroup.addEventListener('pointerdown', (e) => {
  isDraggingCord = true;
  startY = e.clientY;
  cordTriggered = false;
  cordGroup.classList.add('dragging');
  cordGroup.setPointerCapture(e.pointerId);
});

cordGroup.addEventListener('pointermove', (e) => {
  if (!isDraggingCord) return;
  const deltaY = Math.max(0, Math.min(45, e.clientY - startY));
  cordGroup.style.transform = `translateY(${deltaY}px)`;

  if (deltaY >= 24 && !cordTriggered) {
    cordTriggered = true;
    toggleLamp(false);
  }
});

function releaseCord(e) {
  if (!isDraggingCord) return;
  isDraggingCord = false;
  cordGroup.classList.remove('dragging');
  cordGroup.style.transform = '';

  if (!cordTriggered && Math.abs(e.clientY - startY) < 8) {
    toggleLamp(true);
  }
}

cordGroup.addEventListener('pointerup', releaseCord);
cordGroup.addEventListener('pointercancel', releaseCord);

btnLogin.addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    loginError.style.display = 'block';
    return;
  }

  loginError.style.display = 'none';
  const userName = email.split('@')[0];
  userGreeting.textContent = `أهلاً بك يا ${userName} 👋`;
  document.body.classList.add('logged-in');
  renderTasks();

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

btnGuest.addEventListener('click', () => {
  loginError.style.display = 'none';
  userGreeting.textContent = 'أهلاً بك كزائر (Guest) 👋';
  document.body.classList.add('logged-in');
  renderTasks();

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    document.body.classList.remove('logged-in', 'light-on');
    lampHint.textContent = 'اسحب الحبل للأسفل أو اضغط على اللمبة 💡';
    playSwitchSound(false);
  });
}

btnAdd.addEventListener('click', () => {
  const titleInput = document.getElementById('taskTitle');
  const dateInput = document.getElementById('taskDate');
  const timeInput = document.getElementById('taskTime');
  
  const title = titleInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;

  if (!title || !date || !time) {
    alert('يرجى كتابة اسم الموعد وتحديد التاريخ والوقت');
    return;
  }

  tasks.push({
    id: Date.now(),
    title: title,
    date: date,
    time: time,
    done: false
  });

  tasks.sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  saveAndRender();

  titleInput.value = '';
  dateInput.value = '';
  timeInput.value = '';
});

taskList.addEventListener('click', (e) => {
  const id = Number(e.target.getAttribute('data-id'));
  if (!id) return;

  if (e.target.classList.contains('btn-done')) {
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveAndRender();
  }

  if (e.target.classList.contains('btn-delete')) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
  }
});

function saveAndRender() {
  try {
    localStorage.setItem('myScheduleTasks', JSON.stringify(tasks));
  } catch (e) {}
  renderTasks();
}

function renderTasks() {
  if (tasks.length === 0) {
    taskList.innerHTML = '<div class="empty-state">لا توجد مواعيد حالياً. ابدأ بإضافة أول موعد لك بالأعلى! ⏰</div>';
    return;
  }

  taskList.innerHTML = tasks.map(task => `
    <div class="task-item ${task.done ? 'done' : ''}">
      <div class="task-info">
        <span class="task-title">${task.title}</span>
        <span class="task-time">📅 التاريخ: ${task.date || 'اليوم'} | 🕒 الساعة: ${task.time}</span>
      </div>
      <div class="task-actions">
        <button type="button" class="btn-action btn-done" data-id="${task.id}">
          ${task.done ? 'تراجع' : '✓ تم'}
        </button>
        <button type="button" class="btn-action btn-delete" data-id="${task.id}">حذف</button>
      </div>
    </div>
  `).join('');
}

function playSwitchSound(isTurningOn) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isTurningOn ? 850 : 520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.045);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

const alarmToast = document.getElementById('alarmToast');
const alarmIcon = document.getElementById('alarmIcon');
const alarmTitle = document.getElementById('alarmTitle');
const alarmText = document.getElementById('alarmText');
const closeAlarmBtn = document.getElementById('closeAlarmBtn');

closeAlarmBtn.addEventListener('click', () => {
  alarmToast.classList.remove('show');
});

setInterval(checkAlarms, 10000);

function checkAlarms() {
  if (tasks.length === 0) return;

  const now = new Date();
  let updated = false;

  tasks.forEach(task => {
    if (task.done || !task.date || !task.time) return;

    const taskDateTime = new Date(`${task.date}T${task.time}:00`);
    const diffMinutes = Math.round((taskDateTime - now) / 60000);

    if (diffMinutes === 15 && !task.preNotified) {
      task.preNotified = true;
      updated = true;
      triggerAlert('🔔', 'تذكير: متبقي ربع ساعة!', `موعد "${task.title}" هيبدأ الساعة ${task.time}`, false);
    }

    if (diffMinutes === 0 && !task.alarmRang) {
      task.alarmRang = true;
      updated = true;
      triggerAlert('⏰', 'حان الآن وقت الموعد!', `ابدأ الآن: "${task.title}" (${task.time})`, true);
    }
  });

  if (updated) {
    try {
      localStorage.setItem('myScheduleTasks', JSON.stringify(tasks));
    } catch (e) {}
  }
}

function triggerAlert(icon, title, message, isUrgent) {
  alarmIcon.textContent = icon;
  alarmTitle.textContent = title;
  alarmText.textContent = message;

  if (isUrgent) {
    alarmToast.classList.add('urgent');
    playAlarmRing();
  } else {
    alarmToast.classList.remove('urgent');
    playSoftNotification();
  }

  alarmToast.classList.add('show');

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  }
}

function playSoftNotification() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch (e) {}
}

function playAlarmRing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    [0, 0.25, 0.5, 0.75].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch (e) {}
}
