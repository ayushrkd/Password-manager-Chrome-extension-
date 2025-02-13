chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({ 
    credentials: [],
    failedAttempts: 0,
    lastFailedAttempt: null
  });
});

chrome.webNavigation.onCompleted.addListener(function(details) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "checkForLoginForm",
      url: details.url
    });
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === "checkLockout") {
    chrome.storage.sync.get(['failedAttempts', 'lastFailedAttempt'], function(result) {
      const isLocked = result.failedAttempts >= 3 && 
        (Date.now() - result.lastFailedAttempt) < 300000;
      sendResponse({ isLocked });
    });
    return true;
  }
}); 