---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

SPEC: Use Cases (UC)
====================

USE-CASE: Join Event and Watch Stream {{join-event}}
-------------------------------------

-   ACTOR:          [[PERSONA:attendee]]
-   REQUIREMENTS:   [[FR.authentication]], [[FR.individual-url]], [[FR.user-consent]], [[FR.parallel-access]]
-   GOAL:           Authenticate and watch the live video stream of an event.
-   PRE-CONDITION:  The attendee holds an event URL and their email is granted access.
-   POST-CONDITION: The attendee holds an active session token and sees the stream.

The attendee opens the individual event URL, proves control of their
email via a one-time token, accepts any required consent, and is
admitted to the live stream while any prior session for the same user is
closed.

### SCENARIO: Successful Token Login {{join-event-token-login}}

-   TYPE: Main

1.  The attendee opens the individual event URL in a browser.
2.  The system shows the login dialog and optional login message.
3.  The attendee enters their email address.
4.  The system sends a six-digit authorization token to that email.
5.  The attendee enters the received token.
6.  The system validates the token and any required consent.
7.  The system issues a session token and closes any prior session of the user.
8.  The system grants the attendee access to the live video stream.

### SCENARIO: Automatic Token in URL {{join-event-auto}}

-   TYPE: Alternative

1.  The attendee opens an event URL containing email and a pre-generated token.
2.  The system validates the embedded token against the event settings.
3.  The system issues a session token without showing a login dialog.
4.  The system grants the attendee access to the live video stream.

### SCENARIO: Email Not Authorized {{join-event-denied}}

-   TYPE: Exceptional

1.  The attendee opens the event URL and enters their email.
2.  The system finds the email neither on the access list nor matching the access pattern.
3.  The system denies access and informs the attendee that they are not authorized.

USE-CASE: Ask a Question {{ask-question}}
------------------------

-   ACTOR:          [[PERSONA:attendee]]
-   REQUIREMENTS:   [[FR.questions]], [[FR.question-tags]], [[FR.moderation]]
-   GOAL:           Submit a question for the Q&A round.
-   PRE-CONDITION:  The attendee has an active session and questions are enabled.
-   POST-CONDITION: The question is stored and, depending on moderation, pending or accepted.

The attendee writes a question, optionally tags it, and submits it; the system stores it and routes it through moderation if
the event requires approval before it becomes visible.

### SCENARIO: Submit Moderated Question {{ask-question-moderated}}

-   TYPE: Main

1.  The attendee opens the questions panel.
2.  The attendee types a question and optionally selects predefined tags.
3.  The attendee submits the question.
4.  The system stores the question in state pending.
5.  The system shows the question to moderators for approval.

### SCENARIO: Auto-Accepted by Sentiment {{ask-question-auto}}

-   TYPE: Alternative

1.  The attendee submits a question.
2.  The system runs server-side sentiment analysis on the text.
3.  The system finds the sentiment proper and auto-accept is enabled.
4.  The system stores the question directly in state accepted.

### SCENARIO: Throttled Submission {{ask-question-throttled}}

-   TYPE: Exceptional

1.  The attendee submits questions in rapid succession.
2.  The system detects the per-minute limit is exceeded.
3.  The system rejects the new submission and informs the attendee to wait.

USE-CASE: Moderate and Forward Messages {{moderate}}
---------------------------------------

-   ACTOR:          [[PERSONA:moderator-qa]]
-   REQUIREMENTS:   [[FR.moderation]], [[FR.forward-presenter]], [[FR.sort-filter]], [[FR.presenter-hints]]
-   GOAL:           Approve, reject, and forward attendee input to the presenter.
-   PRE-CONDITION:  The event is running and the moderator has the Moderator role.
-   POST-CONDITION: Messages are accepted, rejected, or forwarded with optional hints.

The moderator reviews pending messages on a Kanban board, approves or rejects them, forwards selected approved questions to
the presenter in a chosen order, and may attach hints or raise a presenter alert.

### SCENARIO: Approve and Forward Question {{moderate-forward}}

-   TYPE: Main

1.  The moderator filters the board to pending questions.
2.  The moderator approves a relevant question, setting it accepted.
3.  The moderator forwards the accepted question to the presenter.
4.  The moderator optionally attaches a hint for the presenter.
5.  The system places the forwarded question in the presenter's work basket and locks it from editing.

### SCENARIO: Reject Improper Message {{moderate-reject}}

-   TYPE: Alternative

1.  The moderator selects a pending message.
2.  The moderator rejects the message.
3.  The system sets the message to rejected and hides it from the audience.

USE-CASE: Switch Streaming Provider {{switch-provider}}
-----------------------------------

-   ACTOR:          [[PERSONA:manager]]
-   REQUIREMENTS:   [[FR.multi-provider]], [[FR.provider-switch]], [[FR.config-propagation]]
-   GOAL:           Change the active streaming provider during a running event.
-   PRE-CONDITION:  The event runs and the channel has multiple configured resources.
-   POST-CONDITION: A new resource is active and all clients follow it automatically.

When a provider has problems, the manager activates a fallback resource on the channel and the system propagates the change
so attendee clients switch streams without any user interaction.

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
-   REQUIREMENTS:   [[FR.ventari-import]], [[FR.ventari-export]], [[FR.event-portability]]
-   GOAL:           Provision an event's attendees and return their access URLs.
-   PRE-CONDITION:  The manager has a Ventari Excel sheet and an event to populate.
-   POST-CONDITION: The access list and tokens are created and URLs returned to Ventari.

The manager imports the Ventari Excel sheet to fill the event access list and generate authorization tokens, then exports an
Excel sheet of personal access URLs back to Ventari, avoiding duplicate invitations on repeated imports.

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
-   REQUIREMENTS:   [[FR.export-inputs]], [[FR.event-stats]]
-   GOAL:           Obtain the recorded interaction of a finished event.
-   PRE-CONDITION:  The event has finished and the manager retains the Manager role.
-   POST-CONDITION: An export file of anonymized messages and statistics is produced.

After the event finishes and personal data is anonymized, the manager exports all attendee inputs with timestamps, states,
like counts, and texts, together with the event statistics.

### SCENARIO: Export After Finish {{export-data-after}}

-   TYPE: Main

1.  The manager opens the finished event in the management screen.
2.  The manager triggers the export of attendee inputs.
3.  The system produces a file containing timestamp, state, likes, and text per message.
4.  The manager downloads the export file.

USE-CASE: Present Forwarded Questions {{present}}
-------------------------------------

-   ACTOR:          [[PERSONA:presenter]]
-   REQUIREMENTS:   [[FR.forward-presenter]], [[FR.presenter-dashboard]], [[FR.presenter-hints]]
-   GOAL:           Process forwarded questions live on stage.
-   PRE-CONDITION:  The event is running and questions have been forwarded.
-   POST-CONDITION: Processed questions are marked answered or suspended.

The presenter views the forwarded questions in their intended order with any moderator hints, addresses them on stage, and
marks each as answered or suspended.

### SCENARIO: Answer Forwarded Question {{present-answer}}

-   TYPE: Main

1.  The presenter views the ordered list of forwarded questions and hints.
2.  The presenter addresses a question live on stage.
3.  The presenter marks the question as answered.
4.  The system records the answered timestamp and removes it from the active basket.
