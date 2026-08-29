---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

SPEC: Test Cases (TC)
=====================

##  TEST-CASE: Valid Token Grants Access {{valid-token}}

-   VERIFIES:       [[FR.authentication]], [[SCENARIO:authenticate-token]]
-   PRE-CONDITION:  An invited user with a sent, unexpired authorization token exists for a running event.
-   INPUT:          The user submits the correct six-digit token for their email.
-   EXPECTED:       The system issues a session token and grants access to the stream.
-   POST-CONDITION: The authorization token is in state used.

##  TEST-CASE: Unauthorized Email Rejected {{unauthorized}}

-   VERIFIES:       [[FR.authentication]], [[SCENARIO:authenticate-denied]]
-   PRE-CONDITION:  An email not on the access list and not matching the access pattern.
-   INPUT:          The user enters that email in the login dialog.
-   EXPECTED:       The system denies access and shows a not-authorized notice.
-   POST-CONDITION: No session token exists and no authorization token was sent for the email.

##  TEST-CASE: URL Token Skips Login Dialog {{auto-token}}

-   VERIFIES:       [[FR.automatic-url]], [[SCENARIO:authenticate-auto]]
-   PRE-CONDITION:  An event allows URL tokens and a pre-generated token exists for an invited email.
-   INPUT:          The user opens the event URL carrying that email and token.
-   EXPECTED:       The system issues a session token and grants access without showing the login dialog.
-   POST-CONDITION: The user holds an active session token.

##  TEST-CASE: Second Login Closes First Session {{single-session}}

-   VERIFIES:       [[FR.parallel-access]]
-   PRE-CONDITION:  A user holds an active session for an event from one device.
-   INPUT:          The same user completes a login from a second device.
-   EXPECTED:       The first connection is closed and only the new session remains active.
-   POST-CONDITION: Exactly one active session token exists for the user and event.

##  TEST-CASE: Moderated Question Starts Pending {{moderated-pending}}

-   VERIFIES:      [[FR.moderation]], [[SCENARIO:ask-question-moderated]]
-   PRE-CONDITION: An event with question moderation enabled is running.
-   INPUT:         An attendee submits a question.
-   EXPECTED:      The question is stored in state pending and is not visible to the audience.

##  TEST-CASE: Unmoderated Chat Starts Accepted {{unmoderated-accepted}}

-   VERIFIES:      [[FR.moderation]]
-   PRE-CONDITION: An event with chat moderation disabled is running.
-   INPUT:         An attendee submits a chat message.
-   EXPECTED:      The message is stored in state accepted and is immediately visible.

##  TEST-CASE: Forwarded Message Is Locked {{forward-lock}}

-   VERIFIES:      [[FR.message-editing]]
-   PRE-CONDITION: An accepted question has been forwarded to the presenter.
-   INPUT:         The original attendee attempts to edit or delete the message.
-   EXPECTED:      The system refuses the edit and the message remains unchanged.

##  TEST-CASE: Sentiment Auto-Reject Below Threshold {{sentiment-reject}}

-   VERIFIES:      [[FR.server-sentiment]]
-   PRE-CONDITION: Server-side sentiment analysis and auto-reject are enabled.
-   INPUT:         An attendee submits a message scoring -0.5.
-   EXPECTED:      The system stores the message directly in state rejected.

##  TEST-CASE: Sentiment Auto-Accept Above Threshold {{sentiment-accept}}

-   VERIFIES:      [[FR.server-sentiment]], [[SCENARIO:ask-question-auto]]
-   PRE-CONDITION: Server-side sentiment analysis and auto-accept are enabled for a moderated event.
-   INPUT:         An attendee submits a question scoring +0.5.
-   EXPECTED:      The system stores the question directly in state accepted, bypassing moderation.

##  TEST-CASE: Throttled Submission Not Stored {{throttled}}

-   VERIFIES:       [[NR.throttling]], [[SCENARIO:ask-question-throttled]]
-   PRE-CONDITION:  An attendee has already submitted the per-minute maximum of questions within the current minute.
-   INPUT:          The attendee submits one more question.
-   EXPECTED:       The system rejects the submission and informs the attendee to wait.
-   POST-CONDITION: The rejected question is not stored and the earlier questions remain unchanged.

##  TEST-CASE: Live Provider Switch Propagates {{provider-switch}}

-   VERIFIES:       [[FR.provider-switch]]
-   PRE-CONDITION:  A running event with two configured resources and connected clients.
-   INPUT:          The manager activates the second resource on the channel.
-   EXPECTED:       All connected clients switch to the new stream without user interaction.
-   POST-CONDITION: Exactly one resource of the channel is active.

##  TEST-CASE: Config Change Reaches Clients {{config-propagation}}

-   VERIFIES:      [[FR.config-propagation]]
-   PRE-CONDITION: A running event with connected clients and chat disabled.
-   INPUT:         The manager enables chat for the event.
-   EXPECTED:      Connected clients show the chat panel within 2 seconds without a reload.

##  TEST-CASE: Ventari Import Avoids Duplicates {{ventari-dedup}}

-   VERIFIES:      [[FR.ventari-import]]
-   PRE-CONDITION: An event whose access list already contains some imported emails.
-   INPUT:         The manager imports a Ventari sheet overlapping the existing emails.
-   EXPECTED:      Existing users are not duplicated and their prior tokens are returned.

##  TEST-CASE: Returned URL Format {{url-format}}

-   VERIFIES:      [[FR.ventari-export]]
-   PRE-CONDITION: A Ventari import has generated tokens for new users.
-   INPUT:         The manager exports the access URLs.
-   EXPECTED:      Each URL contains event, user, and a six-digit "NNN-NNN" token in the URL column.

##  TEST-CASE: Anonymization Removes Personal Data {{anonymize}}

-   VERIFIES:       [[FR.user-consent]]
-   PRE-CONDITION:  A running event with messages, likes, tokens, and an access list.
-   INPUT:          The manager finishes the event.
-   EXPECTED:       Sender names become "Anonymous", likes become bare counts, and tokens, users, and Moderator roles are deleted.
-   POST-CONDITION: No personal attendee data remains and Manager roles are retained.

##  TEST-CASE: Export Contains Required Fields {{export-fields}}

-   VERIFIES:      [[FR.export-inputs]]
-   PRE-CONDITION: A finished, anonymized event with messages.
-   INPUT:         The manager exports the attendee inputs.
-   EXPECTED:      The export includes at least timestamp, state, number of likes, and message text per message.

##  TEST-CASE: Concurrent Attendee Load {{load}}

-   VERIFIES:      [[NR.attendee-scale]]
-   PRE-CONDITION: A running event deployed with scaled proxy, relay, and server instances.
-   INPUT:         10000 simulated attendees connect simultaneously and interact.
-   EXPECTED:      All connections are served and message round-trips remain responsive under load.
