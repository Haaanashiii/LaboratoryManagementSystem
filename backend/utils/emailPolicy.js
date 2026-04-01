const DEFAULT_DEV_BYPASS_EMAILS = [
  'haaanashiii@gmail.com',
  'delossantosyowcam@gmail.com',
  'hed-mrjose@smu.edu.ph'
];

const STAFF_ROLES = ['admin', 'lecturer', 'lab_assistant', 'head', 'head_of_lab'];

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const parseEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);

  // Keep validation strict and deterministic before domain checks.
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return {
      isValid: false,
      reason: 'invalid_email_format',
      normalizedEmail,
      domain: null
    };
  }

  const parts = normalizedEmail.split('@');
  if (parts.length !== 2 || !parts[1]) {
    return {
      isValid: false,
      reason: 'invalid_email_domain',
      normalizedEmail,
      domain: null
    };
  }

  const domain = parts[1].trim();
  if (!domain) {
    return {
      isValid: false,
      reason: 'invalid_email_domain',
      normalizedEmail,
      domain: null
    };
  }

  return {
    isValid: true,
    reason: null,
    normalizedEmail,
    domain
  };
};

const isDevBypassEnabled = () => {
  const envFlag = String(process.env.ENABLE_DEV_EMAIL_BYPASS || '').trim().toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';

  if (envFlag === 'true') return true;
  if (envFlag === 'false') return false;

  return !isProduction;
};

const getBypassEmails = () => {
  const envEmails = String(process.env.DEV_BYPASS_EMAILS || '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_DEV_BYPASS_EMAILS, ...envEmails]));
};

const isDevBypassEmail = (normalizedEmail) => {
  if (!isDevBypassEnabled()) {
    return false;
  }

  return getBypassEmails().includes(normalizedEmail);
};

const isAllowedRegistrationDomain = (domain) => {
  return domain === 'student.its.ac.id' || domain === 'its.ac.id';
};

const isAllowedDomainForRole = (role, domain) => {
  if (role === 'student') {
    return domain === 'student.its.ac.id';
  }

  if (STAFF_ROLES.includes(role)) {
    return domain === 'its.ac.id';
  }

  return false;
};

module.exports = {
  parseEmail,
  isDevBypassEmail,
  isAllowedRegistrationDomain,
  isAllowedDomainForRole
};