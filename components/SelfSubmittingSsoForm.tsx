import { useEffect, useRef } from "react";
import { AWS_SAML_ENDPOINT } from "../pages/api/constants";
import { SsoDetails } from "../pages/api/types";

interface Props {
  ssoDetails: SsoDetails | undefined;
}

/**
 * A special form designed to POST the SAML SSO details to AWS. It is also
 * designed to auto-submit the form when the `ssoDetails` become defined. SAML
 * logins work best when the POST as well as subsequent interactions are managed
 * by the browser, but a user with only one configured Call Center should not
 * have to click anything to submit this form. Thus, the form is intentionally
 * hidden and set to auto-submit utilizing an effect hook.
 *
 * @param ssoDetails State variable containing the details used by the SSO form
 */
export default function SelfSubmittingSsoForm({ ssoDetails }: Props) {
  // Refs seem to need `null` instead of `undefined`
  const formRef = useRef<HTMLFormElement | null>(null);
  const samlResponseRef = useRef<HTMLInputElement | null>(null);
  const relayStateRef = useRef<HTMLInputElement | null>(null);

  // Auto-submit the SAML form once ssoDetails are present
  useEffect(() => {
    if (
      samlResponseRef.current?.value != null &&
      samlResponseRef.current.value.length > 0 &&
      relayStateRef.current?.value != null &&
      relayStateRef.current.value.length > 0
    ) {
      formRef.current?.submit();
    }
  }, [samlResponseRef.current?.value, relayStateRef.current?.value]);

  return (
    <form
      action={AWS_SAML_ENDPOINT}
      encType="application/x-www-form-urlencoded"
      method="POST"
      ref={formRef}
    >
      <input
        name="SAMLResponse"
        value={ssoDetails?.SAMLResponse || ""}
        type="hidden"
        ref={samlResponseRef}
      />
      <input
        name="RelayState"
        value={ssoDetails?.RelayState || ""}
        type="hidden"
        ref={relayStateRef}
      />
    </form>
  );
}
