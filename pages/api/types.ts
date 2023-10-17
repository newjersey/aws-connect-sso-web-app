export interface DecodedIdToken {
  at_hash: string;
  aud: string;
  auth_time: number;
  "cognito:groups": string[];
  "cognito:username": string;
  email: string;
  email_verified: boolean;
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  origin_jti: string;
  sub: string;
  token_use: string;
}

export interface IdDetails {
  token: string;
  groups: string[];
  email: string;
  sub: string;
}

export interface SsoDetails {
  SAMLResponse: string;
  RelayState: string;
}

export interface TokenResponse {
  id_token: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface GetSamlResponse {
  status: string;
  samlResponse: string;
  relayState: string;
  error: string;
}
