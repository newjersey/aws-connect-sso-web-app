export const SAML_GENERATION_URL = process.env.NEXT_PUBLIC_SAML_GENERATION_URL;
export const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
export const REDIRECT_URI = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || "";
const HOSTED_UI_URL = process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI_URL;
export const HOSTED_UI_TOKEN_URL = `${HOSTED_UI_URL}/oauth2/token`;
export const HOSTED_UI_LOGIN_URL =
  `${HOSTED_UI_URL}/login?client_id=${CLIENT_ID}&` +
  "response_type=code&scope=openid&" +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
export const DEFAULT_DURATION = process.env.NEXT_PUBLIC_SSO_DEFAULT_DURATION;
export const AWS_SAML_ENDPOINT = process.env.NEXT_PUBLIC_AWS_SAML_ENDPOINT;
