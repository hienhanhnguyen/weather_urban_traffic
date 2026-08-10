export type TranslateValidation = (key: ValidationKey) => string;

export type ValidationKey =
  | "emailRequired"
  | "emailInvalid"
  | "emailTooLong"
  | "passwordRequired"
  | "passwordMin"
  | "passwordMax"
  | "passwordsNoMatch"
  | "usernameAlnum"
  | "usernameMin"
  | "usernameMax"
  | "codeLength"
  | "codeDigits"
  | "currentPasswordRequired"
  | "newPasswordReused"
  | "timezoneMax";
