# The Inside Story

This code functions to bring together AWS Cognito with AWS Connect using the
Lambda defined in the 
[Custom AWS IDP](https://github.com/newjersey/custom-aws-idp)
repo. It utilizes Cognito's 
[Hosted UI](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-hosted-ui-user-sign-in.html)
so that the baseline login security is fully managed by AWS (with JWTs
containing login session metadata). In order to send invite-emails to new users
and manage password resetting, AWS Simple Email Service (SES) has been used to
register a verified domain and a verified email. The Cognito User Pool is also
configured to require MFA. One of those MFA methods is allowed to be SMS, and
setting up the phone number for those text messages is done in Amazon Simple
Notification Service (SNS) and Amazon Pinpoint / Pinpoint SMS.

To make this all work took some unintuitive steps and some long lead times, so
this document serves to help anyone in the future trying to replicate or emulate
some parts of this system as well as to update the right things if this system
changes.

## Generating (and handling) a valid SAML Response

As described in the README for Custom AWS IDP, there was a lot of difficulty
generating a valid, signed SAML Response which AWS could consume. Also, getting
it all pieced together correctly took learning new things.

It turns out that SAML-based SSO seems to lean heavily on browsers to do a lot
of correct handling and redirecting. This happens after the SAML Response is
POSTed to the Service Provider (SP, in our case AWS) using the
`application/x-www-form-urlencoded` content type. As well, in order for AWS to
correctly redirect the browser to the right AWS Connect instance after
successful authentication, the `RelayState` must be included in that POST body.
As can also be seen in the Custom AWS IDP repo, the `SAMLResponse` is
transmitted in base64 format. 

In order to POST the SAML Response and Relay State to AWS without forcing the
user to manually submit a form, a
[Self Submitting Form](../components/SelfSubmittingSsoForm.tsx) is used (also
using hidden inputs so the user doesn't have to see anything confusing either).

**ASIDE**: It is not useful for this work now, but an earlier draft (without the
need for a frontend with a call center picker) relied on a Lambda response with
content type `text/html` and an embedded self-submitting form as the body, like
this:

```html
<body onload="document.forms[0].submit()">
  <form ... >
     <!-- hidden inputs... -->
  </form>
  <h1>Loading...</h1>
</body>
```

I thought that was cool enough to keep around even though we are not using it.

## Setting up emails

We wanted to set up Cognito's *Messaging* configuration so that users would be
able to get an invitation email with their first (temporary) password and also
so that users could receive emails to help for forgotten-password resets. As it
turned out, this was much harder than it seemed, requiring enough understanding
of email security and the Simple Email Service to get to the point where emails
could at least reach their destination without being bounced or dropped, even
though under V1, emails still end up in state junk folders.

### DMARC = DKIM + SPF

Domain-based Message Authentication, Reporting and Conformance (DMARC) helps
protect an email domain against spoofing and phishing. It does this using two
mechanisms:
1. The Sender Policy Framework (SPF) which specifies what servers/domains are
   authorized to be mail-senders for a given email domain, and
2. DomainKeys Identified Mail (DKIM) which adds digital signatures to all
   outgoing mail, allowing receivers to verify the mail sender

The state uses DMARC (thankfully) with "relaxed alignment," which just means we
are allowed to set up the MAIL-FROM domain as a custom subdomain and still pass
DMARC. The fine details of these protocols are not important here, but with that
baseline information in place, this system required going to Amazon SES and
configuring:
1. *innovation.nj.gov* as a verified identity domain
   1. Configuring the use of *Easy DKIM* under "Advanced DKIM settings" with
      *RSA_2048_BIT* DKIM signing key length and DKIM signatures enabled
      1. Requiring OIT to publish three CNAME records
   2. Configuring the Custom MAIL FROM domain *aws-email.innovation.nj.gov*
      1. Requiring OIT to publish AWS-provided DNS records
2. *callcenters@innovation.nj.gov* as a verified identity email address
   1. Requiring OIT/ops to create the email address and provide us with access
      to its inbox; AWS sends a verification email to the inbox and the address
      is only verified after a link in that verification email is clicked
3. Production Mode (by default, SES starts out in Sandbox Mode where emails can
   only be sent to other SES verified email addresses, a request must be made to
   graduate from Sandbox to Production, and I don't remember but this may also
   require a request for some limit increase)

Once the setup is complete, Cognito can be configured to use the verified email
address as the "FROM Email Address" by editing "Email" on the Messaging tab in
the User Pool. An optional "FROM Sender Name" can also be configured, such as
"New Jersey Call Centers \<callcenters@innovation.nj.gov>".

Special thanks to the New Jersey Cyber Communication & Integration Cell (NJCCIC)
and AWS support engineers who helped us figure out how to set this up.

## Setting up SMS

Getting SMS configured required a number of steps, lead time, and also some
bug-dodging trickery.

### Allowing SMS for MFA without shooting yourself in the foot

As it turns out, at least as of this writing in early December 2023, if a User
Pool wants to allow both MFA methods (Authenticator apps + SMS message)
utilizing the Cognito Hosted UI, you __*should not*__ configure the "SMS
message" option while in the User Pool creation flow. If "SMS message" is
selected, then on the following creation flow page you will see that
`phone_number` is one of the user "Required Attributes". When the phone number
is a required attribute, it becomes impossible for the user to choose SMS as
their MFA method. Only when `phone_number` is not required does Cognito
correctly prompt the user to choose SMS or Authenticator App during their first
login. At least this is how it was for our system which does not allow
self-registration but does not necessarily know phone numbers when a user is
created.

This seems pretty obviously like a bug in Cognito, but while I did try to urge a
support engineer to submit a bug report for me when I encountered this issue, I
am not confident that one was opened.

### An originating phone number

Cognito links to
[this documentation](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-originating-identities.html)
for creating an originating identity. We use a Toll-Free Origination Number.
Fortunately for me, I did not set this piece up, but then unfortunately for this
documentation, I don't have a summary of any hurdles that had to be overcome
here.

### Enabling SMS

Cognito links to
[this documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-sms-settings.html)
for setting up SMS for Cognito. In practice, it primarily involved following the
steps which Cognito suggests on the *Messaging* tab of the User Pool: moving SNS
out of Sandbox mode (just like SES) and requesting a limit increase (or a few
increases?) to SNS and possibly also Pinpoint and Pinpoint SMS.

Something that was a bit surprising was that even after following all the steps
and getting SMS correctly setup, there is still an *Info* box on the SMS part of
the Messaging page with advice for the steps necessary to set up SMS. For this
confusing UI, I believe an AWS support engineer did submit a request to change
it so the info box goes away when everything is correctly configured.

## Multiple truth sources

Unfortunately with the way the code ended up in two repos and with the different
AWS products, a few pieces of information must be manually duplicated in a few
places:
* The URL for this web app:
  1. Must be configured in Amplify as the `NEXT_PUBLIC_COGNITO_REDIRECT_URI`
     environment variable, as described in the README
  2. Must be configured in Cognito in the App Client of the User Pool as an
     *Allowed Callback URL*
  3. Must be configured in Cognito under Messaging as the URL in the *Invitation
     Message* template
* The User Pool ID and App Client ID:
  1. These must be configured as environment variables in the Lambda's
     serverless.yml file (the other repo)
  2. The App Client ID must be configured in Amplify as the
     `NEXT_PUBLIC_COGNITO_CLIENT_ID` environment variable, as described in the
     README
  3. Perhaps this should be removed, but they are sometimes referenced either by
     name or by ID in READMEs in both repos, and this should stay up-to-date
     with reality

## How to create a user?

To create a user who can receive a good temporary password in their invitation
email:
1. Go to the User Pool, under the "Users" tab press "*Create user*"
2. Choose "*Send an email invitation*"
3. Provide their email address
4. Set the email address as verified (otherwise the email won't be sent)
5. Select "*Generate a password*"
6. Press the button at the bottom "*Create user*"
