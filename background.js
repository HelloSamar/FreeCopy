/**
 * FreeCopy — background.js v1.0.1
 * Handles: keyboard shortcut, context menu
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'freecopy-copy-clean', title: 'Copy Clean (FreeCopy)', contexts: ['selection']
  }, () => { void chrome.runtime.lastError; });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'freecopy-copy-clean' || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { action: 'copyClean' }, () => { void chrome.runtime.lastError; });
});

chrome.commands.onCommand.addListener(cmd => {
  if (cmd !== 'toggle-freecopy') return;
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (chrome.runtime.lastError) return;
    const tab = tabs[0];
    if (!tab?.id || !tab.url || !/^https?:\/\//.test(tab.url)) return;
    chrome.storage.local.get(['enabled', 'cleanEnabled', 'plainTextEnabled', 'sitePrefs'], res => {
      if (chrome.runtime.lastError) return;
      const host      = new URL(tab.url).hostname;
      const sitePrefs = res.sitePrefs || {};
      const current   = sitePrefs[host] !== undefined ? sitePrefs[host] : res.enabled !== false;
      const next      = !current;
      const cleanOn   = res.cleanEnabled !== false;
      const plainOn   = res.plainTextEnabled === true;
      sitePrefs[host] = next;
      chrome.storage.local.set({ sitePrefs }, () => { void chrome.runtime.lastError; });
      chrome.tabs.sendMessage(tab.id, { action: next ? 'enable'      : 'disable'      }, () => { void chrome.runtime.lastError; });
      chrome.tabs.sendMessage(tab.id, { action: next && cleanOn ? 'enableClean' : 'disableClean' }, () => { void chrome.runtime.lastError; });
      chrome.tabs.sendMessage(tab.id, { action: next && plainOn ? 'enablePlain' : 'disablePlain' }, () => { void chrome.runtime.lastError; });
    });
  });
});
