---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

SPEC: State Model (SM)
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

-   publish; FROM: [[STATE:Planning]]; TO: [[STATE:Published]];
    The event becomes visible to invited attendees,
    **WHEN** the manager publishes the configured event.

-   start; FROM: [[STATE:Published]]; TO: [[STATE:Running]];
    The live stream and interaction channels open for attendees,
    **WHEN** the manager starts the event.

-   start; FROM: [[STATE:Planning]]; TO: [[STATE:Running]];
    The event goes live directly from planning,
    **WHEN** the manager starts an unpublished event.

-   finish; FROM: [[STATE:Running]]; TO: [[STATE:Finished]];
    The anonymization procedure runs and access is closed,
    **WHEN** the manager finishes the event.

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

-   `accept`; FROM: [[STATE:Pending]]; TO: [[STATE:Accepted]];
    The message becomes visible to the audience,
    **WHEN** a moderator approves it or sentiment auto-accept applies.

-   `reject`; FROM: [[STATE:Pending]]; TO: [[STATE:Rejected]];
    The message is hidden and marked for deletion,
    **WHEN** a moderator declines it or sentiment auto-reject applies.

-   `forward`; FROM: [[STATE:Accepted]]; TO: [[STATE:Forwarded]];
    The message enters the presenter's work basket and becomes immutable,
    **WHEN** a moderator forwards it to the presenter.

-   `answer`; FROM: [[STATE:Forwarded]]; TO: [[STATE:Answered]];
    The answered timestamp is recorded,
    **WHEN** the presenter or moderator marks the message as answered on stage.

-   `suspend`; FROM: [[STATE:Forwarded]]; TO: [[STATE:Suspended]];
    The message is set aside for the live event,
    **WHEN** the presenter or moderator decides not to process it.

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

-   `send`; FROM: [[STATE:Issued]]; TO: [[STATE:Sent]];
    The token is emailed to the user,
    **WHEN** the user requests a login challenge.

-   `consume`; FROM: [[STATE:Sent]]; TO: [[STATE:Used]];
    The token is marked spent,
    **WHEN** the user submits it in a successful or unsuccessful login attempt.

-   `consume`; FROM: [[STATE:Issued]]; TO: [[STATE:Used]];
    The pre-generated token is marked spent,
    **WHEN** an automatic-access URL carrying the token is used.
