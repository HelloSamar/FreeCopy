const masterToggle = document.getElementById('masterToggle');
const cleanToggle  = document.getElementById('cleanToggle');
const plainToggle  = document.getElementById('plainToggle');
const siteLabel = document.getElementById('siteLabel');
const statusLine = document.getElementById('statusLine');
let currentTab = null, currentHost = '';
let cleanOn = true, plainOn = false;

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  if (chrome.runtime.lastError) return;
  currentTab  = tabs[0] || null;
  const isHttp = currentTab?.url && /^https?:\/\//.test(currentTab.url);
  currentHost  = isHttp ? new URL(currentTab.url).hostname : '';
  siteLabel.textContent = currentHost || 'Unavailable here';
  masterToggle.disabled = !currentHost;
  document.body.dataset.supported = currentHost ? 'true' : 'false';

  // Clean Copy / Plain Text are global preferences (not per-site), so they
  // load and stay interactive even on pages FreeCopy can't run on.
  chrome.storage.local.get(['enabled', 'cleanEnabled', 'plainTextEnabled', 'sitePrefs'], res => {
    if (chrome.runtime.lastError) {
      cleanToggle.disabled = true;
      plainToggle.disabled = true;
      updatePopupState(false);
      return;
    }
    cleanOn = res.cleanEnabled !== false;
    plainOn = res.plainTextEnabled === true;
    cleanToggle.checked  = cleanOn;
    plainToggle.checked  = plainOn;
    cleanToggle.disabled = false;
    plainToggle.disabled = false;

    if (!currentHost) {
      updatePopupState(false);
      return;
    }
    const sitePrefs    = res.sitePrefs || {};
    const globalOn     = res.enabled !== false;
    const siteOverride = sitePrefs[currentHost];
    const enabledOn    = siteOverride !== undefined ? siteOverride : globalOn;
    updatePopupState(enabledOn);
  });
});

masterToggle.addEventListener('change', () => {
  const v = masterToggle.checked;
  if (!currentHost) return;
  masterToggle.disabled = true;
  chrome.storage.local.get(['sitePrefs'], res => {
    if (chrome.runtime.lastError) {
      masterToggle.disabled = false;
      updatePopupState(!v);
      return;
    }
    const sitePrefs = res.sitePrefs || {};
    sitePrefs[currentHost] = v;
    chrome.storage.local.set({ sitePrefs }, () => {
      masterToggle.disabled = false;
      if (chrome.runtime.lastError) {
        updatePopupState(!v);
        return;
      }
      updatePopupState(v);
      sendToTab(v ? 'enable'      : 'disable');
      sendToTab(v && cleanOn ? 'enableClean' : 'disableClean');
      sendToTab(v && plainOn ? 'enablePlain' : 'disablePlain');
    });
  });
});

cleanToggle.addEventListener('change', () => {
  const v = cleanToggle.checked;
  cleanToggle.disabled = true;
  chrome.storage.local.set({ cleanEnabled: v }, () => {
    cleanToggle.disabled = false;
    if (chrome.runtime.lastError) {
      cleanToggle.checked = !v;
      return;
    }
    cleanOn = v;
    if (masterToggle.checked) sendToTab(v ? 'enableClean' : 'disableClean');
  });
});

plainToggle.addEventListener('change', () => {
  const v = plainToggle.checked;
  plainToggle.disabled = true;
  chrome.storage.local.set({ plainTextEnabled: v }, () => {
    plainToggle.disabled = false;
    if (chrome.runtime.lastError) {
      plainToggle.checked = !v;
      return;
    }
    plainOn = v;
    if (masterToggle.checked) sendToTab(v ? 'enablePlain' : 'disablePlain');
  });
});

function sendToTab(action) {
  if (!currentTab?.id || !/^https?:\/\//.test(currentTab.url || '')) return;
  chrome.tabs.sendMessage(currentTab.id, { action }, () => { void chrome.runtime.lastError; });
}

function updatePopupState(enabledOn) {
  masterToggle.checked = enabledOn;
  document.body.dataset.enabled = enabledOn ? 'true' : 'false';
  if (!currentHost) {
    statusLine.textContent = 'FreeCopy cannot run on this page.';
    return;
  }
  statusLine.textContent = enabledOn ? 'FreeCopy is active on this site.' : 'FreeCopy is paused on this site.';
}
