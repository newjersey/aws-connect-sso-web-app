# AWS Connect SSO Web App

This project is intended to run from AWS Amplify, using Cognito as the log in
mechanism with users configured to have specialized groups representing their
Call Center permissions for various AWS Connect instances. This works in concert
with the Lambda defined for
[generating SAML Responses for Connect](https://github.com/newjersey/custom-aws-idp).
Then, once a user logs in to Cognito, this site should help them (within zero to
two clicks) get federated and logged in to their desired Connect instance.

## Configuration

This site relies on some environment variables:

- `NEXT_PUBLIC_SAML_GENERATION_URL`

  The URL for the APIGateway connection to the SAML Response generating Lambda
  mentioned above

- `NEXT_PUBLIC_COGNITO_HOSTED_UI_URL`

  The base URL for the Hosted UI Cognito sign-in page associated with this
  UserPool's application (the current working UserPool is "_Cognito for Connect
  Call Centers_" (ID: _us-east-1_jKQHCtx7s_) and the "App integration" client is
  "_ReactAppClient_")

- `NEXT_PUBLIC_COGNITO_CLIENT_ID`

  The Client ID of the App Integration - App Client (from the "_ReactAppClient_"
  client)

- `NEXT_PUBLIC_COGNITO_REDIRECT_URI`

  The URL of this web app

  **Note:** This must be configured here as well as inside Cognito, in the
  UserPool, in the App client, under "_Hosted UI_", under "_Allowed callback
  URLs_"

- `NEXT_PUBLIC_SSO_DEFAULT_DURATION`

  The session duration to use for the SSO session requested by the generated
  SAML (in seconds)

- `NEXT_PUBLIC_AWS_SAML_ENDPOINT`

  The SAML endpoint for Connect SSO sessions (should be
  "https://signin.aws.amazon.com/saml")

## Misc

This is a [Next.js](https://nextjs.org/) project bootstrapped with
[`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).
