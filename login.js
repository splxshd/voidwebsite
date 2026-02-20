const form = document.getElementById('loginForm');
const errorEl = document.getElementById('loginError');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.textContent = '';

  const email = document.getElementById('ownerEmail')?.value?.trim().toLowerCase();
  const password = document.getElementById('ownerPassword')?.value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid owner credentials.');
    }

    const data = await response.json();
    localStorage.setItem('ownerAuth', '1');
    localStorage.setItem('ownerToken', data.token);
    window.location.href = 'admin.html';
  } catch (error) {
    errorEl.textContent = error.message || 'Login failed.';
  }
});
