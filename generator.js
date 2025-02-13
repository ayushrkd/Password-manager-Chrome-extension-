// password generator class for generating secure passwords
function generateSecurePassword(length = 16) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % charset.length;
      password += charset[randomIndex];
    }
    return password;
  }
  