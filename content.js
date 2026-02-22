'use strict';

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

function onPasswordInput() {
  if (passwordDetected) return;
  passwordDetected = true;
  browser.runtime.sendMessage({ type: 'passwordDetected' });
}

// Attach to any password field already in the DOM
document.querySelectorAll('input[type="password"]').forEach(el => {
  el.addEventListener('focus', onPasswordInput, { once: true });
});

// Watch for dynamically added password fields
const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const fields = node.matches('input[type="password"]')
        ? [node]
        : Array.from(node.querySelectorAll('input[type="password"]'));
      fields.forEach(el => el.addEventListener('focus', onPasswordInput, { once: true }));
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// ---------------------------------------------------------------------------
// Notification bar
// ---------------------------------------------------------------------------

function showNotificationBar(domain, reason) {
  if (notificationShown || document.getElementById('smart-privacy-bar')) return;
  notificationShown = true;

  const bar = document.createElement('div');
  bar.id = 'smart-privacy-bar';

  const reasonText =
    reason === 'password'
      ? `You entered a password on <strong>${domain}</strong>.`
      : `You have visited <strong>${domain}</strong> multiple times.`;

  bar.innerHTML = `
    <span class="smart-privacy-msg">
      🔒 <strong>Smart Privacy</strong>: ${reasonText}
      Do you want to save cookies for this site?
    </span>
    <span class="smart-privacy-actions">
      <button id="smart-privacy-approve">Approve</button>
      <button id="smart-privacy-deny">Deny</button>
      <button id="smart-privacy-dismiss" title="Dismiss">✕</button>
    </span>
  `;

  document.body.prepend(bar);

  document.getElementById('smart-privacy-approve').addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'approve' });
    bar.remove();
  });

  document.getElementById('smart-privacy-deny').addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'deny' });
    bar.remove();
  });

  document.getElementById('smart-privacy-dismiss').addEventListener('click', () => {
    bar.remove();
  });
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

browser.runtime.onMessage.addListener(message => {
  if (message.type === 'showPrompt') {
    showNotificationBar(message.domain, message.reason);
  }
});
