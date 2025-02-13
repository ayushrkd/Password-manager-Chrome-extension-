// error handler class for handling authentication errors and account recovery
class SecurityErrorHandler {
    constructor() {
        this.maxAttempts = 3;
        this.lockoutDuration = 300000; // 5 minutes
    }

    handleAuthError(error) {
        if (error.type === 'auth_failed') {
            this.incrementFailedAttempts();
        }
    }

    incrementFailedAttempts() {
        chrome.storage.sync.get(['failedAttempts'], (result) => {
            const attempts = (result.failedAttempts || 0) + 1;
            chrome.storage.sync.set({
                failedAttempts: attempts,
                lastFailedAttempt: Date.now()
            });
        });
    }

    isAccountLocked(attempts, lastAttempt) {
        if (attempts >= this.maxAttempts) {
            const timePassed = Date.now() - lastAttempt;
            return timePassed < this.lockoutDuration;
        }
        return false;
    }
}
  