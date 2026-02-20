const modeButtons = document.querySelectorAll('[data-mode]');
const autoPanel = document.getElementById('autoPanel');
const manualPanel = document.getElementById('manualPanel');
const countdown = document.getElementById('countdown');

function activateMode(mode) {
  const auto = mode === 'auto';
  autoPanel.classList.toggle('is-active', auto);
  manualPanel.classList.toggle('is-active', !auto);
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  });
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => activateMode(button.dataset.mode));
});

document.getElementById('copyAddress').addEventListener('click', async () => {
  await navigator.clipboard.writeText(document.getElementById('addressField').value);
});

document.getElementById('copyAmount').addEventListener('click', async () => {
  await navigator.clipboard.writeText(document.getElementById('amountText').textContent);
});

document.getElementById('pasteTxid').addEventListener('click', async () => {
  const value = await navigator.clipboard.readText();
  document.getElementById('txidField').value = value;
});

let total = 33 * 60 + 15;
setInterval(() => {
  if (total <= 0) return;
  total -= 1;
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  countdown.textContent = `${mm}:${ss}`;
}, 1000);
