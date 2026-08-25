export const MIN_NEW_PASSWORD_LENGTH=8;

const COMMON_PASSWORDS=new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "qwerty123",
  "letmein123"
]);

export type NewPasswordValidationError="AUTH_PASSWORD_TOO_SHORT"|"AUTH_PASSWORD_TOO_COMMON"|"AUTH_PASSWORD_CONTAINS_EMAIL";

export function validateNewPassword(email:string,password:string):NewPasswordValidationError|null{
  if(password.length<MIN_NEW_PASSWORD_LENGTH)return "AUTH_PASSWORD_TOO_SHORT";
  const normalizedPassword=password.toLocaleLowerCase("en-US");
  if(COMMON_PASSWORDS.has(normalizedPassword))return "AUTH_PASSWORD_TOO_COMMON";
  const emailName=email.trim().toLocaleLowerCase("en-US").split("@",1)[0]??"";
  if(emailName.length>=3&&normalizedPassword.includes(emailName))return "AUTH_PASSWORD_CONTAINS_EMAIL";
  return null;
}
