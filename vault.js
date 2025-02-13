// vault class for managing user credentials and master password
class PasswordVault {
    constructor() {
        this.vault = {};
        this.encryptionKey = null;
        this.isFirstTime = true;
    }

    async checkFirstTimeUser() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['masterPasswordHash'], (result) => {
                this.isFirstTime = !result.masterPasswordHash;
                resolve(this.isFirstTime);
            });
        });
    }

    async initializeVault(masterPassword) {
        const isFirst = await this.checkFirstTimeUser();
        if (isFirst) {
            await this.createMasterPassword(masterPassword);
            return true;
        } else {
            return await this.validateMasterPassword(masterPassword);
        }
    }

    async createMasterPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        await chrome.storage.sync.set({ masterPasswordHash: hashHex });
        return true;
    }

    async validateMasterPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return new Promise((resolve) => {
            chrome.storage.sync.get(['masterPasswordHash'], (result) => {
                resolve(result.masterPasswordHash === hashHex);
            });
        });
    }

    async encryptPassword(password) {
        // Simple encryption for demo - in production use more secure methods
        return btoa(password);
    }

    async saveCredential(website, username, password) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['credentials'], (result) => {
                let credentials = result.credentials || [];
                const existingIndex = credentials.findIndex(
                    cred => cred.website === website && cred.username === username
                );

                const newCredential = {
                    website,
                    username,
                    encryptedPassword: btoa(password),
                    lastUpdated: new Date().toISOString(),
                    isUpdated: existingIndex !== -1
                };

                if (existingIndex !== -1) {
                    credentials[existingIndex] = newCredential;
                } else {
                    credentials.push(newCredential);
                }

                chrome.storage.sync.set({ credentials }, () => resolve(newCredential));
            });
        });
    }

    async setRecoveryInfo(email, question, answer) {
        const hashedAnswer = await this.hashString(answer.toLowerCase());
        await chrome.storage.sync.set({
            recoveryEmail: email,
            recoveryQuestion: question,
            recoveryAnswer: hashedAnswer
        });
    }

    async verifyRecoveryInfo(email, question, answer) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['recoveryEmail', 'recoveryQuestion', 'recoveryAnswer'], async (result) => {
                if (!result.recoveryEmail || !result.recoveryAnswer) {
                    resolve(false);
                    return;
                }

                const hashedAnswer = await this.hashString(answer.toLowerCase());
                const isValid = result.recoveryEmail === email &&
                               result.recoveryQuestion === question &&
                               result.recoveryAnswer === hashedAnswer;
                resolve(isValid);
            });
        });
    }

    async resetMasterPassword(newPassword) {
        const encoder = new TextEncoder();
        const data = encoder.encode(newPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        await chrome.storage.sync.set({ masterPasswordHash: hashHex });
        return true;
    }

    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
  