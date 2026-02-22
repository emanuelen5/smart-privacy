'use strict';

async function getStorage() {
  return browser.storage.local.get({
    approvedDomains: [],
    deniedDomains: [],
    visitCounts: {},
    promptedDomains: [],
    visitThreshold: 3
  });
}

function isValidDomain(value) {
  const v = value.trim();
  // Accept hostnames, IP addresses, and localhost
  return (
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(v) ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(v) ||
    v === 'localhost'
  );
}

function createDomainItem(domain, onRemove) {
  const li = document.createElement('li');
  li.className = 'domain-item';

  const span = document.createElement('span');
  span.textContent = domain;

  const btn = document.createElement('button');
  btn.className = 'btn-remove-domain';
  btn.title = 'Remove';
  btn.textContent = '✕';
  btn.addEventListener('click', () => onRemove(domain));

  li.append(span, btn);
  return li;
}

async function render() {
  const data = await getStorage();

  const approvedList = document.getElementById('approved-list');
  const deniedList = document.getElementById('denied-list');
  const approvedEmpty = document.getElementById('approved-empty');
  const deniedEmpty = document.getElementById('denied-empty');
  const approvedCount = document.getElementById('approved-count');
  const deniedCount = document.getElementById('denied-count');

  approvedList.innerHTML = '';
  deniedList.innerHTML = '';

  approvedCount.textContent = data.approvedDomains.length;
  deniedCount.textContent = data.deniedDomains.length;

  approvedEmpty.hidden = data.approvedDomains.length > 0;
  deniedEmpty.hidden = data.deniedDomains.length > 0;

  for (const domain of data.approvedDomains) {
    approvedList.append(createDomainItem(domain, removeDomain));
  }
  for (const domain of data.deniedDomains) {
    deniedList.append(createDomainItem(domain, removeDomain));
  }

  document.getElementById('visit-threshold').value = data.visitThreshold;
}

async function removeDomain(domain) {
  await browser.runtime.sendMessage({ type: 'remove', domain });
  await render();
}

async function addDomain(action) {
  const input = document.getElementById('add-input');
  const errorEl = document.getElementById('add-error');
  const domain = input.value.trim().toLowerCase();

  if (!isValidDomain(domain)) {
    errorEl.textContent = 'Please enter a valid domain (e.g. example.com).';
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  await browser.runtime.sendMessage({ type: action, domain });
  input.value = '';
  await render();
}

document.getElementById('btn-add-approve').addEventListener('click', () => addDomain('approve'));
document.getElementById('btn-add-deny').addEventListener('click', () => addDomain('deny'));

document.getElementById('btn-save-settings').addEventListener('click', async () => {
  const threshold = parseInt(document.getElementById('visit-threshold').value, 10);
  if (threshold >= 1 && threshold <= 20) {
    await browser.storage.local.set({ visitThreshold: threshold });
    const savedMsg = document.getElementById('settings-saved');
    savedMsg.hidden = false;
    setTimeout(() => { savedMsg.hidden = true; }, 2000);
  }
});

render();
