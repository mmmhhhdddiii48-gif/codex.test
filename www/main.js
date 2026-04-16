const SECTION_KEY = 'tarteeb.sections.v1';
const NOTES_KEY = 'tarteeb.notes.v1';

const defaultSections = [
  'لوحة الأصناف',
  'لوحة الزبائن',
  'لوحة الممولين',
  'لوحة الوارد',
  'المبيعات',
  'المرتجعات',
  'التالف',
  'الصندوق'
];

const sectionList = document.getElementById('section-list');
const notesField = document.getElementById('notes');
const saveStatus = document.getElementById('save-status');
const soundToggle = document.getElementById('sound-toggle');

function renderSections() {
  const savedSections = JSON.parse(localStorage.getItem(SECTION_KEY) || 'null');
  const sections = Array.isArray(savedSections) && savedSections.length ? savedSections : defaultSections;

  sectionList.innerHTML = '';
  sections.forEach((section) => {
    const li = document.createElement('li');
    li.textContent = section;
    sectionList.appendChild(li);
  });
}

function restoreNotes() {
  const saved = localStorage.getItem(NOTES_KEY);
  if (saved) {
    notesField.value = saved;
    saveStatus.textContent = 'تم استرجاع آخر ملاحظات محفوظة.';
  }
}

function playNotificationTone() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gainNode.gain.value = 0.12;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.22);

  oscillator.onended = () => {
    audioCtx.close();
  };
}

document.getElementById('save-notes').addEventListener('click', () => {
  localStorage.setItem(NOTES_KEY, notesField.value);
  saveStatus.textContent = `تم الحفظ محليًا عند ${new Date().toLocaleTimeString('ar-IQ')}`;
});

document.getElementById('clear-notes').addEventListener('click', () => {
  notesField.value = '';
  localStorage.removeItem(NOTES_KEY);
  saveStatus.textContent = 'تم مسح الملاحظات المحلية.';
});

soundToggle.addEventListener('click', () => {
  try {
    playNotificationTone();
    saveStatus.textContent = 'تم تشغيل الصوت بنجاح.';
  } catch (err) {
    saveStatus.textContent = 'تعذر تشغيل الصوت الآن. جرّب بعد تفاعل إضافي.';
  }
});

renderSections();
restoreNotes();
