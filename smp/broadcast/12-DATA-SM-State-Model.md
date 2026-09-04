---
Created:  2026-06-18 10:18
Modified: 2026-09-05 00:30
---

DATA: State Model (SM)
======================

LIFECYCLE: Event {{event}}
--------------------------

-   ENTITY:  [[ENTITY:Event]]

### STATE

-   Planning; INITIAL: true;
    The event is created and configured but not visible to attendees.

-   Published;
    The event is visible to attendees but not yet started.

-   Running;
    The event is live and attendees can attend and interact.

-   Finished; FINAL: true;
    The event has ended, access is closed, and data is anonymized.

### TRANSITION

-   publish; FROM: [[STATE:Planning]]; TO: [[STATE:Published]]; ACTOR: [[ROLE:manager]];
    GUARD: The event is fully configured.;
    USE-CASES: [[USE-CASE:publish-start-finish]];
    The event becomes visible to invited attendees.

-   start; FROM: [[STATE:Published]]; TO: [[STATE:Running]]; ACTOR: [[ROLE:manager]];
    USE-CASES: [[USE-CASE:publish-start-finish]];
    The live stream and interaction channels open for attendees.

-   start {{start-unpublished}}; FROM: [[STATE:Planning]]; TO: [[STATE:Running]]; ACTOR: [[ROLE:manager]];
    USE-CASES: [[USE-CASE:publish-start-finish]];
    The event goes live directly from planning, without ever having been visible beforehand.

-   finish; FROM: [[STATE:Running]]; TO: [[STATE:Finished]]; ACTOR: [[ROLE:manager]];
    RULES: [[RULE:anonymize]];
    USE-CASES: [[USE-CASE:publish-start-finish]];
    The anonymization procedure runs and access is closed.

LIFECYCLE: Message {{message}}
------------------------------

-   ENTITY:  [[ENTITY:Message]]

### STATE

-   `Pending`; INITIAL: true;
    The attendee has submitted the message and it awaits moderation.

-   `Accepted`; FINAL: true;
    The message is approved and visible to the audience if configured.

-   `Rejected`; FINAL: true;
    The message is declined and will be deleted entirely on event finish.

-   `Forwarded`;
    The accepted message is handed to the presenter as a work item.

-   `Answered`; FINAL: true;
    The presenter has processed and answered the message in the live event.

-   `Suspended`; FINAL: true;
    The presenter will not process the message in the live event.

### TRANSITION

-   `accept`; FROM: [[STATE:Pending]]; TO: [[STATE:Accepted]]; ACTOR: [[ROLE:moderator]], System;
    GUARD: A system-triggered acceptance requires a sentiment score at or above the threshold.;
    RULES: [[RULE:moderation-gate]], [[RULE:sentiment-threshold]];
    USE-CASES: [[USE-CASE:ask-question]], [[USE-CASE:moderate]];
    The message becomes visible to the audience.

-   `reject`; FROM: [[STATE:Pending]]; TO: [[STATE:Rejected]]; ACTOR: [[ROLE:moderator]], System;
    GUARD: A system-triggered rejection requires a sentiment score below the threshold.;
    RULES: [[RULE:moderation-gate]], [[RULE:sentiment-threshold]];
    USE-CASES: [[USE-CASE:ask-question]], [[USE-CASE:moderate]];
    The message is hidden and marked for deletion.

-   `forward`; FROM: [[STATE:Accepted]]; TO: [[STATE:Forwarded]]; ACTOR: [[ROLE:moderator]];
    GUARD: The message is a question.;
    RULES: [[RULE:type-states]], [[RULE:forward-lock]];
    USE-CASES: [[USE-CASE:moderate]];
    The message enters the presenter's work basket and becomes immutable.

-   `answer`; FROM: [[STATE:Forwarded]]; TO: [[STATE:Answered]]; ACTOR: [[ROLE:presenter]], [[ROLE:moderator]];
    USE-CASES: [[USE-CASE:present]];
    The answered timestamp is recorded.

-   `suspend`; FROM: [[STATE:Forwarded]]; TO: [[STATE:Suspended]]; ACTOR: [[ROLE:presenter]], [[ROLE:moderator]];
    USE-CASES: [[USE-CASE:present]];
    The message is set aside for the live event.

LIFECYCLE: AuthorizationToken {{authtoken}}
-------------------------------------------

-   ENTITY:  [[ENTITY:AuthorizationToken]]

### STATE

-   `Issued`; INITIAL: true;
    The token has been generated, typically at event creation.

-   `Sent`;
    The token has been delivered to the user by email.

-   `Used`; FINAL: true;
    The token has been consumed in a login attempt.

### TRANSITION

-   `send`; FROM: [[STATE:Issued]]; TO: [[STATE:Sent]]; ACTOR: [[ROLE:attendee]];
    GUARD: The email of the attendee is on the access list or matches the access pattern.;
    RULES: [[RULE:access-grant]];
    USE-CASES: [[USE-CASE:authenticate]];
    The token is emailed to the attendee requesting a login challenge.

-   `consume`; FROM: [[STATE:Sent]]; TO: [[STATE:Used]]; ACTOR: [[ROLE:attendee]];
    GUARD: The token has not expired.;
    RULES: [[RULE:token-format]], [[RULE:single-session]];
    USE-CASES: [[USE-CASE:authenticate]];
    The token is marked spent by a successful or unsuccessful login attempt.

-   `consume {{consume-automatic}}`; FROM: [[STATE:Issued]]; TO: [[STATE:Used]]; ACTOR: [[ROLE:attendee]];
    GUARD: The event allows automatic-access URLs.;
    RULES: [[RULE:token-format]];
    USE-CASES: [[USE-CASE:authenticate]];
    The pre-generated token is marked spent by the use of an automatic-access URL carrying it.
