---
Created:  2026-06-18 10:18
Modified: 2026-08-29 12:00
---

SPEC: Use Cases (UC)
====================

USE-CASE: Join Event and Watch Stream {{join-event}}
-------------------------------------

-   ACTOR:          [[PERSONA:attendee]]
-   JOURNEY:        [[STEP:arrival]], [[STEP:participate]]
-   REQUIREMENTS:   [[FR.individual-url]], [[FR.authentication]]
-   INCLUDES:       [[USE-CASE:authenticate]]
-   PRE-CONDITION:  The attendee holds an event URL and their email is granted access.
-   TRIGGER:        The attendee opens the individual event URL received by invitation.
-   POST-CONDITION: The attendee holds an active session token and sees the stream.

The attendee opens the individual event URL, authenticates via their
email, and is admitted to the live stream of the event, BECAUSE watching
the live stream is the very reason the attendee was invited.

### SCENARIO: Join via Individual URL {{join-event-watch}}

-   TYPE: Main

1.  The attendee opens the individual event URL in a browser.
2.  The attendee authenticates ([[USE-CASE:authenticate]]).
3.  The system grants the attendee access to the live video stream.

USE-CASE: Authenticate via Email Token {{authenticate}}
--------------------------------------

-   ACTOR:          [[PERSONA:attendee]]
-   JOURNEY:        [[STEP:authenticate]]
-   REQUIREMENTS:   [[FR.authentication]], [[FR.user-consent]], [[FR.parallel-access]]
-   PRE-CONDITION:  The attendee's email is granted access to the event.
-   TRIGGER:        The attendee requests access to an event without holding an active session.
-   POST-CONDITION: The attendee holds an active session token and any prior session of the same user is closed.

The attendee proves control of their email via a one-time token,
accepts any required consent, and receives a session while any prior
session for the same user is closed; this flow is included by every use
case requiring an authenticated attendee, BECAUSE only a proven identity
entitles the attendee to the event they were invited to.

### SCENARIO: Login with Emailed Token {{authenticate-token}}

-   TYPE: Main

1.  The system asks for the email address and presents the optional login message.
2.  The attendee enters their email address.
3.  The system sends a six-digit authorization token to that email.
4.  The attendee enters the received token.
5.  The system validates the token and any required consent.
6.  The system issues a session token and closes any prior session of the user.

### SCENARIO: Automatic Token in URL {{authenticate-auto}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The attendee holds an active session token, obtained without entering email or token.

1.  The system finds the email and a pre-generated token embedded in the event URL.
2.  The system validates the embedded token against the event settings.
3.  The system issues a session token without asking for the email address.

### SCENARIO: Email Not Authorized {{authenticate-denied}}

-   TYPE:         Exceptional
-   RESULT:       Resume
-   AT-MAIN-STEP: 3
-   OUTCOME:      No session exists and no token was sent, and the attendee may retry with another email address (resumes at step 1).

3.  The system finds the email neither on the access list nor matching the access pattern.
4.  The system denies access and informs the attendee that they are not authorized.

USE-CASE: Ask a Question {{ask-question}}
------------------------

-   ACTOR:          [[PERSONA:attendee]]
-   JOURNEY:        [[STEP:participate]]
-   REQUIREMENTS:   [[FR.questions]], [[FR.question-tags]], [[FR.moderation]]
-   PRE-CONDITION:  The attendee has an active session and questions are enabled.
-   TRIGGER:        The attendee decides to raise a question during the running event.
-   POST-CONDITION: The question is stored in state pending and awaits moderation.

The attendee writes a question, optionally tags it, and submits it; the system stores it and routes it through moderation if
the event requires approval before it becomes visible, BECAUSE getting their own question answered turns the attendee from a
passive viewer into a participant.

### SCENARIO: Submit Moderated Question {{ask-question-moderated}}

-   TYPE: Main

1.  The attendee starts a new question.
2.  The attendee writes the question and optionally assigns predefined tags.
3.  The attendee submits the question.
4.  The system stores the question in state pending.
5.  The system shows the question to moderators for approval.

### SCENARIO: Auto-Accepted by Sentiment {{ask-question-auto}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 4
-   OUTCOME:      The question is stored in state accepted and visible to the audience without moderation.

4.  The system runs server-side sentiment analysis on the text.
5.  The system finds the sentiment proper and auto-accept is enabled.
6.  The system stores the question directly in state accepted.

### SCENARIO: Throttled Submission {{ask-question-throttled}}

-   TYPE:         Exceptional
-   RESULT:       Failure
-   AT-MAIN-STEP: 4
-   OUTCOME:      The question is not stored, and the attendee may submit it again once the limit window has passed.

4.  The system detects that the attendee exceeded the per-minute submission limit.
5.  The system rejects the new submission and informs the attendee to wait.

USE-CASE: Moderate and Forward Messages {{moderate}}
---------------------------------------

-   ACTOR:          [[PERSONA:moderator-qa]]
-   JOURNEY:        [[STEP:support]]
-   REQUIREMENTS:   [[FR.moderation]], [[FR.forward-presenter]], [[FR.sort-filter]], [[FR.presenter-hints]]
-   PRE-CONDITION:  The event is running and the moderator has the Moderator role.
-   TRIGGER:        An attendee message arrives in state pending for moderation.
-   POST-CONDITION: Messages are accepted, rejected, or forwarded with optional hints.

The moderator reviews the pending messages by state, approves or rejects them, forwards selected approved questions to the
presenter in a chosen order, and may attach hints or raise a presenter alert, BECAUSE the presenter can only handle a
curated, ordered selection of the audience input while on stage.

### SCENARIO: Approve and Forward Question {{moderate-forward}}

-   TYPE: Main

1.  The moderator narrows the messages down to the pending questions.
2.  The moderator approves a relevant question, setting it accepted.
3.  The moderator forwards the accepted question to the presenter.
4.  The moderator optionally attaches a hint for the presenter.
5.  The system places the forwarded question in the presenter's work basket and locks it from editing.

### SCENARIO: Reject Improper Message {{moderate-reject}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 2
-   OUTCOME:      The message is in state rejected and hidden from the audience, without reaching the presenter.

2.  The moderator rejects an improper message.
3.  The system sets the message to rejected and hides it from the audience.

USE-CASE: Switch Streaming Provider {{switch-provider}}
-----------------------------------

-   ACTOR:          [[PERSONA:manager]]
-   JOURNEY:        [[STEP:configure]]
-   REQUIREMENTS:   [[FR.multi-provider]], [[FR.provider-switch]], [[FR.config-propagation]]
-   PRE-CONDITION:  The event runs and the channel has multiple configured resources.
-   TRIGGER:        The active streaming resource shows problems during a running event.
-   POST-CONDITION: A new resource is active and all clients follow it automatically.

When a provider has problems, the manager activates a fallback resource on the channel and the system propagates the change
so attendee clients switch streams without any user interaction, BECAUSE a live event cannot be paused while a streaming
provider recovers.

### SCENARIO: Live Failover {{switch-provider-failover}}

-   TYPE: Main

1.  The manager observes streaming problems with the active resource.
2.  The manager activates a different configured resource on the channel.
3.  The system marks the new resource active and the old one inactive.
4.  The system propagates the change to all connected clients.
5.  The attendee clients switch to the new stream without user interaction.

USE-CASE: Create Event from Ventari Import {{create-event}}
------------------------------------------

-   ACTOR:          [[PERSONA:manager]]
-   JOURNEY:        [[STEP:configure]]
-   REQUIREMENTS:   [[FR.ventari-import]], [[FR.ventari-export]], [[FR.event-portability]]
-   PRE-CONDITION:  The manager has a Ventari Excel sheet and an event to populate.
-   TRIGGER:        Ventari delivers the Excel sheet of the attendees of an upcoming event.
-   POST-CONDITION: The access list and tokens are created and URLs returned to Ventari.

The manager imports the Ventari Excel sheet to fill the event access list and generate authorization tokens, then exports an
Excel sheet of personal access URLs back to Ventari, avoiding duplicate invitations on repeated imports, BECAUSE provisioning
hundreds of attendees by hand is error-prone and does not scale.

### SCENARIO: Import and Return URLs {{create-event-import}}

-   TYPE: Main

1.  The manager uploads the Ventari Excel sheet to the event.
2.  The system creates access-list users for new emails and skips existing ones.
3.  The system generates a "NNN-NNN" authorization token per user in state issued.
4.  The system composes each user's personal access URL with event, user, and token.
5.  The system returns an Excel sheet with the URL column filled to Ventari.

USE-CASE: Export Anonymized Event Data {{export-data}}
--------------------------------------

-   ACTOR:          [[PERSONA:manager]]
-   JOURNEY:        [[STEP:export]]
-   REQUIREMENTS:   [[FR.export-inputs]], [[FR.event-stats]]
-   PRE-CONDITION:  The event has finished and the manager retains the Manager role.
-   TRIGGER:        The manager is asked to hand over the recorded interaction of a finished event.
-   POST-CONDITION: An export file of anonymized messages and statistics is produced.

After the event finishes and personal data is anonymized, the manager exports all attendee inputs with timestamps, states,
like counts, and texts, together with the event statistics, BECAUSE the organizer evaluates the event and answers open
questions afterwards from this record.

### SCENARIO: Export After Finish {{export-data-after}}

-   TYPE: Main

1.  The manager selects the finished event.
2.  The manager triggers the export of attendee inputs.
3.  The system produces a file containing timestamp, state, likes, and text per message.
4.  The manager downloads the export file.

USE-CASE: Present Forwarded Questions {{present}}
-------------------------------------

-   ACTOR:          [[PERSONA:presenter]]
-   REQUIREMENTS:   [[FR.forward-presenter]], [[FR.presenter-dashboard]], [[FR.presenter-hints]]
-   PRE-CONDITION:  The event is running and questions have been forwarded.
-   TRIGGER:        The moderator forwards a question to the presenter.
-   POST-CONDITION: Processed questions are marked answered or suspended.

The presenter views the forwarded questions in their intended order with any moderator hints, addresses them on stage, and
marks each as answered or suspended, BECAUSE the presenter needs to keep track of what was already addressed while staying
focused on the audience.

### SCENARIO: Answer Forwarded Question {{present-answer}}

-   TYPE: Main

1.  The presenter views the ordered list of forwarded questions and hints.
2.  The presenter addresses a question live on stage.
3.  The presenter marks the question as answered.
4.  The system records the answered timestamp and removes it from the active basket.
