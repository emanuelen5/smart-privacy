import type { StorageData } from '../types.js';
import { isValidDomain } from '../utils.js';

async function getStorage(): Promise<StorageData> {
  const result = await browser.storage.local.get({
    approvedDomains: [] as string[],
    deniedDomains: [] as string[],
    visitCounts: {} as Record<string, number>,
    promptedDomains: [] as string[],
    visitThreshold: 3,
  });
  return result as StorageData;
}

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

function createDomainItem(domain: string, onRemove: (domain: string) => void): HTMLLIElement {
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

async function render(): Promise<void> {
  const data = await getStorage();

  const approvedList = getEl<HTMLUListElement>('approved-list');
  const deniedList = getEl<HTMLUListElement>('denied-list');
  const approvedEmpty = getEl<HTMLParagraphElement>('approved-empty');
  const deniedEmpty = getEl<HTMLParagraphElement>('denied-empty');
  const approvedCount = getEl<HTMLSpanElement>('approved-count');
  const deniedCount = getEl<HTMLSpanElement>('denied-count');

  approvedList.innerHTML = '';
  deniedList.innerHTML = '';

  approvedCount.textContent = String(data.approvedDomains.length);
  deniedCount.textContent = String(data.deniedDomains.length);

  approvedEmpty.hidden = data.approvedDomains.length > 0;
  deniedEmpty.hidden = data.deniedDomains.length > 0;

  for (const domain of data.approvedDomains) {
    approvedList.append(createDomainItem(domain, removeDomain));
  }
  for (const domain of data.deniedDomains) {
    deniedList.append(createDomainItem(domain, removeDomain));
  }

  getEl<HTMLInputElement>('visit-threshold').value = String(data.visitThreshold);
}

async function removeDomain(domain: string): Promise<void> {
  await browser.runtime.sendMessage({ type: 'remove', domain });
  await render();
}

async function addDomain(action: 'approve' | 'deny'): Promise<void> {
  const input = getEl<HTMLInputElement>('add-input');
  const errorEl = getEl<HTMLElement>('add-error');
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

getEl<HTMLButtonElement>('btn-add-approve').addEventListener('click', () => addDomain('approve'));
getEl<HTMLButtonElement>('btn-add-deny').addEventListener('click', () => addDomain('deny'));

getEl<HTMLButtonElement>('btn-save-settings').addEventListener('click', async () => {
  const threshold = parseInt(getEl<HTMLInputElement>('visit-threshold').value, 10);
  if (threshold >= 1 && threshold <= 20) {
    await browser.storage.local.set({ visitThreshold: threshold });
    const savedMsg = getEl<HTMLElement>('settings-saved');
    savedMsg.hidden = false;
    setTimeout(() => { savedMsg.hidden = true; }, 2000);
  }
});

render();
