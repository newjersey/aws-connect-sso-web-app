import React, { useState } from "react";
import generateSaml from "../pages/api/generateSaml";
import { CallCenterSubmitState, SsoDetails } from "../pages/api/types";
import styles from "../styles/Home.module.css";

interface Props {
  cognitoGroups: string[];
  idToken: string;
  submitState: CallCenterSubmitState;
  setSubmitState: React.Dispatch<React.SetStateAction<CallCenterSubmitState>>;
  setSsoDetails: React.Dispatch<React.SetStateAction<SsoDetails | undefined>>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
}

/**
 * Pick one call center with a radio button type of form when a user is
 * configured with multiple call centers.
 *
 * @param cognitoGroups The groups (call centers) this user belongs to
 * @param idToken User's Cognito token necessary for calling `generateSaml`
 * @param submitState Enum state variable denoting the current submit-state for
 * a call center choice
 * @param setSubmitState Setter for the above state variable
 * @param setSsoDetails Setter for the output of `generateSaml`
 * @param setError Setter in case there are errors while calling `generateSaml`
 */
export default function CallCenterPicker({
  cognitoGroups,
  idToken,
  submitState,
  setSubmitState,
  setSsoDetails,
  setError,
}: Props) {
  const [currentPick, setCurrentPick] = useState<string | undefined>(undefined);
  const onRadioGroupSubmit = () => {
    setSubmitState(CallCenterSubmitState.USER_SUBMITTED);
    generateSaml(currentPick!, idToken)
      .then((output) => setSsoDetails(output))
      .catch((error) => setError(error.message));
  };

  return (
    <>
      <h2>Choose a Call Center to connect to:</h2>
      <div>
        {cognitoGroups.sort().map((group: string) => (
          <div key={group}>
            <input
              type="radio"
              name="currentGroupChoice"
              value={group}
              id={group}
              checked={currentPick === group}
              onChange={(e) => setCurrentPick(e.target.value)}
            />
            <label htmlFor={group}>{group}</label>
          </div>
        ))}
      </div>
      <div>
        <button
          className={styles.button}
          disabled={
            currentPick == undefined ||
            submitState === CallCenterSubmitState.USER_SUBMITTED
          }
          onClick={onRadioGroupSubmit}
        >
          Connect
        </button>
      </div>
    </>
  );
}
