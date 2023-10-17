import fetch from "node-fetch";
import { DEFAULT_DURATION, SAML_GENERATION_URL } from "./constants";
import { GetSamlResponse, SsoDetails } from "./types";

/**
 * Call our Lambda with a specific Cognito Group as well as the corresponding
 * Cognito ID JWT (to satisfy APIGateway) in order to generate a SAML Response.
 *
 * @param groupName The name of the Cognito Group representing the desired AWS
 * Connect instance a user wants to log into
 * @param idToken The user's Cognito ID JWT
 */
export default async function generateSaml(
  groupName: string,
  idToken: string,
): Promise<SsoDetails> {
  return fetch(
    `${SAML_GENERATION_URL}/${groupName}?duration=${DEFAULT_DURATION}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    },
  )
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`SAML Lambda response status: ${response.status}`);
      }
    })
    .then((response: GetSamlResponse) => {
      if (response.status === "SUCCESS") {
        return {
          SAMLResponse: response.samlResponse,
          RelayState: response.relayState,
        };
      } else {
        throw new Error(`Issues fetching SAML Response: ${response.error}`);
      }
    })
    .catch((error) => {
      throw new Error(error.toString());
    });
}
