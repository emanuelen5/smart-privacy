'use strict';

async function getCurrentTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function getDomain(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.hostname;
    }
  } catch {
    // ignore
  }
  return null;
}

async function init() {
  const tab = await getCurrentTab();
  const domain = getDomain(tab && tab.url);

  const domainEl = document.getElementById('domain-name');
  const badgeEl = document.getElementById('status-badge');
  const btnApprove = document.getElementById('btn-approve');
  const btnDeny = document.getElementById('btn-deny');
  const btnRemove = document.getElementById('btn-remove');

  if (!domain) {
    domainEl.textContent = 'Not a web page';
    document.getElementById('actions').hidden = true;
    return;
  }

  domainEl.textContent = domain;

  const status = await browser.runtime.sendMessage({ type: 'getStatus', domain });

  if (status.approved) {
    badgeEl.textContent = 'Approved';
    badgeEl.className = 'status-badge approved';
    btnApprove.hidden = true;
    btnRemove.hidden = false;
  } else if (status.denied) {
    badgeEl.textContent = 'Denied';
    badgeEl.className = 'status-badge denied';
    btnDeny.hidden = true;
    btnRemove.hidden = false;
  } else {
    badgeEl.textContent = 'Unknown';
    badgeEl.className = 'status-badge unknown';
  }

  btnApprove.addEventListener('click', async () => {
    await browser.runtime.sendMessage({ type: 'approve', domain });
    window.close();
  });

  btnDeny.addEventListener('click', async () => {
    await browser.runtime.sendMessage({ type: 'deny', domain });
    window.close();
  });

  btnRemove.addEventListener('click', async () => {
    await browser.runtime.sendMessage({ type: 'remove', domain });
    window.close();
  });

  document.getElementById('open-options').addEventListener('click', () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
}

init();
