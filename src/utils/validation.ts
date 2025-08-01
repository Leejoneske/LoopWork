
export const validatePhoneNumber = (phone: string): boolean => {
  // Kenyan phone number validation (254 or 0 prefix)
  const phoneRegex = /^(\+?254|0)?[17]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

export const sanitizeInput = (input: string): string => {
  // Basic XSS prevention - strip HTML tags and encode special characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>&"']/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return entities[match] || match;
    })
    .trim();
};

export const validateWithdrawalAmount = (amount: number, balance: number): { isValid: boolean; message: string } => {
  if (amount <= 0) {
    return { isValid: false, message: "Amount must be greater than 0" };
  }
  if (amount < 100) {
    return { isValid: false, message: "Minimum withdrawal amount is KSh 100" };
  }
  if (amount > balance) {
    return { isValid: false, message: "Amount exceeds available balance" };
  }
  if (amount > 50000) {
    return { isValid: false, message: "Maximum single withdrawal is KSh 50,000" };
  }
  return { isValid: true, message: "" };
};
