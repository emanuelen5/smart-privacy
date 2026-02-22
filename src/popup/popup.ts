import type { DomainStatus } from '../types.js';
import { getDomain } from '../utils.js';

async function getCurrentTab(): Promise<browser.tabs.Tab | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

async function init(): Promise<void> {
  const tab = await getCurrentTab();
  const domain = getDomain(tab?.url);

  const domainEl = getEl<HTMLElement>('domain-name');
  const badgeEl = getEl<HTMLElement>('status-badge');
  const btnApprove = getEl<HTMLButtonElement>('btn-approve');
  const btnDeny = getEl<HTMLButtonElement>('btn-deny');
  const btnRemove = getEl<HTMLButtonElement>('btn-remove');

  if (!domain) {
    domainEl.textContent = 'Not a web page';
    getEl<HTMLElement>('actions').hidden = true;
    return;
  }

  domainEl.textContent = domain;

  const status = await browser.runtime.sendMessage({ type: 'getStatus', domain }) as DomainStatus;

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

  getEl<HTMLButtonElement>('open-options').addEventListener('click', () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
}

init();
