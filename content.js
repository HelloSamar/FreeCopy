/**
 * FreeCopy — content.js v1.0.1
 * Features: Unblock selection, Clean Copy, Plain Text Mode,
 *           Per-site control, Right-click "Copy Clean"
 */

const BLOCK_EVENTS = ['contextmenu', 'selectstart', 'dragstart'];

let enabled          = false;
let cleanEnabled     = false;
let plainTextEnabled = false;
let observer         = null;
let debounceTimer    = null;
let copyCutGuardOn   = false;

const stopBlock = e => {
  e.stopPropagation();
  e.stopImmediatePropagation();
};

function clearJsBlocking() {
  document.oncopy        = null;
  document.oncut         = null;
  document.oncontextmenu = null;
  document.onselectstart = null;
  document.ondragstart   = null;
  if (document.body) {
    document.body.oncontextmenu = null;
    document.body.onselectstart = null;
    document.body.oncopy        = null;
    document.body.oncut         = null;
  }
}

function enableCopy() {
  if (enabled) return;
  enabled = true;
  document.documentElement.classList.add('freecopy-active');
  clearJsBlocking();
  BLOCK_EVENTS.forEach(evt => document.addEventListener(evt, stopBlock, true));
  updateCopyCutGuard();
  startObserver();
}

function disableCopy() {
  if (!enabled) return;
  enabled = false;
  document.documentElement.classList.remove('freecopy-active');
  BLOCK_EVENTS.forEach(evt => document.removeEventListener(evt, stopBlock, true));
  updateCopyCutGuard();
  stopObserver();
}

function cleanText(raw) {
  let text = raw
    .replace(/[\u00AD\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2060\u2061\uFEFF]/g, '')
    .replace(/\n\s*Read (more at|the full article|this on)[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map(l => l.trim()).join('\n')
    .trim();
  if (plainTextEnabled) {
    text = text
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
      .trim();
  }
  return text;
}

// Single listener for both 'copy' and 'cut'. This has to be ONE function
// rather than two separate listeners (one for anti-blocking, one for
// clean-copy) because content.js runs at document_start, before any page
// script — so our listener(s) on `document` are always registered first.
// That means calling stopImmediatePropagation() here reliably defeats a
// page's own `document.addEventListener('copy', e => e.preventDefault())`
// blocker (which the old clearJsBlocking()-only approach could never touch,
// since it only reset the on* properties). But if that stop call lived in a
// *separate* listener from the clean-copy rewrite logic, whichever one
// happened to be registered second would never run — so both jobs are done
// here, in the correct order, inside a single handler.
const copyCutGuard = e => {
  e.stopImmediatePropagation();

  if (e.type !== 'copy') return;
  if (!cleanEnabled && !plainTextEnabled) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  const raw     = selection.toString();
  const cleaned = cleanText(raw);
  if (!plainTextEnabled && cleaned === raw) return;
  e.preventDefault();
  try {
    if (e.clipboardData) {
      e.clipboardData.setData('text/plain', cleaned);
    } else {
      writeTextToClipboard(cleaned).catch(() => {});
    }
  } catch (err) {
    console.warn('[FreeCopy] Clean copy error:', err);
  }
};

function updateCopyCutGuard() {
  const needed = enabled || cleanEnabled || plainTextEnabled;
  if (needed && !copyCutGuardOn) {
    document.addEventListener('copy', copyCutGuard, true);
    document.addEventListener('cut',  copyCutGuard, true);
    copyCutGuardOn = true;
  } else if (!needed && copyCutGuardOn) {
    document.removeEventListener('copy', copyCutGuard, true);
    document.removeEventListener('cut',  copyCutGuard, true);
    copyCutGuardOn = false;
  }
}

function enableCleanCopy() {
  if (cleanEnabled) return;
  cleanEnabled = true;
  updateCopyCutGuard();
}

function disableCleanCopy() {
  if (!cleanEnabled) return;
  cleanEnabled = false;
  updateCopyCutGuard();
}

function enablePlainText() {
  if (plainTextEnabled) return;
  plainTextEnabled = true;
  updateCopyCutGuard();
}

function disablePlainText() {
  if (!plainTextEnabled) return;
  plainTextEnabled = false;
  updateCopyCutGuard();
}

function copySelectionClean() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  const cleaned = cleanText(selection.toString());
  writeTextToClipboard(cleaned)
    .catch(err => console.warn('[FreeCopy] Copy clean error:', err));
}

function writeTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(err => {
      if (!copyTextFallback(text)) throw err;
    });
  }
  return copyTextFallback(text)
    ? Promise.resolve()
    : Promise.reject(new Error('Clipboard write unavailable'));
}

function copyTextFallback(text) {
  const target = document.createElement('textarea');
  target.value = text;
  target.setAttribute('readonly', '');
  target.style.position = 'fixed';
  target.style.left = '-9999px';
  target.style.top = '0';
  (document.body || document.documentElement).appendChild(target);
  target.select();
  try {
    return document.execCommand('copy');
  } catch (_err) {
    return false;
  } finally {
    target.remove();
  }
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (!enabled) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(clearJsBlocking, 200);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function stopObserver() {
  clearTimeout(debounceTimer);
  if (observer) { observer.disconnect(); observer = null; }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  try {
    if (msg.action === 'enable')       enableCopy();
    if (msg.action === 'disable')      disableCopy();
    if (msg.action === 'enableClean')  enableCleanCopy();
    if (msg.action === 'disableClean') disableCleanCopy();
    if (msg.action === 'enablePlain')  enablePlainText();
    if (msg.action === 'disablePlain') disablePlainText();
    if (msg.action === 'copyClean')    copySelectionClean();
    if (msg.action === 'status')       sendResponse({ enabled, cleanEnabled, plainTextEnabled });
  } catch (err) {
    console.warn('[FreeCopy] Message error:', err);
  }
  return true;
});

try {
  chrome.storage.local.get(['enabled', 'cleanEnabled', 'plainTextEnabled', 'sitePrefs'], res => {
    if (chrome.runtime.lastError) {
      enableCopy(); enableCleanCopy(); enablePlainText(); return;
    }
    const host         = location.hostname;
    const sitePrefs    = res.sitePrefs || {};
    const siteOverride = sitePrefs[host];
    const globalOn     = res.enabled !== false;
    const shouldEnable = siteOverride !== undefined ? siteOverride : globalOn;
    if (!shouldEnable) return;
    enableCopy();
    if (res.cleanEnabled    !== false) enableCleanCopy();
    if (res.plainTextEnabled === true) enablePlainText();
  });
} catch (err) {
  console.warn('[FreeCopy] Init error:', err);
  enableCopy(); enableCleanCopy(); enablePlainText();
}
