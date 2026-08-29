---
Created:  2026-06-18 10:18
Modified: 2026-08-29 14:25
---

SPEC: Test Cases (TC)
=====================

##  TEST-CASE: Valid Token Grants Access {{valid-token}}

-   VERIFIES:       [[FR.authentication]], [[SCENARIO:authenticate-token]], [[RULE:access-grant]]
-   PRE-CONDITION:  An invited user with a sent, unexpired authorization token exists for a running event.
-   INPUT:          The user submits the correct six-digit token for their email.
-   EXPECTED:       The system issues a session token and grants access to the stream.
-   POST-CONDITION: The authorization token is in state used.

##  TEST-CASE: Unauthorized Email Rejected {{unauthorized}}

-   VERIFIES:       [[FR.authentication]], [[SCENARIO:authenticate-denied]], [[RULE:access-grant]]
-   PRE-CONDITION:  An email not on the access list and not matching the access pattern.
-   INPUT:          The user enters that email in the login dialog.
-   EXPECTED:       The system denies access and shows a not-authorized notice.
-   POST-CONDITION: No session token exists and no authorization token was sent for the email.

##  TEST-CASE: URL Token Skips Login Dialog {{auto-token}}

-   VERIFIES:       [[FR.automatic-url]], [[SCENARIO:authenticate-auto]], [[RULE:token-format]]
-   PRE-CONDITION:  An event allows URL tokens and a pre-generated token exists for an invited email.
-   INPUT:          The user opens the event URL carrying that email and token.
-   EXPECTED:       The system issues a session token and grants access without showing the login dialog.
-   POST-CONDITION: The user holds an active session token.

##  TEST-CASE: Second Login Closes First Session {{single-session}}

-   VERIFIES:       [[FR.parallel-access]], [[RULE:single-session]]
-   PRE-CONDITION:  A user holds an active session for an event from one device.
-   INPUT:          The same user completes a login from a second device.
-   EXPECTED:       The first connection is closed and only the new session remains active.
-   POST-CONDITION: Exactly one active session token exists for the user and event.

##  TEST-CASE: Moderated Question Starts Pending {{moderated-pending}}

-   VERIFIES:      [[FR.moderation]], [[SCENARIO:ask-question-moderated]], [[RULE:moderation-gate]]
-   PRE-CONDITION: An event with question moderation enabled is running.
-   INPUT:         An attendee submits a question.
-   EXPECTED:      The question is stored in state pending and is not visible to the audience.

##  TEST-CASE: Unmoderated Chat Starts Accepted {{unmoderated-accepted}}

-   VERIFIES:      [[FR.moderation]], [[RULE:moderation-gate]]
-   PRE-CONDITION: An event with chat moderation disabled is running.
-   INPUT:         An attendee submits a chat message.
-   EXPECTED:      The message is stored in state accepted and is immediately visible.

##  TEST-CASE: Chat Cannot Enter Question States {{type-states}}

-   VERIFIES:       [[FR.moderation]], [[RULE:type-states]]
-   PRE-CONDITION:  An accepted chat message exists in a running event.
-   INPUT:          A moderator attempts to forward the chat message to the presenter.
-   EXPECTED:       The system refuses the transition, as a chat message permits only the states pending, accepted, and rejected.
-   POST-CONDITION: The chat message remains in state accepted.

##  TEST-CASE: Moderator Message Starts Accepted {{moderator-accept}}

-   VERIFIES:      [[FR.moderator-messages]], [[RULE:moderator-accept]]
-   PRE-CONDITION: An event with chat moderation enabled is running.
-   INPUT:         A moderator posts a chat message without overriding the sender name.
-   EXPECTED:      The message is stored directly in state accepted with the sender name "Moderator" and is immediately visible.

##  TEST-CASE: Forwarded Message Is Locked {{forward-lock}}

-   VERIFIES:      [[FR.message-editing]], [[RULE:forward-lock]]
-   PRE-CONDITION: An accepted question has been forwarded to the presenter.
-   INPUT:         The original attendee attempts to edit or delete the message.
-   EXPECTED:      The system refuses the edit and the message remains unchanged.

##  TEST-CASE: Sentiment Auto-Reject Below Threshold {{sentiment-reject}}

-   VERIFIES:      [[FR.server-sentiment]], [[RULE:sentiment-threshold]]
-   PRE-CONDITION: Server-side sentiment analysis and auto-reject are enabled.
-   INPUT:         An attendee submits a message scoring -0.5.
-   EXPECTED:      The system stores the message directly in state rejected.

##  TEST-CASE: Sentiment Auto-Accept Above Threshold {{sentiment-accept}}

-   VERIFIES:      [[FR.server-sentiment]], [[SCENARIO:ask-question-auto]], [[RULE:sentiment-threshold]]
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

-   VERIFIES:       [[FR.provider-switch]], [[RULE:single-resource]]
-   PRE-CONDITION:  A running event with two configured resources and connected clients.
-   INPUT:          The manager activates the second resource on the channel.
-   EXPECTED:       All connected clients switch to the new stream without user interaction.
-   POST-CONDITION: Exactly one resource of the channel is active.

##  TEST-CASE: Channel Activation Deactivates Previous {{single-channel}}

-   VERIFIES:       [[FR.provider-switch]], [[RULE:single-channel]]
-   PRE-CONDITION:  A running event with two configured channels, the first one active.
-   INPUT:          The manager activates the second channel.
-   EXPECTED:       The second channel becomes active and the first one is deactivated in the same step.
-   POST-CONDITION: Exactly one channel of the event is active.

##  TEST-CASE: Config Change Reaches Clients {{config-propagation}}

-   VERIFIES:      [[FR.config-propagation]]
-   PRE-CONDITION: A running event with connected clients and chat disabled.
-   INPUT:         The manager enables chat for the event.
-   EXPECTED:      Connected clients show the chat panel within 2 seconds without a reload.

##  TEST-CASE: Registration Import Avoids Duplicates {{registration-dedup}}

-   VERIFIES:      [[FR.registration-import]]
-   PRE-CONDITION: An event whose access list already contains some imported emails.
-   INPUT:         The manager imports a registration sheet overlapping the existing emails.
-   EXPECTED:      Existing users are not duplicated and their prior tokens are returned.

##  TEST-CASE: Returned URL Format {{url-format}}

-   VERIFIES:      [[FR.registration-export]], [[RULE:token-format]]
-   PRE-CONDITION: A registration import has generated tokens for new users.
-   INPUT:         The manager exports the access URLs.
-   EXPECTED:      Each URL contains event, user, and a six-digit "NNN-NNN" token in the URL column.

##  TEST-CASE: Anonymization Removes Personal Data {{anonymize}}

-   VERIFIES:       [[FR.user-consent]], [[RULE:anonymize]]
-   PRE-CONDITION:  A running event with messages, likes, tokens, and an access list.
-   INPUT:          The manager finishes the event.
-   EXPECTED:       Sender names become "Anonymous", likes become bare counts, and tokens, users, and Moderator roles are deleted.
-   POST-CONDITION: No personal attendee data remains and Manager roles are retained.

##  TEST-CASE: User Vanishes Without Role or Access {{no-accounts}}

-   VERIFIES:       [[RULE:no-accounts]]
-   PRE-CONDITION:  A user exists solely through the access list of a running event, holding no role.
-   INPUT:          The manager removes the user from the access list.
-   EXPECTED:       The user record is deleted together with the access list entry, as nothing else keeps it alive.
-   POST-CONDITION: No user record for the email address exists.

##  TEST-CASE: Export Contains Required Fields {{export-fields}}

-   VERIFIES:      [[FR.export-inputs]], [[RULE:like-count]]
-   PRE-CONDITION: A finished, anonymized event with messages.
-   INPUT:         The manager exports the attendee inputs.
-   EXPECTED:      The export includes at least timestamp, state, number of likes, and message text per message.

##  TEST-CASE: Manager Role Survives Finish {{manager-retained}}

-   VERIFIES:       [[FR.export-inputs]], [[SCENARIO:export-data-after]], [[RULE:manager-retained]]
-   PRE-CONDITION:  A running event with a manager role and a moderator role assigned.
-   INPUT:          The manager finishes the event.
-   EXPECTED:       The moderator role is deleted by the anonymization while the manager role remains and can still export the event data.
-   POST-CONDITION: The manager role exists until the event is deleted.

##  TEST-CASE: Chat Message Shows Configured Name {{name-appearance}}

-   VERIFIES:       [[FR.chat]], [[FR.name-appearance]], [[SCENARIO:chat-post]], [[RULE:moderation-gate]]
-   PRE-CONDITION:  A running event with chat enabled, chat moderation disabled, and the name appearance set to first name only.
-   INPUT:          An attendee sends a chat message.
-   EXPECTED:       The message appears in state accepted under the first name of the attendee, with the email address shown on hover.
-   POST-CONDITION: The message is stored as a chat in state accepted.

##  TEST-CASE: Like Toggles the Count {{like-toggle}}

-   VERIFIES:       [[FR.likes]], [[SCENARIO:chat-like]]
-   PRE-CONDITION:  A visible chat message of another attendee with a like count of 0.
-   INPUT:          An attendee likes the message and then undoes the like.
-   EXPECTED:       The like count reads 1 after the like and 0 again after the undo.
-   POST-CONDITION: No like of the attendee is recorded for the message.

##  TEST-CASE: Deleted Message Leaves Placeholder {{deleted-placeholder}}

-   VERIFIES:       [[FR.message-editing]], [[FR.deleted-placeholder]], [[SCENARIO:chat-delete]]
-   PRE-CONDITION:  An attendee has an accepted chat message between two other messages in the stream.
-   INPUT:          The attendee deletes their message.
-   EXPECTED:       The stream keeps the position of the message and shows a "This message was deleted" placeholder instead of its text.
-   POST-CONDITION: The message text is no longer retrievable by any attendee.

##  TEST-CASE: Client-Side Check Holds Back Improper Input {{client-block}}

-   VERIFIES:       [[FR.client-sentiment]], [[SCENARIO:ask-question-client]]
-   PRE-CONDITION:  A running event with client-side sentiment analysis enabled.
-   INPUT:          An attendee submits a question with clearly improper wording.
-   EXPECTED:       The client prevents the submission and informs the attendee, and no request reaches the server.
-   POST-CONDITION: No message exists for the submission.

##  TEST-CASE: Direct Moderator Reply Stays Private {{direct-reply}}

-   VERIFIES:       [[FR.answer-inputs]], [[SCENARIO:moderate-chat-answer]], [[RULE:moderator-accept]]
-   PRE-CONDITION:  A running event with a chat message of an attendee and a second attendee watching the stream.
-   INPUT:          The moderator replies to the message as a direct message.
-   EXPECTED:       The reply reaches the addressed attendee in state accepted while the second attendee does not see it.
-   POST-CONDITION: The reply is stored as accepted with the addressed attendee as its sole recipient.

##  TEST-CASE: Resource URL Selects the Resource {{resource-url}}

-   VERIFIES:       [[FR.resource-url]], [[SCENARIO:join-event-resource]]
-   PRE-CONDITION:  A running event with a default stream and a second, static resource, and an attendee holding an active session.
-   INPUT:          The attendee opens the event URL carrying the resource parameter naming the static resource.
-   EXPECTED:       The system shows the static resource instead of the default stream.
-   POST-CONDITION: The session of the attendee remains active.

##  TEST-CASE: Language Switch Applies Immediately {{language-switch}}

-   VERIFIES:       [[FR.language-switch]], [[SCENARIO:join-event-language]]
-   PRE-CONDITION:  An attendee watches a running event with the interface in German.
-   INPUT:          The attendee switches the language to English in the header.
-   EXPECTED:       The interface and the translated messages appear in English without a page reload.
-   POST-CONDITION: The stream continues uninterrupted.

##  TEST-CASE: Concurrent Attendee Load {{load}}

-   VERIFIES:      [[NR.attendee-scale]]
-   PRE-CONDITION: A running event deployed with scaled proxy, relay, and server instances.
-   INPUT:         10000 simulated attendees connect simultaneously and interact.
-   EXPECTED:      All connections are served and message round-trips remain responsive under load.
