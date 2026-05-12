const PLACEHOLDER_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "email.com",
  "test.com",
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
]);

export function validateProductionEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(normalized)) {
    return "Enter a valid email address.";
  }

  const domain = normalized.split("@").pop();
  if (PLACEHOLDER_DOMAINS.has(domain)) {
    return "Temporary, demo, or placeholder emails are not allowed.";
  }

  return "";
}
