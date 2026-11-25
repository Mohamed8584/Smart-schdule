const lampBtn = document.getElementById('lampBtn');
const lampHint = document.getElementById('lampHint');
const btnLogin = document.getElementById('btnLogin');
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

// تشغيل وإطفاء اللمبة
lampBtn.addEventListener('click', () => {
  lampBtn.classList.add('pulled');
  setTimeout(() => {
    lampBtn.classList.remove('pulled');
  }, 200);

  const isOn = document.body.classList.toggle('light-on');
  lampHint.textContent = isOn ? 'اضغط لإطفاء الإضاءة 💡' : 'اضغط على اللمبة أو الحبل للإضاءة 💡';
  playSwitchSound(isOn);
});


// تسجيل الدخول
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
});

// إضافة موعد جديد بالتاريخ والوقت
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

// أزرار الإنهاء والحذف
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
// ==========================================
// نظام التنبيه قبل بربع ساعة + المنبه في الموعد
// ==========================================
const alarmToast = document.getElementById('alarmToast');
const alarmIcon = document.getElementById('alarmIcon');
const alarmTitle = document.getElementById('alarmTitle');
const alarmText = document.getElementById('alarmText');
const closeAlarmBtn = document.getElementById('closeAlarmBtn');

// طلب إذن الإشعارات من المتصفح عند تسجيل الدخول
btnLogin.addEventListener('click', () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

// زرار إغلاق التنبيه
closeAlarmBtn.addEventListener('click', () => {
  alarmToast.classList.remove('show');
});

// فحص المواعيد كل 10 ثوانٍ
setInterval(checkAlarms, 10000);

function checkAlarms() {
  if (tasks.length === 0) return;

  const now = new Date();
  let updated = false;

  tasks.forEach(task => {
    if (task.done || !task.date || !task.time) return;

    // حساب وقت الموعد بالدقيقة
    const taskDateTime = new Date(`${task.date}T${task.time}:00`);
    const diffMinutes = Math.floor((taskDateTime - now) / 60000);

    // 1. تنبيه قبل الموعد بربع ساعة (15 دقيقة)
    if (diffMinutes === 15 && !task.preNotified) {
      task.preNotified = true;
      updated = true;
      triggerAlert(
        '🔔',
        'تذكير: متبقي ربع ساعة!',
        `موعد "${task.title}" هيبدأ الساعة ${task.time}`,
        false
      );
    }

    // 2. رنين المنبه في نفس معاد الموعد بالظبط
    if (diffMinutes === 0 && !task.alarmRang) {
      task.alarmRang = true;
      updated = true;
      triggerAlert(
        '⏰',
        'حان الآن وقت الموعد!',
        `ابدأ الآن: "${task.title}" (${task.time})`,
        true
      );
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
    playAlarmRing(); // رنة منبه كاملة
  } else {
    alarmToast.classList.remove('urgent');
    playSoftNotification(); // نغمة تنبيه هادئة
  }

  alarmToast.classList.add('show');

  // إرسال إشعار خارجي من المتصفح
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  }
}

// صوت تنبيه هادئ (قبل ربع ساعة)
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

// صوت رنين المنبه (في وقت الموعد)
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