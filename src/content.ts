import type { ShowPromptMessage, PromptReason } from './types.js';

/**
 * Content script – handles:
 *  - Password field detection (fires once per page load)
 *  - Notification bar UI (approve / deny the current domain)
 */

let passwordDetected = false;
let notificationShown = false;

// ---------------------------------------------------------------------------
// Password detection
// ---------------------------------------------------------------------------

function onPasswordInput(): void {
  if (passwordDetected) return;
  passwordDetected = true;
  browser.runtime.sendMessage({ type: 'passwordDetected' });
}

// Attach to any password field already in the DOM
document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(el => {
  el.addEventListener('focus', onPasswordInput, { once: true });
});

// Watch for dynamically added password fields
const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of Array.from(mutation.addedNodes)) {
      if (!(node instanceof Element)) continue;
      const fields: HTMLInputElement[] = node.matches('input[type="password"]')
        ? [node as HTMLInputElement]
        : Array.from(node.querySelectorAll<HTMLInputElement>('input[type="password"]'));
      fields.forEach(el => el.addEventListener('focus', onPasswordInput, { once: true }));
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// ---------------------------------------------------------------------------
// Notification bar
// ---------------------------------------------------------------------------

function showNotificationBar(domain: string, reason: PromptReason): void {
  if (notificationShown || document.getElementById('smart-privacy-bar')) return;
  notificationShown = true;

  const bar = document.createElement('div');
  bar.id = 'smart-privacy-bar';

  const msgSpan = document.createElement('span');
  msgSpan.className = 'smart-privacy-msg';
  const titleStrong = document.createElement('strong');
  titleStrong.textContent = 'Smart Privacy';
  const domainStrong = document.createElement('strong');
  domainStrong.textContent = domain;
  const reasonFragment = document.createDocumentFragment();
  if (reason === 'password') {
    reasonFragment.append('You entered a password on ', domainStrong, '.');
  } else {
    reasonFragment.append('You have visited ', domainStrong, ' multiple times.');
  }
  msgSpan.append('🔒 ', titleStrong, ': ', reasonFragment, ' Do you want to save cookies for this site?');

  const actionsSpan = document.createElement('span');
  actionsSpan.className = 'smart-privacy-actions';
  const approveBtn = document.createElement('button');
  approveBtn.id = 'smart-privacy-approve';
  approveBtn.textContent = 'Approve';
  const denyBtn = document.createElement('button');
  denyBtn.id = 'smart-privacy-deny';
  denyBtn.textContent = 'Deny';
  const dismissBtn = document.createElement('button');
  dismissBtn.id = 'smart-privacy-dismiss';
  dismissBtn.title = 'Dismiss';
  dismissBtn.textContent = '✕';
  actionsSpan.append(approveBtn, denyBtn, dismissBtn);

  bar.append(msgSpan, actionsSpan);
  document.body.prepend(bar);

  approveBtn.addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'approve' });
    bar.remove();
  });

  denyBtn.addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'deny' });
    bar.remove();
  });

  dismissBtn.addEventListener('click', () => {
    bar.remove();
  });
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

browser.runtime.onMessage.addListener(message => {
  const msg = message as ShowPromptMessage;
  if (msg.type === 'showPrompt') {
    showNotificationBar(msg.domain, msg.reason);
  }
});
