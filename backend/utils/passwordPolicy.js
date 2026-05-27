const MIN_PASSWORD_LENGTH = 8;

const validatePasswordPolicy = (password) => {
  const value = String(password || '');
  const errors = [];

  if (value.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(value)) {
    errors.push('Password must include at least one uppercase letter');
  }

  if (!/[a-z]/.test(value)) {
    errors.push('Password must include at least one lowercase letter');
  }

  if (!/[0-9]/.test(value)) {
    errors.push('Password must include at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    errors.push('Password must include at least one special character (e.g. !@#$%)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  validatePasswordPolicy
};
