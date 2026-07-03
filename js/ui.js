// ============ Overlay + HUD ============

const ZONES = [
  { at: 0.02, name: 'URBAN ROUTINE',   jp: '都会の雑踏' },
  { at: 0.30, name: 'BODY AWAKENING',  jp: '身体の目覚め' },
  { at: 0.55, name: 'INTO THE FOREST', jp: '森の中へ' },
  { at: 0.90, name: 'THE SHRINE',      jp: '静けさの社' },
];

export function createUI({ onStart, audio }) {
  const overlay = document.getElementById('overlay');
  const hud = document.getElementById('hud');
  const marker = document.getElementById('journey-marker');
  const toast = document.getElementById('zone-toast');
  const micBar = document.getElementById('mic-level');
  const soundBtn = document.getElementById('sound-btn');
  const soundPanel = document.getElementById('sound-panel');
  const slotList = document.getElementById('sound-slots');

  document.getElementById('start-btn').addEventListener('click', () => {
    overlay.classList.add('hidden');
    hud.classList.remove('hidden');
    onStart?.();
  });

  let zoneIdx = -1;
  let toastTimer = null;

  function showToast(html, ms = 3200) {
    toast.innerHTML = html;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
  }

  // ---------- SOUNDS panel (user-uploaded recordings) ----------
  function renderSlots() {
    if (!audio) {
      slotList.innerHTML = '<p class="sp-loading">loading sound engine…</p>';
      return;
    }
    slotList.innerHTML = '';
    for (const slot of audio.getSlots()) {
      const row = document.createElement('div');
      row.className = 'slot-row' + (slot.custom ? ' custom' : '');
      row.innerHTML = `
        <span class="dot"></span>
        <span class="name">${slot.label}</span>
        <label class="upload">UPLOAD<input type="file" accept="audio/*"></label>`;
      row.querySelector('input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        row.querySelector('.name').textContent = slot.label.split('·')[0] + '· loading…';
        audio.replaceSample(slot.id, file, (ok) => {
          renderSlots();
          showToast(ok ? 'RECORDING LOADED' : 'FILE NOT SUPPORTED', 1800);
        });
      });
      slotList.appendChild(row);
    }
  }
  soundBtn.addEventListener('click', () => {
    soundPanel.classList.toggle('hidden');
    if (!soundPanel.classList.contains('hidden')) renderSlots();
  });

  return {
    flash(text) {
      showToast(`<span style="font-size:0.6em;letter-spacing:0.4em">${text}</span>`, 1400);
    },
    update(progress, micLevel = 0) {
      marker.style.left = `${progress * 100}%`;
      // zone toasts
      let idx = -1;
      for (let i = 0; i < ZONES.length; i++) if (progress >= ZONES[i].at) idx = i;
      if (idx !== zoneIdx && idx >= 0) {
        zoneIdx = idx;
        const z = ZONES[idx];
        showToast(`${z.name}<br><span style="font-family:'Yu Mincho',serif;font-size:0.55em;letter-spacing:0.4em;opacity:0.7">${z.jp}</span>`);
      }
      micBar.style.width = `${Math.min(1, micLevel * 6) * 100}%`;
    },
  };
}
