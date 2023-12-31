import * as jwt from "jsonwebtoken";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import CallCenterPicker from "../components/CallCenterPicker";
import SelfSubmittingSsoForm from "../components/SelfSubmittingSsoForm";
import styles from "../styles/Home.module.css";
import {
  CLIENT_ID,
  HOSTED_UI_LOGIN_URL,
  HOSTED_UI_TOKEN_URL,
  REDIRECT_URI,
} from "./api/constants";
import generateSaml from "./api/generateSaml";
import {
  CallCenterSubmitState,
  DecodedIdToken,
  IdDetails,
  SsoDetails,
  TokenResponse,
} from "./api/types";

export default function Home() {
  const [idDetails, setIdDetails] = useState<IdDetails | undefined>(undefined);
  const [ssoDetails, setSsoDetails] = useState<SsoDetails | undefined>(
    undefined,
  );
  const [submitState, setSubmitState] = useState(CallCenterSubmitState.IDLE);
  const [error, setError] = useState<string | undefined>(undefined);
  // Control double effect-invocation when `fetch` should only happen once
  const tokenFetchAlreadyRan = useRef<boolean>(false);

  useEffect(() => {
    // ensure `document` is going to be defined
    if (typeof window === "object") {
      const searchParameters = new URLSearchParams(
        document.location.search.substring(1),
      );
      const authorizationCode = searchParameters.get("code");

      // No authorizationCode? Go directly to the Hosted UI login page
      if (authorizationCode == null || authorizationCode === "") {
        window.location.replace(HOSTED_UI_LOGIN_URL);
      } else if (!tokenFetchAlreadyRan.current) {
        tokenFetchAlreadyRan.current = true;
        fetch(HOSTED_UI_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            code: authorizationCode,
          }),
        })
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            setError(
              "Status fetching Cognito session: " +
                `${response.status}. Have you tried logging in again?`,
            );
          })
          .then((response: TokenResponse) => {
            const idToken = response?.id_token;
            const decodedJwt = jwt.decode(idToken) as DecodedIdToken;
            const jwtGroups = decodedJwt?.["cognito:groups"];

            if (jwtGroups != null && jwtGroups.length === 1) {
              setSubmitState(CallCenterSubmitState.AUTO_TRIGGERED);
              generateSaml(jwtGroups[0], idToken)
                .then((output) => setSsoDetails(output))
                .catch((error) => setError(error.message));
            } else {
              setIdDetails({
                token: idToken,
                groups: jwtGroups,
                email: decodedJwt?.email,
                sub: decodedJwt?.sub,
              });
            }
          })
          .catch((error) => setError(error.message));
      }
    }
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title key="indexTitle">NJ Call Centers: Log In</title>
        <meta
          key="indexMeta"
          name="description"
          content="Log in to a New Jersey Call Center"
        />
        <link key="indexIcon" rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        {error != undefined && (
          <>
            <h2>Error: {error.replace(/Error: /g, "")}</h2>
            <h3>
              Please contact your administrator with the above error message.
            </h3>
          </>
        )}

        {error == undefined && submitState !== CallCenterSubmitState.IDLE && (
          <>
            <h2 className={styles.connecting}>
              Connecting.<span>.</span>
              <span>.</span>
            </h2>
            <SelfSubmittingSsoForm ssoDetails={ssoDetails} />
          </>
        )}

        {error == undefined &&
          submitState === CallCenterSubmitState.IDLE &&
          idDetails == undefined && <div className={styles.loader}></div>}

        {error == undefined &&
          submitState === CallCenterSubmitState.IDLE &&
          idDetails != undefined &&
          idDetails.groups?.length > 1 && (
            <CallCenterPicker
              cognitoGroups={idDetails.groups}
              idToken={idDetails.token}
              submitState={submitState}
              setSubmitState={setSubmitState}
              setSsoDetails={setSsoDetails}
              setError={setError}
            />
          )}

        {error == undefined &&
          submitState === CallCenterSubmitState.IDLE &&
          idDetails != undefined &&
          (idDetails.groups == undefined || idDetails.groups.length === 0) && (
            <>
              {idDetails.groups == undefined ? (
                <h2>Error: Configured call centers are undefined</h2>
              ) : (
                <h2>Error: No configured call centers were found</h2>
              )}
              <h3>
                Please contact your administrator to get permissions to a call
                center.
              </h3>
              <div>
                <h4 className={styles.shorty}>
                  User: &quot;{idDetails.email}&quot;
                </h4>
                <h4 className={styles.shorty}>
                  ID: &quot;{idDetails.sub}&quot;
                </h4>
              </div>
              <h3>Please mention the above details as well.</h3>
            </>
          )}
      </main>
    </div>
  );
}
