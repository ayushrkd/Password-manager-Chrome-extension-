// Import existing security classes
const vault = new PasswordVault();
const auth = new AuthHandler();
const errorHandler = new SecurityErrorHandler();

document.addEventListener('DOMContentLoaded', async function() {
  const saveButton = document.getElementById('saveCredentials');
  const generateButton = document.getElementById('generatePassword');
  const masterPasswordForm = document.getElementById('masterPasswordForm');
  
  // First require master password
  masterPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const masterPassword = document.getElementById('masterPassword').value;
    
    try {
      const isFirstTime = await vault.checkFirstTimeUser();
      if (isFirstTime) {
        const confirmPassword = prompt("First time setup - Please confirm your master password:");
        if (confirmPassword === masterPassword) {
          const isInitialized = await vault.initializeVault(masterPassword);
          if (isInitialized) {
            document.getElementById('mainContent').style.display = 'block';
            masterPasswordForm.style.display = 'none';
            loadCredentials();
          }
        } else {
          alert("Passwords don't match! Please try again.");
        }
      } else {
        const isInitialized = await vault.initializeVault(masterPassword);
        if (isInitialized) {
          document.getElementById('mainContent').style.display = 'block';
          masterPasswordForm.style.display = 'none';
          loadCredentials();
        } else {
          alert("Invalid master password!");
          errorHandler.handleAuthError({ type: 'auth_failed' });
        }
      }
    } catch (error) {
      errorHandler.handleAuthError({ type: 'auth_failed' });
    }
  });
  
  saveButton.addEventListener('click', async function() {
    const website = document.getElementById('website').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (website && username && password) {
      this.classList.add('save-success');
      setTimeout(() => this.classList.remove('save-success'), 500);
      
      const savedCred = await vault.saveCredential(website, username, password);
      if (savedCred.isUpdated) {
        showNotification('Credentials updated successfully');
      } else {
        showNotification('Credentials saved successfully');
      }
      loadCredentials();
      clearForm();
    } else {
      showNotification('Please fill in all fields', 'error');
    }
  });
  
  generateButton.addEventListener('click', function() {
    const length = document.getElementById('passwordLength').value;
    // Use the secure generator from generator.js
    const password = generateSecurePassword(length);
    document.getElementById('password').value = password;
  });

  // Add this after your existing event listeners
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const toggleButtons = document.querySelectorAll('.toggle-password');
  
  toggleButtons.forEach((button, index) => {
    button.addEventListener('click', function() {
      const input = passwordInputs[index];
      const type = input.getAttribute('type');
      input.setAttribute('type', type === 'password' ? 'text' : 'password');
      button.innerHTML = type === 'password' ? 
        '<i class="fas fa-eye-slash"></i>' : 
        '<i class="fas fa-eye"></i>';
    });
  });

  // Add download button event listener
  const downloadButton = document.getElementById('downloadCredentials');
  if (downloadButton) {
    downloadButton.addEventListener('click', downloadCredentials);
  }

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Add this to your DOMContentLoaded event listener
  const passwordInput = document.getElementById('password');
  const strengthBar = document.querySelector('.strength-bar');
  const strengthText = document.querySelector('.strength-text');

  passwordInput.addEventListener('input', function() {
    const result = checkPasswordStrength(this.value);
    
    if (this.value === '') {
      strengthBar.style.width = '0';
      strengthBar.style.backgroundColor = '#ddd';
      strengthText.textContent = '';
      return;
    }
    
    strengthBar.style.width = ((result.strength === 'weak' ? 33 : 
                               result.strength === 'medium' ? 66 : 
                               result.strength === 'strong' ? 100 : 0) + '%');
    strengthBar.style.backgroundColor = result.color;
    strengthText.textContent = result.text;
    strengthText.style.color = result.color;
  });

  // Add these event listeners after existing ones
  const forgotPasswordBtn = document.getElementById('forgotPassword');
  const backToLoginBtn = document.getElementById('backToLogin');
  const recoverAccountBtn = document.getElementById('recoverAccount');

  forgotPasswordBtn.addEventListener('click', function() {
    document.getElementById('masterPasswordForm').style.display = 'none';
    document.getElementById('recoveryForm').style.display = 'block';
  });

  backToLoginBtn.addEventListener('click', function() {
    document.getElementById('recoveryForm').style.display = 'none';
    document.getElementById('masterPasswordForm').style.display = 'block';
  });

  recoverAccountBtn.addEventListener('click', async function() {
    const email = document.getElementById('recoveryEmail').value;
    const question = document.getElementById('securityQuestion').value;
    const answer = document.getElementById('securityAnswer').value;

    if (!email || !question || !answer) {
      showNotification('Please fill in all recovery fields', 'error');
      return;
    }

    const isValid = await vault.verifyRecoveryInfo(email, question, answer);
    if (isValid) {
      const newPassword = prompt('Enter your new master password:');
      const confirmPassword = prompt('Confirm your new master password:');

      if (newPassword === confirmPassword) {
        await vault.resetMasterPassword(newPassword);
        showNotification('Master password reset successfully');
        document.getElementById('recoveryForm').style.display = 'none';
        document.getElementById('masterPasswordForm').style.display = 'block';
      } else {
        showNotification('Passwords do not match', 'error');
      }
    } else {
      showNotification('Invalid recovery information', 'error');
    }
  });
});

async function saveCredential(website, username, encryptedPassword) {
  try {
    chrome.storage.sync.get(['credentials'], function(result) {
      const credentials = result.credentials || [];
      credentials.push({ website, username, encryptedPassword });
      
      chrome.storage.sync.set({ credentials }, function() {
        loadCredentials();
        clearForm();
      });
    });
  } catch (error) {
    console.error('Error saving credentials:', error);
  }
}

function generateStrongPassword(length) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function loadCredentials() {
  const credentialsList = document.getElementById('credentialsList');
  credentialsList.innerHTML = '';
  
  chrome.storage.sync.get(['credentials'], function(result) {
    const credentials = result.credentials || [];
    
    credentials.forEach(function(cred) {
      const div = document.createElement('div');
      div.className = 'credential-item';
      const decryptedPassword = atob(cred.encryptedPassword);
      
      div.innerHTML = `
        <div class="cred-row"><i class="fas fa-globe"></i> ${cred.website}</div>
        <div class="cred-row"><i class="fas fa-user"></i> ${cred.username}</div>
        <div class="cred-row password-row">
          <i class="fas fa-key"></i>
          <span class="password-dots">********</span>
          <span class="password-text" style="display: none;">${decryptedPassword}</span>
          <div class="button-group">
            <button class="toggle-password" title="Show/Hide Password">
              <i class="fas fa-eye"></i>
            </button>
            <button class="copy-password" title="Copy Password">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        ${cred.lastUpdated ? `
          <div class="cred-row timestamp">
            <i class="fas fa-clock"></i>
            <span>Last updated: ${formatDate(cred.lastUpdated)}</span>
            <span class="updated-badge">Updated</span>
          </div>
        ` : ''}
      `;
      
      // Add event listeners for password visibility toggle
      const toggleBtn = div.querySelector('.toggle-password');
      const passwordDots = div.querySelector('.password-dots');
      const passwordText = div.querySelector('.password-text');
      const copyBtn = div.querySelector('.copy-password');
      
      toggleBtn.addEventListener('click', function() {
        const isVisible = passwordText.style.display === 'inline';
        passwordDots.style.display = isVisible ? 'inline' : 'none';
        passwordText.style.display = isVisible ? 'none' : 'inline';
        toggleBtn.innerHTML = isVisible ? 
          '<i class="fas fa-eye"></i>' : 
          '<i class="fas fa-eye-slash"></i>';
      });
      
      copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(decryptedPassword);
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 1000);
      });
      
      credentialsList.appendChild(div);
    });
  });
}

function clearForm() {
  document.getElementById('website').value = '';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

function showNotification(message, type = 'success') {
  // Remove any existing notifications first
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  // Simplified notification content
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
    ${message}
  `;
  
  document.body.appendChild(notification);
  
  requestAnimationFrame(() => {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  });
}

// Add this function after loadCredentials()
function downloadCredentials() {
  chrome.storage.sync.get(['credentials'], function(result) {
    const credentials = result.credentials || [];
    
    // Create a sanitized version of credentials for export
    const exportData = credentials.map(cred => ({
      website: cred.website,
      username: cred.username,
      password: atob(cred.encryptedPassword), // Decrypt password for export
      lastUpdated: cred.lastUpdated || null
    }));

    // Convert to JSON and create blob
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create download link
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    
    downloadLink.href = downloadUrl;
    downloadLink.download = `password-manager-backup-${date}.json`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Cleanup
    URL.revokeObjectURL(downloadUrl);
  });
}

// Add this function after your existing functions
function checkPasswordStrength(password) {
  let score = 0;
  
  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  // Return strength level
  if (score === 0) return { strength: 'none', color: '#ddd', text: '' };
  if (score <= 2) return { strength: 'weak', color: '#ff4d4d', text: 'Weak' };
  if (score <= 4) return { strength: 'medium', color: '#ffd700', text: 'Medium' };
  return { strength: 'strong', color: '#2ecc71', text: 'Strong' };
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  const icon = document.querySelector('#themeToggle i');
  icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
} 