---
Created:  2026-06-18 10:18
Modified: 2026-09-03 18:45
---

TEST: Test Cases (TC)
=====================

##  TEST-CASE: Valid Token Grants Access {{valid-token}}

-   VERIFIES:       [[REQUIREMENT:authentication]], [[SCENARIO:authenticate-token]], [[RULE:access-grant]], [[consume]], [[PERMISSION:attendee-prove-email]]
-   PRE-CONDITION:  An invited user with a sent, unexpired authorization token exists for a running event.
-   INPUT:          The user submits the correct six-digit token for their email.
-   EXPECTED:       The system issues a session token and grants access to the stream.
-   POST-CONDITION: The authorization token is in state used.

##  TEST-CASE: Unauthorized Email Rejected {{unauthorized}}

-   VERIFIES:       [[REQUIREMENT:authentication]], [[SCENARIO:authenticate-denied]], [[RULE:access-grant]], [[PERMISSION:attendee-enter-event]]
-   PRE-CONDITION:  An email not on the access list and not matching the access pattern.
-   INPUT:          The user enters that email in the login dialog.
-   EXPECTED:       The system denies access and shows a not-authorized notice.
-   POST-CONDITION: No session token exists and no authorization token was sent for the email.

##  TEST-CASE: URL Token Skips Login Dialog {{auto-token}}

-   VERIFIES:       [[REQUIREMENT:automatic-url]], [[SCENARIO:authenticate-auto]], [[RULE:token-format]], [[consume-automatic]]
-   PRE-CONDITION:  An event allows URL tokens and a pre-generated token exists for an invited email.
-   INPUT:          The user opens the event URL carrying that email and token.
-   EXPECTED:       The system issues a session token and grants access without showing the login dialog.
-   POST-CONDITION: The user holds an active session token.

##  TEST-CASE: Second Login Closes First Session {{single-session}}

-   VERIFIES:       [[REQUIREMENT:parallel-access]], [[RULE:single-session]]
-   PRE-CONDITION:  A user holds an active session for an event from one device.
-   INPUT:          The same user completes a login from a second device.
-   EXPECTED:       The first connection is closed and only the new session remains active.
-   POST-CONDITION: Exactly one active session token exists for the user and event.

1.  The user watches the stream on the first device.
2.  The same user completes a login with a fresh authorization token on a second device.
3.  The tester observes the first device.

##  TEST-CASE: Moderated Question Starts Pending {{moderated-pending}}

-   VERIFIES:      [[REQUIREMENT:moderation]], [[SCENARIO:ask-question-moderated]], [[RULE:moderation-gate]]
-   PRE-CONDITION: An event with question moderation enabled is running.
-   INPUT:         An attendee submits a question.
-   EXPECTED:      The question is stored in state pending and is not visible to the audience.

##  TEST-CASE: Unmoderated Chat Starts Accepted {{unmoderated-accepted}}

-   VERIFIES:      [[REQUIREMENT:moderation]], [[RULE:moderation-gate]]
-   PRE-CONDITION: An event with chat moderation disabled is running.
-   INPUT:         An attendee submits a chat message.
-   EXPECTED:      The message is stored in state accepted and is immediately visible.

##  TEST-CASE: Chat Cannot Enter Question States {{type-states}}

-   VERIFIES:       [[REQUIREMENT:moderation]], [[RULE:type-states]]
-   PRE-CONDITION:  An accepted chat message exists in a running event.
-   INPUT:          A moderator attempts to forward the chat message to the presenter.
-   EXPECTED:       The system refuses the transition, as a chat message permits only the states pending, accepted, and rejected.
-   POST-CONDITION: The chat message remains in state accepted.

##  TEST-CASE: Moderator Message Starts Accepted {{moderator-accept}}

-   VERIFIES:      [[REQUIREMENT:moderator-messages]], [[RULE:moderator-accept]]
-   PRE-CONDITION: An event with chat moderation enabled is running.
-   INPUT:         A moderator posts a chat message without overriding the sender name.
-   EXPECTED:      The message is stored directly in state accepted with the sender name "Moderator" and is immediately visible.

##  TEST-CASE: Forwarded Message Is Locked {{forward-lock}}

-   VERIFIES:      [[REQUIREMENT:message-editing]], [[SCENARIO:chat-locked]], [[RULE:forward-lock]], [[PERMISSION:attendee-edit-own]]
-   PRE-CONDITION: An accepted question of an attendee exists in a running event.
-   INPUT:         The original attendee attempts to edit and then to delete the forwarded message.
-   EXPECTED:      The system refuses both the edit and the deletion and the message remains unchanged.

1.  The moderator forwards the accepted question to the presenter.
2.  The original attendee attempts to edit the text of the question.
3.  The original attendee attempts to delete the question.

##  TEST-CASE: Sentiment Auto-Reject Below Threshold {{sentiment-reject}}

-   VERIFIES:      [[REQUIREMENT:server-sentiment]], [[RULE:sentiment-threshold]]
-   PRE-CONDITION: Server-side sentiment analysis and auto-reject are enabled.
-   INPUT:         An attendee submits a message scoring -0.5.
-   EXPECTED:      The system stores the message directly in state rejected.

##  TEST-CASE: Sentiment Auto-Accept Above Threshold {{sentiment-accept}}

-   VERIFIES:      [[REQUIREMENT:server-sentiment]], [[SCENARIO:ask-question-auto]], [[RULE:sentiment-threshold]]
-   PRE-CONDITION: Server-side sentiment analysis and auto-accept are enabled for a moderated event.
-   INPUT:         An attendee submits a question scoring +0.5.
-   EXPECTED:      The system stores the question directly in state accepted, bypassing moderation.

##  TEST-CASE: Throttled Submission Not Stored {{throttled}}

-   VERIFIES:       [[REQUIREMENT:throttling]], [[SCENARIO:ask-question-throttled]], [[TACTIC:abuse-resistance]]
-   PRE-CONDITION:  A running event with the default submission limit of 10 per user per minute.
-   INPUT:          The attendee submits an eleventh question within the same minute.
-   EXPECTED:       The system rejects the eleventh submission and informs the attendee to wait, but accepts the twelfth one after the minute has passed.
-   POST-CONDITION: The eleventh question is not stored, while the ten earlier ones remain unchanged and the twelfth one is stored.

1.  The attendee submits ten distinct questions within one minute.
2.  The attendee submits an eleventh question before that minute has passed.
3.  The attendee submits a twelfth question after the minute has passed.

##  TEST-CASE: Live Provider Switch Propagates {{provider-switch}}

-   VERIFIES:       [[REQUIREMENT:provider-switch]], [[RULE:single-resource]]
-   PRE-CONDITION:  A running event with two configured resources and connected clients.
-   INPUT:          The manager activates the second resource on the channel.
-   EXPECTED:       All connected clients switch to the new stream without user interaction.
-   POST-CONDITION: Exactly one resource of the channel is active.

##  TEST-CASE: Channel Activation Deactivates Previous {{single-channel}}

-   VERIFIES:       [[REQUIREMENT:provider-switch]], [[RULE:single-channel]]
-   PRE-CONDITION:  A running event with two configured channels, the first one active.
-   INPUT:          The manager activates the second channel.
-   EXPECTED:       The second channel becomes active and the first one is deactivated in the same step.
-   POST-CONDITION: Exactly one channel of the event is active.

##  TEST-CASE: Config Change Reaches Clients {{config-propagation}}

-   VERIFIES:      [[REQUIREMENT:config-propagation]]
-   PRE-CONDITION: A running event with connected clients and chat disabled.
-   INPUT:         The manager enables chat for the event.
-   EXPECTED:      Connected clients show the chat panel within 2 seconds without a reload.

##  TEST-CASE: Registration Import Avoids Duplicates {{registration-dedup}}

-   VERIFIES:      [[REQUIREMENT:registration-import]]
-   PRE-CONDITION: A running event with an empty access list.
-   INPUT:         The manager imports a second registration sheet overlapping the first one.
-   EXPECTED:      The overlapping users are not duplicated, their tokens from the first import are returned unchanged, and only the new users receive fresh tokens.

1.  The manager imports a registration sheet with the emails A, B, and C.
2.  The manager records the tokens returned for A, B, and C.
3.  The manager imports a second registration sheet with the emails B, C, and D.

##  TEST-CASE: Returned URL Format {{url-format}}

-   VERIFIES:      [[REQUIREMENT:registration-export]], [[RULE:token-format]], [[ATTRIBUTE:token]]
-   PRE-CONDITION: A registration import has generated tokens for new users.
-   INPUT:         The manager exports the access URLs.
-   EXPECTED:      Each URL contains event, user, and a six-digit "NNN-NNN" token in the URL column.

##  TEST-CASE: Anonymization Removes Personal Data {{anonymize}}

-   VERIFIES:       [[REQUIREMENT:user-consent]], [[RULE:anonymize]]
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

-   VERIFIES:      [[REQUIREMENT:export-inputs]], [[RULE:like-count]], [[Message.timestamp]], [[Message.state]], [[ATTRIBUTE:likes]], [[MessageText.text]]
-   PRE-CONDITION: A finished, anonymized event with messages.
-   INPUT:         The manager exports the attendee inputs.
-   EXPECTED:      The export includes at least timestamp, state, number of likes, and message text per message.

##  TEST-CASE: Manager Role Survives Finish {{manager-retained}}

-   VERIFIES:       [[REQUIREMENT:export-inputs]], [[SCENARIO:export-data-after]], [[RULE:manager-retained]], [[PERMISSION:manager-export-messages]], [[PERMISSION:moderator-enter-event]]
-   WORKFLOWS:      [[WORKFLOW:run-broadcast-event]]
-   PRE-CONDITION:  A running event with a manager role and a moderator role assigned.
-   INPUT:          The manager exports the event data after having finished the event.
-   EXPECTED:       The moderator role is deleted by the anonymization while the manager role remains and can still export the event data.
-   POST-CONDITION: The manager role exists until the event is deleted.

1.  The manager finishes the event.
2.  The moderator attempts to open the event.
3.  The manager exports the attendee inputs of the finished event.

##  TEST-CASE: Chat Message Shows Configured Name {{name-appearance}}

-   VERIFIES:       [[REQUIREMENT:chat]], [[REQUIREMENT:name-appearance]], [[SCENARIO:chat-post]], [[RULE:moderation-gate]]
-   PRE-CONDITION:  A running event with chat enabled, chat moderation disabled, and the name appearance set to first name only.
-   INPUT:          An attendee sends a chat message.
-   EXPECTED:       The message appears in state accepted under the first name of the attendee, with the email address shown on hover.
-   POST-CONDITION: The message is stored as a chat in state accepted.

##  TEST-CASE: Like Toggles the Count {{like-toggle}}

-   VERIFIES:       [[REQUIREMENT:likes]], [[SCENARIO:chat-like]]
-   PRE-CONDITION:  A visible chat message of another attendee with a like count of 0.
-   INPUT:          An attendee likes the message and then undoes the like.
-   EXPECTED:       The like count reads 1 after the like and 0 again after the undo.
-   POST-CONDITION: No like of the attendee is recorded for the message.

1.  The attendee likes the message.
2.  The tester reads the like count shown on the message.
3.  The attendee undoes the like on the same message.
4.  The tester reads the like count shown on the message again.

##  TEST-CASE: Deleted Message Leaves Placeholder {{deleted-placeholder}}

-   VERIFIES:       [[REQUIREMENT:message-editing]], [[REQUIREMENT:deleted-placeholder]], [[SCENARIO:chat-delete]]
-   PRE-CONDITION:  A running event with chat enabled and chat moderation disabled, with two attendees watching.
-   INPUT:          The first attendee deletes their own message from between the two other messages.
-   EXPECTED:       The stream keeps the position of the message and shows a "This message was deleted" placeholder instead of its text on both attendee screens.
-   POST-CONDITION: The message text is no longer retrievable by any attendee.

1.  The second attendee posts a chat message.
2.  The first attendee posts a chat message.
3.  The second attendee posts another chat message.
4.  The first attendee deletes their own message.
5.  The tester inspects the stream on the screens of both attendees.

##  TEST-CASE: Client-Side Check Holds Back Improper Input {{client-block}}

-   VERIFIES:       [[REQUIREMENT:client-sentiment]], [[SCENARIO:ask-question-client]]
-   PRE-CONDITION:  A running event with client-side sentiment analysis enabled.
-   INPUT:          An attendee submits a question with clearly improper wording.
-   EXPECTED:       The client prevents the submission and informs the attendee, and no request reaches the server.
-   POST-CONDITION: No message exists for the submission.

##  TEST-CASE: Direct Moderator Reply Stays Private {{direct-reply}}

-   VERIFIES:       [[REQUIREMENT:answer-inputs]], [[SCENARIO:moderate-chat-answer]], [[RULE:moderator-accept]]
-   PRE-CONDITION:  A running event with chat enabled and two attendees watching the stream.
-   INPUT:          The moderator replies to the message of the first attendee as a direct message.
-   EXPECTED:       The reply reaches the first attendee in state accepted while the second attendee does not see it.
-   POST-CONDITION: The reply is stored as accepted with the first attendee as its sole recipient.

1.  The first attendee posts a chat message.
2.  The moderator replies to that message as a direct message.
3.  The tester inspects the stream on the screens of both attendees.

##  TEST-CASE: Resource URL Selects the Resource {{resource-url}}

-   VERIFIES:       [[REQUIREMENT:resource-url]], [[SCENARIO:join-event-resource]]
-   PRE-CONDITION:  A running event with a default stream and a second, static resource, and an attendee holding an active session.
-   INPUT:          The attendee opens the event URL carrying the resource parameter naming the static resource.
-   EXPECTED:       The system shows the static resource instead of the default stream.
-   POST-CONDITION: The session of the attendee remains active.

##  TEST-CASE: Language Switch Applies Immediately {{language-switch}}

-   VERIFIES:       [[REQUIREMENT:language-switch]], [[SCENARIO:join-event-language]]
-   PRE-CONDITION:  An attendee watches a running event with the interface in German.
-   INPUT:          The attendee switches the language to English in the header.
-   EXPECTED:       The interface and the translated messages appear in English without a page reload.
-   POST-CONDITION: The stream continues uninterrupted.

##  TEST-CASE: Presenter Sees Forwarded Questions Only {{presenter-view}}

-   VERIFIES:       [[REQUIREMENT:presenter-dashboard]], [[PERMISSION:presenter-read-forwarded]]
-   PRE-CONDITION:  A running event holds one question in each of the states pending, accepted, rejected, and forwarded.
-   INPUT:          The presenter opens the presenter view of the event.
-   EXPECTED:       The view lists the forwarded question only, while a direct request for any of the three other questions is refused.
-   POST-CONDITION: The four questions remain in their states.

##  TEST-CASE: Administrator Sees No Attendee Data {{administrator-data}}

-   VERIFIES:       [[REQUIREMENT:gdpr-eu]], [[RULE:no-accounts]], [[PERMISSION:administrator-events]]
-   PRE-CONDITION:  A running event with a populated access list and messages exists, provisioned through the configuration.
-   INPUT:          The administrator reads the event through the configuration and requests its access list and messages.
-   EXPECTED:       The event settings are returned, while the requests for the access list and the messages are refused.
-   POST-CONDITION: No access list entry or message was disclosed to the administrator.

##  TEST-CASE: Concurrent Attendee Load {{load}}

-   VERIFIES:      [[REQUIREMENT:attendee-scale]], [[REQUIREMENT:scalability]]
-   PRE-CONDITION: A running event deployed with scaled proxy, relay, and server instances.
-   INPUT:         10000 simulated attendees connect simultaneously and interact.
-   EXPECTED:      All 10000 attendees hold a served WebSocket connection at the same time, meeting the upper bound of the 2500 to 10000 attendees per event metric.
