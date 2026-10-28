document.addEventListener('DOMContentLoaded', function () {
  const tokenKey = 'bharatsafe_admin_token';
  const tabButton = document.querySelector('.admin-tab-btn[data-tab="tab-customer-tags"]');
  const tableBody = document.getElementById('customer-tags-body');
  const message = document.getElementById('customer-tags-message');
  const refreshButton = document.getElementById('refresh-customer-tags');
  const previousButton = document.getElementById('customer-tags-previous');
  const nextButton = document.getElementById('customer-tags-next');

  if (!tabButton || !tableBody || !message || !refreshButton || !previousButton || !nextButton) return;

  const pageSize = 25;
  const pageOffsets = [0];
  let hasMore = false;
  let loaded = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
  }

  async function loadTags() {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      message.textContent = 'Sign in to load customer tags.';
      return;
    }

    refreshButton.disabled = true;
    previousButton.disabled = true;
    nextButton.disabled = true;
    message.textContent = 'Loading paid customer tags…';

    try {
      const skip = pageOffsets[pageOffsets.length - 1];
      const response = await fetch(`/api/payments/tags?limit=${pageSize}&skip=${skip}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem(tokenKey);
        message.textContent = 'Your admin session expired. Reload the page and sign in again.';
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load paid customer tags.');

      if (!result.tags.length) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;opacity:.6;padding:24px;">No paid customer tags yet.</td></tr>';
      } else {
        tableBody.innerHTML = result.tags.map((tag) => {
          const encodedQr = escapeHtml(tag.qrCode);
          const scanUrl = escapeHtml(tag.scanUrl);
          const serialId = escapeHtml(tag.serialId);
          return `
            <tr>
              <td>
                <strong>${serialId}</strong><br>
                <img src="${encodedQr}" alt="QR code for ${serialId}" width="88" height="88" style="background:#fff;margin-top:8px;">
                <br><a class="btn-sm-action" href="${encodedQr}" download="BharatSafe-${serialId}.png">Download QR</a>
              </td>
              <td><strong>${escapeHtml(tag.name)}</strong><br>${escapeHtml(tag.phone)}<br><small>${escapeHtml(tag.address)}</small></td>
              <td>${escapeHtml(tag.tagType)}</td>
              <td>${escapeHtml(tag.bloodGroup)}</td>
              <td><a href="${scanUrl}" target="_blank" rel="noopener noreferrer">Open scan profile ↗</a></td>
              <td><button class="${tag.active ? 'btn-sm-danger' : 'btn-sm-action'}" type="button" data-serial="${serialId}" data-active="${tag.active}">${tag.active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>`;
        }).join('');
      }

      hasMore = result.hasMore;
      loaded = true;
      message.textContent = `Showing ${result.tags.length} paid tag${result.tags.length === 1 ? '' : 's'}.`;
      previousButton.disabled = pageOffsets.length <= 1;
      nextButton.disabled = !hasMore;
    } catch (error) {
      message.textContent = error.message || 'Could not load paid customer tags.';
      console.error('Customer tag list failed:', error);
    } finally {
      refreshButton.disabled = false;
    }
  }

  tabButton.addEventListener('click', function () {
    if (!loaded || message.textContent.startsWith('Your admin session expired')) loadTags();
  });
  refreshButton.addEventListener('click', loadTags);
  previousButton.addEventListener('click', function () {
    if (pageOffsets.length > 1) {
      pageOffsets.pop();
      loadTags();
    }
  });
  nextButton.addEventListener('click', function () {
    if (hasMore) {
      pageOffsets.push(pageOffsets[pageOffsets.length - 1] + pageSize);
      loadTags();
    }
  });
  tableBody.addEventListener('click', async function (event) {
    const button = event.target.closest('button[data-serial]');
    if (!button) return;

    const token = localStorage.getItem(tokenKey);
    if (!token) {
      message.textContent = 'Sign in to manage customer tags.';
      return;
    }

    const serialId = button.dataset.serial;
    const active = button.dataset.active !== 'true';
    button.disabled = true;

    try {
      const response = await fetch(`/api/payments/tags/${encodeURIComponent(serialId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ active })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update tag status.');
      loaded = false;
      await loadTags();
    } catch (error) {
      button.disabled = false;
      message.textContent = error.message || 'Could not update tag status.';
      console.error('Customer tag update failed:', error);
    }
  });
});
