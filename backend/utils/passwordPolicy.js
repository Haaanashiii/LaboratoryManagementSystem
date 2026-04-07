const MIN_PASSWORD_LENGTH = 6;
const MIN_UNIQUE_CHAR_COUNT = 5;

const countUniqueChars = (password) => {
  return new Set(String(password || '')).size;
};

const validatePasswordPolicy = (password) => {
  const value = String(password || '');
  const errors = [];

  if (value.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(value)) {
    errors.push('Password must include at least one uppercase letter');
  }

  if (countUniqueChars(value) < MIN_UNIQUE_CHAR_COUNT) {
    errors.push(`Password must include at least ${MIN_UNIQUE_CHAR_COUNT} unique characters`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  MIN_UNIQUE_CHAR_COUNT,
  countUniqueChars,
  validatePasswordPolicy
};
