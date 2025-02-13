chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTOFILL') {
    const usernameInput = document.querySelector('input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
    
    if (usernameInput && passwordInput) {
      usernameInput.value = request.username;
      passwordInput.value = request.password;
    }
  }
  return true;
}); 