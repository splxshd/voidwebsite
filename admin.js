const ownerToken = localStorage.getItem('ownerToken');
if (localStorage.getItem('ownerAuth') !== '1' || !ownerToken) {
  window.location.href = 'login.html';
}

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${ownerToken}`,
};

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('ownerAuth');
  localStorage.removeItem('ownerToken');
  window.location.href = 'login.html';
});

const tabs = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.tab-panel');

function openTab(tab) {
  tabs.forEach((item) => item.classList.remove('is-active'));
  panels.forEach((panel) => panel.classList.remove('is-active'));
  tab.classList.add('is-active');
  const nextPanel = document.getElementById(tab.dataset.tab);
  if (nextPanel) nextPanel.classList.add('is-active');
}

tabs.forEach((tab) => tab.addEventListener('click', () => openTab(tab)));

document.getElementById('productsTableBody')?.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  if (!row) return;

  if (button.classList.contains('btn-delete')) {
    row.remove();
    return;
  }

  if (button.classList.contains('btn-edit')) {
    const nameCell = row.querySelector('[data-field="name"]');
    const priceCell = row.querySelector('[data-field="price"]');
    const statusCell = row.querySelector('[data-field="status"]');

    const nextName = window.prompt('Edit product name:', nameCell?.textContent?.trim() || '');
    if (!nextName) return;

    const nextPrice = window.prompt('Edit product price:', priceCell?.textContent?.trim() || '');
    const nextStatus = window.prompt('Edit status (Active/Draft/Hidden):', statusCell?.textContent?.trim() || '');

    nameCell.textContent = nextName;
    if (nextPrice) priceCell.textContent = nextPrice;
    if (nextStatus) statusCell.textContent = nextStatus;
  }
});

document.getElementById('invoiceTableBody')?.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  if (!row) return;

  const invoiceId = row.children[0]?.textContent?.trim();

  if (button.classList.contains('btn-view')) {
    const detection = row.children[3]?.textContent?.trim();
    const amount = row.children[2]?.textContent?.trim();
    window.alert(`Invoice ${invoiceId}\nAmount: ${amount} LTC\nDetection: ${detection}`);
  }

  if (button.classList.contains('btn-confirm')) {
    const txid = window.prompt('Optional TXID for manual confirmation:', '') || undefined;

    const response = await fetch(`/api/invoices/${invoiceId}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ txid }),
    });

    if (!response.ok) {
      window.alert('Failed to confirm invoice.');
      return;
    }

    const statusCell = row.querySelector('.status-badge');
    if (!statusCell) return;
    statusCell.textContent = 'Confirmed';
    statusCell.className = 'status-badge paid';
    button.remove();
  }
});

document.getElementById('retryFailedEmails')?.addEventListener('click', async () => {
  const response = await fetch('/api/delivery/queue', { headers: authHeaders });
  if (!response.ok) {
    window.alert('Unable to load delivery queue from API.');
    return;
  }

  const data = await response.json();
  window.alert(`Queue loaded: ${data.items.length} items`);
});
