describe("Initial navigation", () => {
  ["/", "/?cold=123", "/?code="].forEach((basePath) => {
    it(`should send you to the Hosted UI if 'code' is not a parameter (url: '${basePath}')`, () => {
      cy.intercept({ pathname: "/login" }, { fixture: "hostedUiLoginPage" }).as(
        "loginRedirect",
      );
      cy.visit(basePath);

      cy.wait("@loginRedirect").then((interceptor) => {
        const queryKeys = Object.keys(interceptor.request.query);
        expect(queryKeys).contains("client_id");
        expect(queryKeys).contains("redirect_uri");
        expect(queryKeys).contains("response_type");
        expect(queryKeys).contains("scope");
      });

      cy.origin("https://example.com", () => {
        cy.contains("Sign in with your email and password");
      });
    });
  });
});

describe("Happy paths", () => {
  it("uses the 'code' query parameter as the 'code' body parameter in a token fetch request", () => {
    cy.intercept("POST", "**/oauth2/token", {
      fixture: "token/noCallCenters",
    }).as("tokenFetch");

    cy.visit("/?code=abc123");
    cy.wait("@tokenFetch").then((interceptor) => {
      const bodyParams = new URLSearchParams(interceptor.request.body);
      expect(bodyParams.get("code")).equals("abc123");
    });
  });

  it("shows an error if the user has no configured call centers", () => {
    cy.intercept("POST", "**/oauth2/token", {
      fixture: "token/noCallCenters",
    }).as("tokenFetch");
    cy.visit("/?code=123");
    cy.wait("@tokenFetch");
    cy.contains("Error");
  });

  it("automatically reaches a 'Connecting' page when a user has one configured call center", () => {
    cy.intercept("POST", "**/oauth2/token", {
      fixture: "token/oneCallCenter",
    }).as("tokenFetch");
    cy.intercept("GET", "**/generateSaml/*", {
      fixture: "saml/basic",
      delay: 5000,
    });
    cy.intercept("POST", "**/saml", {
      fixture: "postSamlFormPage",
    });

    cy.visit("/?code=123");
    cy.wait("@tokenFetch");
    cy.contains("Connecting");
  });

  it("automatically generates and POSTs SAML if the user has one configured call center", () => {
    cy.intercept("POST", "**/oauth2/token", {
      fixture: "token/oneCallCenter",
    }).as("tokenFetch");
    cy.intercept("GET", "**/generateSaml/*", {
      fixture: "saml/basic",
    }).as("samlFetch");
    cy.intercept("POST", "**/saml", {
      fixture: "postSamlFormPage",
    }).as("samlPostToAws");

    cy.visit("/?code=123");
    cy.wait("@tokenFetch");
    cy.wait("@samlFetch");
    cy.wait("@samlPostToAws");
    cy.contains("You POSTed the SAML details");
  });

  it("loads the call center picker if the user has multiple call centers configured, POSTs SAML when one call center is picked", () => {
    cy.intercept("POST", "**/oauth2/token", {
      fixture: "token/threeCallCenters",
    }).as("tokenFetch");
    cy.visit("/?code=123");
    cy.wait("@tokenFetch");
    cy.contains("Choose a Call Center");
    cy.get("button").should("be.disabled");

    cy.intercept("GET", "**/generateSaml/*", {
      fixture: "saml/basic",
    }).as("samlFetch");
    cy.intercept("POST", "**/saml", {
      fixture: "postSamlFormPage",
    }).as("samlPostToAws");

    cy.get("input").parent("div").contains("callcenter1").click();
    cy.get("button").should("not.be.disabled");
    cy.get("button").click();
    cy.wait("@samlFetch");
    cy.wait("@samlPostToAws");
    cy.contains("You POSTed the SAML details");
  });
});

describe("Error paths", () => {
  [400, 500].forEach((statusCode) => {
    it(`gives an error page when the token-fetch returns an error status: ${statusCode}`, () => {
      cy.intercept("POST", "**/oauth2/token", {
        statusCode,
      }).as("tokenFetch");
      cy.visit("/?code=123");
      cy.wait("@tokenFetch");
      cy.contains("Error");
      cy.contains("Have you tried logging in again");
    });

    it(`gives an error page when the single call center 'generateSaml' invocation returns an error status: ${statusCode}`, () => {
      cy.intercept("POST", "**/oauth2/token", {
        fixture: "token/oneCallCenter",
      }).as("tokenFetch");
      cy.intercept("GET", "**/generateSaml/*", {
        statusCode,
      }).as("samlFetch");
      cy.visit("/?code=123");
      cy.wait("@tokenFetch");
      cy.wait("@samlFetch");
      cy.contains("Error: SAML Lambda response status");
    });

    it(`gives an error page when the multi call center 'generateSaml' invocation returns an error status: ${statusCode}`, () => {
      cy.intercept("POST", "**/oauth2/token", {
        fixture: "token/threeCallCenters",
      }).as("tokenFetch");
      cy.intercept("GET", "**/generateSaml/*", {
        statusCode,
      }).as("samlFetch");
      cy.visit("/?code=123");
      cy.wait("@tokenFetch");

      cy.contains("Choose a Call Center");
      cy.get("input").parent("div").contains("callcenter1").click();
      cy.get("button").click();

      cy.wait("@samlFetch");
      cy.contains("Error: SAML Lambda response status");
    });
  });

  it("gives an error page if the 'generateSaml' response contains a non-SUCCESS status", () => {
    cy.intercept("POST", "**/oauth2/token", {
      fixture: "token/oneCallCenter",
    }).as("tokenFetch");
    cy.intercept("GET", "**/generateSaml/*", {
      fixture: "saml/error",
    }).as("samlFetch");
    cy.visit("/?code=123");
    cy.wait("@tokenFetch");
    cy.wait("@samlFetch");
    cy.contains("Error:");
    cy.contains("The system had an error");
  });
});

// Prevent TypeScript from reading file as legacy script
export {};
