---
Created:  2026-11-01 12:00
Modified: 2026-11-01 12:00
---

#   ARCH: Runtime View (RV)

##  INTERACTION: Login with Emailed Token {{login}}

-   REALIZES:       [[SCENARIO:authenticate-token]]

The attendee proves control of their email address through a one-time token, which the authentication module issues,
mails, and finally exchanges for a session token, BECAUSE the token round-trip through the external email gateway is
the one place where the login depends on a system outside of the solution.

### MESSAGE

-   enter email; FROM: [[ROLE:attendee]]; TO: [[FV.client]]; KIND: Signal;
    The attendee enters their email address into the login dialog.

-   request token; FROM: [[FV.client]]; TO: [[FV.relay]]; DURATION: < 2s;
    The web client requests a one-time token over the MQTT request/response channel.

-   forward token request; FROM: [[FV.relay]]; TO: [[FV.auth]];
    The relay forwards the request to the authentication module of the service.

-   store token; FROM: [[FV.auth]]; TO: [[FV.database]];
    The authentication module stores the hashed six-digit token with its expiry.

-   token stored; FROM: [[FV.database]]; TO: [[FV.auth]]; KIND: Return;
    The database confirms the stored token.

-   mail token; FROM: [[FV.auth]]; TO: [[CV.email]]; KIND: Signal;
    The authentication module hands the token mail over to the email gateway.

-   token issued; FROM: [[FV.auth]]; TO: [[FV.relay]]; KIND: Return;
    The authentication module reports the issued token without revealing it.

-   token requested; FROM: [[FV.relay]]; TO: [[FV.client]]; KIND: Return;
    The relay answers the original request, so the client asks for the token.

-   enter token; FROM: [[ROLE:attendee]]; TO: [[FV.client]]; KIND: Signal;
    The attendee enters the token received by email.

-   validate token; FROM: [[FV.client]]; TO: [[FV.relay]]; DURATION: < 1s;
    The web client requests the validation of the token.

-   forward validation; FROM: [[FV.relay]]; TO: [[FV.auth]];
    The relay forwards the validation request to the authentication module.

-   open session; FROM: [[FV.auth]]; TO: [[FV.database]];
    The authentication module consumes the token, closes any prior session, and opens a new one.

-   session opened; FROM: [[FV.database]]; TO: [[FV.auth]]; KIND: Return;
    The database confirms the new session.

-   session issued; FROM: [[FV.auth]]; TO: [[FV.relay]]; KIND: Return;
    The authentication module returns the session token.

-   session token; FROM: [[FV.relay]]; TO: [[FV.client]]; KIND: Return;
    The relay delivers the session token, which the web client keeps for all further requests.

##  INTERACTION: Ask a Moderated Question {{ask}}

-   REALIZES:       [[SCENARIO:ask-question-moderated]]

The attendee submits a question, which the client pre-checks locally and the service stores in state pending before it
notifies the moderators, BECAUSE the question has to pass two sentiment checks and the moderation gate before anybody
else sees it.

### MESSAGE

-   submit question; FROM: [[ROLE:attendee]]; TO: [[FV.client]]; KIND: Signal; TIME: t = submit;
    The attendee submits the written and optionally tagged question.

-   check sentiment; FROM: [[FV.client]]; TO: [[FV.client-nlp]];
    The web client lets its NLP module check the sentiment and language of the text locally.

-   sentiment acceptable; FROM: [[FV.client-nlp]]; TO: [[FV.client]]; KIND: Return;
    The NLP module finds the text acceptable for submission.

-   publish question; FROM: [[FV.client]]; TO: [[FV.relay]]; KIND: Signal;
    The web client publishes the question on the MQTT topic of the event.

-   deliver question; FROM: [[FV.relay]]; TO: [[FV.service]]; KIND: Signal;
    The relay delivers the published question to the service.

-   store pending question; FROM: [[FV.service]]; TO: [[FV.database]]; DURATION: < 100ms;
    The service checks the sentiment server-side and stores the question in state pending.

-   question stored; FROM: [[FV.database]]; TO: [[FV.service]]; KIND: Return;
    The database confirms the stored question.

-   notify moderators; FROM: [[FV.service]]; TO: [[FV.relay]]; KIND: Signal;
    The service publishes the pending question on the moderation topic.

-   push pending question; FROM: [[FV.relay]]; TO: [[FV.client]]; KIND: Signal;
    The relay pushes the pending question to the web clients of the moderators.

-   show for approval; FROM: [[FV.client]]; TO: [[ROLE:moderator]]; KIND: Signal; TIME: t < submit + 1s;
    The moderator sees the pending question in the moderation queue.

##  INTERACTION: Approve and Forward Question {{forward}}

-   REALIZES:       [[SCENARIO:moderate-forward]]

The moderator approves a pending question and forwards it to the presenter, whose work basket receives it locked from
editing, BECAUSE the presenter only ever sees questions a moderator explicitly curated.

### MESSAGE

-   approve and forward; FROM: [[ROLE:moderator]]; TO: [[FV.client]]; KIND: Signal;
    The moderator approves the question and forwards it to the presenter with an optional hint.

-   update question; FROM: [[FV.client]]; TO: [[FV.relay]];
    The web client requests the state change of the question.

-   forward update; FROM: [[FV.relay]]; TO: [[FV.service]];
    The relay forwards the request to the service.

-   accept and lock; FROM: [[FV.service]]; TO: [[FV.database]];
    The service sets the question accepted, places it in the work basket, and locks it from editing.

-   question locked; FROM: [[FV.database]]; TO: [[FV.service]]; KIND: Return;
    The database confirms the updated question.

-   update done; FROM: [[FV.service]]; TO: [[FV.relay]]; KIND: Return;
    The service confirms the state change.

-   update confirmed; FROM: [[FV.relay]]; TO: [[FV.client]]; KIND: Return;
    The relay confirms the state change to the web client of the moderator.

-   publish basket; FROM: [[FV.service]]; TO: [[FV.relay]]; KIND: Signal;
    The service publishes the changed work basket of the presenter.

-   push basket; FROM: [[FV.relay]]; TO: [[FV.client]]; KIND: Signal;
    The relay pushes the work basket to the web client of the presenter.

-   show forwarded question; FROM: [[FV.client]]; TO: [[ROLE:presenter]]; KIND: Signal;
    The presenter sees the forwarded question with its hint in the work basket.
