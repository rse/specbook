---
Created:  2026-06-18 10:18
Modified: 2026-09-05 00:30
---

REQS: Use Cases (UC)
====================

USE-CASE: Join Event and Watch Stream {{join-event}}
-------------------------------------

-   ACTOR:          [[ROLE:attendee]]
-   JOURNEYS:       [[STEP:arrival]], [[STEP:participate]]
-   ACTIVITIES:     [[ACTIVITY:attend-event]]
-   REQUIREMENTS:   [[REQUIREMENT:individual-url]], [[REQUIREMENT:authentication]], [[REQUIREMENT:browser-access]], [[REQUIREMENT:resource-url]], [[REQUIREMENT:mobile]], [[REQUIREMENT:language-switch]], [[REQUIREMENT:theme-toggle]]
-   INCLUDES:       [[USE-CASE:authenticate]]
-   PRE-CONDITION:  The attendee holds an event URL and their email is granted access.
-   TRIGGER:        The attendee opens the individual event URL received by invitation.
-   POST-CONDITION: The attendee holds an active session token and sees the stream.

The attendee opens the individual event URL in a web browser, on a
desktop or a mobile phone, authenticates via their email, and is
admitted to the live stream of the event, adjusting language and theme
to their liking, BECAUSE watching the live stream is the very reason the
attendee was invited.

### SCENARIO: Join via Individual URL {{join-event-watch}}

-   TYPE: Main

1.  The attendee opens the individual event URL in any recent web browser, without installing software.
2.  The attendee authenticates ([[USE-CASE:authenticate]]).
3.  The system grants the attendee access to the live video stream.

### SCENARIO: Return via Direct Resource URL {{join-event-resource}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The attendee sees the resource the URL names instead of the default stream of the event.

1.  The attendee opens an event URL carrying a resource parameter, typically by reloading the page.
2.  The attendee authenticates ([[USE-CASE:authenticate]]), unless a session is still active.
3.  The system grants access and selects the named stream or static resource of the event.

### SCENARIO: Join on a Mobile Phone {{join-event-mobile}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The attendee watches the stream on the phone, with the interaction possibly restricted.

1.  The attendee opens the individual event URL in the browser of a mobile phone.
2.  The attendee authenticates ([[USE-CASE:authenticate]]).
3.  The system grants access to the live video stream in a layout fitting the phone screen in portrait or landscape orientation.

### SCENARIO: Switch the Language {{join-event-language}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 3
-   OUTCOME:      The attendee sees the interface and the translated messages in the chosen language.

3.  The system grants the attendee access to the live video stream in the default language.
4.  The attendee switches the language between German and English in the header.
5.  The system applies the language immediately to the interface and the translated messages.

### SCENARIO: Toggle the Theme {{join-event-theme}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 3
-   OUTCOME:      The attendee sees the interface in the chosen light or dark theme.

3.  The system grants the attendee access to the live video stream in the default theme.
4.  The attendee toggles between the light and the dark theme in the header.
5.  The system applies the theme immediately across the whole interface.

USE-CASE: Authenticate via Email Token {{authenticate}}
--------------------------------------

-   ACTOR:          [[ROLE:attendee]]
-   JOURNEYS:       [[STEP:authenticate]]
-   ACTIVITIES:     [[ACTIVITY:attend-event]]
-   REQUIREMENTS:   [[REQUIREMENT:authentication]], [[REQUIREMENT:user-consent]], [[REQUIREMENT:parallel-access]], [[REQUIREMENT:personalized-url]], [[REQUIREMENT:automatic-url]], [[REQUIREMENT:info-messages]], [[REQUIREMENT:gdpr-eu]]
-   RULES:          [[RULE:access-grant]], [[RULE:single-session]], [[RULE:token-format]]
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

1.  The system asks for the email address and presents the optional login message with its links.
2.  The attendee enters their email address.
3.  The system sends a six-digit authorization token to that email.
4.  The attendee enters the received token.
5.  The system validates the token and any consent the event requires for GDPR-compliant participation.
6.  The system issues a session token and closes any prior session of the user.

### SCENARIO: Email Pre-Filled from URL {{authenticate-prefilled}}

-   TYPE:         Alternative
-   RESULT:       Resume
-   AT-MAIN-STEP: 2
-   OUTCOME:      The email address is fixed by the personalized event URL, and the flow resumes at step 3.

2.  The system finds the email address embedded in the event URL and presents it read-only instead of asking for it.

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

-   ACTOR:          [[ROLE:attendee]]
-   JOURNEYS:       [[STEP:participate]]
-   ACTIVITIES:     [[ACTIVITY:attend-event]]
-   REQUIREMENTS:   [[REQUIREMENT:questions]], [[REQUIREMENT:question-tags]], [[REQUIREMENT:moderation]], [[REQUIREMENT:server-sentiment]], [[REQUIREMENT:client-sentiment]]
-   RULES:          [[RULE:moderation-gate]], [[RULE:type-states]], [[RULE:sentiment-threshold]]
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
6.  The system stores the question in state pending and accepts it at once, without a moderator decision.

### SCENARIO: Auto-Rejected by Sentiment {{ask-question-auto-reject}}

-   TYPE:         Exceptional
-   RESULT:       Failure
-   AT-MAIN-STEP: 4
-   OUTCOME:      The question is stored in state rejected and hidden from the audience, without a moderator decision.

4.  The system runs server-side sentiment analysis on the text.
5.  The system finds the sentiment improper and auto-reject is enabled.
6.  The system stores the question in state pending and rejects it at once, informing the attendee.

### SCENARIO: Throttled Submission {{ask-question-throttled}}

-   TYPE:         Exceptional
-   RESULT:       Failure
-   AT-MAIN-STEP: 4
-   OUTCOME:      The question is not stored, and the attendee may submit it again once the limit window has passed.

4.  The system detects that the attendee exceeded the per-minute submission limit.
5.  The system rejects the new submission and informs the attendee to wait.

### SCENARIO: Held Back by Client-Side Check {{ask-question-client}}

-   TYPE:         Exceptional
-   RESULT:       Resume
-   AT-MAIN-STEP: 3
-   OUTCOME:      The question was not sent, and the attendee may revise its wording (resumes at step 2).

3.  The system runs the client-side sentiment analysis on the text before sending it.
4.  The system finds the sentiment improper and prevents the submission, informing the attendee.

USE-CASE: Chat During the Event {{chat-during-event}}
-------------------------------

-   ACTOR:          [[ROLE:attendee]]
-   JOURNEYS:       [[STEP:participate]]
-   ACTIVITIES:     [[ACTIVITY:attend-event]]
-   REQUIREMENTS:   [[REQUIREMENT:chat]], [[REQUIREMENT:likes]], [[REQUIREMENT:replies]], [[REQUIREMENT:message-editing]], [[REQUIREMENT:deleted-placeholder]], [[REQUIREMENT:display-options]], [[REQUIREMENT:name-appearance]], [[REQUIREMENT:mc-feedback]]
-   RULES:          [[RULE:moderation-gate]], [[RULE:type-states]], [[RULE:forward-lock]]
-   PRE-CONDITION:  The attendee has an active session and chat is enabled for the event.
-   TRIGGER:        The attendee wants to comment on the running event.
-   POST-CONDITION: The chat message is stored in the state the moderation setting determines and shown under the attendee's configured name appearance.

The attendee comments on the running event through chat messages,
likes, replies, and poll answers, and corrects or removes their own
contributions afterwards, BECAUSE live commentary turns the audience
from silent viewers into an engaged community.

### SCENARIO: Post a Chat Message {{chat-post}}

-   TYPE: Main

1.  The attendee writes a chat message.
2.  The attendee sends the message.
3.  The system stores the message in state pending and accepts it at once, unless the event moderates chat messages and hence holds it for the moderator decision.
4.  The system shows the message in the stream under the sender name in the form the event configures (full name, first name, or anonymous), exposing the email address on hover.

### SCENARIO: Pending Message Stays Private {{chat-pending-private}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 4
-   OUTCOME:      The message is visible to its sender only until a moderator accepts it.

4.  The system shows the pending message to its sender only, marked as awaiting the moderation decision.
5.  The system shows the message to the other attendees once a moderator has accepted it.

### SCENARIO: Like a Message {{chat-like}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The like count of the message reflects the current choice of the attendee.

1.  The attendee likes a visible chat message or question of another attendee.
2.  The system records the like and raises the like count of the message.
3.  The attendee optionally undoes the like, and the system lowers the count again.

### SCENARIO: Reply to a Chat Message {{chat-reply}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The reply is stored like a chat message and shown threaded below the message it answers.

1.  The attendee selects a visible chat message to reply to, replies being enabled for the event.
2.  The attendee writes and sends the reply.
3.  The system stores the reply like a chat message and shows it threaded below the message it answers.

### SCENARIO: Edit an Own Message {{chat-edit}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The corrected message is visible and marked as edited, moderated again where the event requires it.

1.  The attendee opens one of their own chat messages or questions for editing.
2.  The attendee changes the text and saves it.
3.  The system marks the message as edited for the other readers.
4.  The system resubmits the edited message to the moderation where the event requires it, hiding it from the audience until it is accepted anew.

### SCENARIO: Delete an Own Message {{chat-delete}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The message text is gone while its position in the stream is kept by a placeholder.

1.  The attendee deletes one of their own chat messages or questions.
2.  The system retains the position of the message in the stream and shows a "This message was deleted" placeholder instead of its text.

### SCENARIO: Forwarded Question Locked {{chat-locked}}

-   TYPE:         Exceptional
-   RESULT:       Failure
-   AT-MAIN-STEP: 1
-   OUTCOME:      The forwarded question remains unchanged and the attendee is informed why.

1.  The attendee tries to edit or delete one of their own questions which a moderator has already forwarded to the presenter.
2.  The system refuses the change and informs the attendee that a forwarded question is immutable.

### SCENARIO: Show Own Contributions Only {{chat-own-only}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 4
-   OUTCOME:      The attendee sees only their own messages and questions until they choose to see those of the others again.

4.  The attendee chooses to see only their own messages and questions.
5.  The system hides the messages and questions of the other attendees from the view of the attendee.

### SCENARIO: Answer a Multiple-Choice Poll {{chat-poll}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The answer of the attendee is counted in the live result of the poll.

1.  The system presents a multiple-choice question raised during the event.
2.  The attendee picks one of the offered choices.
3.  The system records the answer and updates the live result of the poll.

USE-CASE: Moderate and Forward Messages {{moderate}}
---------------------------------------

-   ACTOR:          [[ROLE:moderator]]
-   PERSONAS:       [[PERSONA:moderator-qa]]
-   JOURNEYS:       [[STEP:support]]
-   ACTIVITIES:     [[ACTIVITY:rehearse-event]], [[ACTIVITY:moderate-interaction]]
-   REQUIREMENTS:   [[REQUIREMENT:moderation]], [[REQUIREMENT:forward-presenter]], [[REQUIREMENT:sort-filter]], [[REQUIREMENT:presenter-hints]]
-   RULES:          [[RULE:type-states]], [[RULE:forward-lock]], [[RULE:anonymize]]
-   PRE-CONDITION:  The event is running and the moderator has the Moderator role.
-   TRIGGER:        An attendee message arrives in state pending for moderation.
-   POST-CONDITION: Messages are accepted, rejected, forwarded with optional hints, or settled on behalf of the presenter.

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

### SCENARIO: Settle a Question for the Presenter {{moderate-settle}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 4
-   OUTCOME:      The forwarded question is marked answered or suspended without the presenter touching it.

4.  The moderator marks the forwarded question as answered or suspended on behalf of the presenter, e.g. once the presenter addressed it on stage without marking it.
5.  The system records the decision and removes the question from the presenter's work basket.

### SCENARIO: Access Lost After Finish {{moderate-after-finish}}

-   TYPE:         Exceptional
-   RESULT:       Failure
-   AT-MAIN-STEP: 1
-   OUTCOME:      The moderator cannot enter the finished event, and no message is moderated anymore.

1.  The moderator opens the event after the manager has finished it.
2.  The system refuses the access, as the anonymization has deleted the Moderator role of the event.

USE-CASE: Moderate the Chat Conversation {{moderate-chat}}
----------------------------------------

-   ACTOR:          [[ROLE:moderator]]
-   PERSONAS:       [[PERSONA:moderator-chat]]
-   JOURNEYS:       [[STEP:support]]
-   ACTIVITIES:     [[ACTIVITY:rehearse-event]], [[ACTIVITY:moderate-interaction]]
-   REQUIREMENTS:   [[REQUIREMENT:answer-inputs]], [[REQUIREMENT:moderator-messages]], [[REQUIREMENT:manage-app]]
-   RULES:          [[RULE:moderator-accept]], [[RULE:moderation-gate]]
-   PRE-CONDITION:  The event runs with chat enabled and the moderator has the Moderator role.
-   TRIGGER:        Attendee chat messages arrive which need an answer, a steer, or a seed from the moderator.
-   POST-CONDITION: Attendees are answered, moderator-authored messages are visible, and the conversation stays on-topic.

The moderator keeps the chat conversation civil and on-topic by
answering attendees publicly or privately, seeding the conversation with
messages of their own, and controlling an embedded application, BECAUSE
an unattended chat drowns in spam and off-topic noise.

### SCENARIO: Answer an Attendee Directly {{moderate-chat-answer}}

-   TYPE: Main

1.  The moderator reviews the incoming chat messages.
2.  The moderator selects a chat message which needs a clarification or support.
3.  The moderator writes a reply to the attendee.
4.  The moderator chooses whether the reply is visible to all or a direct message to the attendee only.
5.  The system stores the reply in state pending, accepts it at once as a moderator-authored message, and delivers it accordingly.

### SCENARIO: Seed the Conversation as Moderator {{moderate-chat-seed}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The moderator-authored message is visible to the audience under the chosen sender name.

1.  The moderator authors a chat message or a question for the audience, e.g. to seed a Q&A round.
2.  The moderator keeps the sender name "Moderator" or overrides it for this message.
3.  The system stores the message in state pending, accepts it at once as a moderator-authored message, and shows it to the audience.

### SCENARIO: Administer the Embedded Application {{moderate-chat-app}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The embedded application is controlled by the moderator while the event continues.

1.  The moderator opens the administration view an embedded third-party application exposes.
2.  The moderator controls the application from this view.
3.  The system passes the control on to the application without interrupting the stream.

USE-CASE: Steer the Presenter {{steer-presenter}}
---------------------------------

-   ACTOR:          [[ROLE:moderator]]
-   PERSONAS:       [[PERSONA:moderator-qa]]
-   JOURNEYS:       [[STEP:support]]
-   ACTIVITIES:     [[ACTIVITY:moderate-interaction]]
-   REQUIREMENTS:   [[REQUIREMENT:presenter-hints]], [[REQUIREMENT:config-propagation]]
-   PRE-CONDITION:  The event is running and the moderator has the Moderator role.
-   TRIGGER:        The presenter needs timing or routing guidance during the live event.
-   POST-CONDITION: The presenter alert is raised or the active agenda point is advanced, and the presenter sees it.

The moderator raises a textual alert on the stage view of the presenter
and advances the active agenda point of the event, BECAUSE the presenter
on stage cannot watch the clock and the audience input at the same
time.

### SCENARIO: Raise a Presenter Alert {{steer-presenter-alert}}

-   TYPE: Main

1.  The moderator writes an alert for the presenter, e.g. a timing hint.
2.  The moderator raises the alert.
3.  The system shows the alert on the stage view of the presenter until the presenter confirms it.

### SCENARIO: Advance the Agenda {{steer-presenter-agenda}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 1
-   OUTCOME:      The next agenda point is the active one of the event.

1.  The moderator marks the next agenda point as the active one.
2.  The system propagates the active agenda point to the presenter and the attendees.

USE-CASE: Configure the Event {{configure-event}}
-----------------------------

-   ACTOR:          [[ROLE:manager]]
-   JOURNEYS:       [[STEP:configure]]
-   ACTIVITIES:     [[ACTIVITY:plan-event]]
-   REQUIREMENTS:   [[REQUIREMENT:multi-provider]], [[REQUIREMENT:name-appearance]], [[REQUIREMENT:question-tags]], [[REQUIREMENT:info-messages]], [[REQUIREMENT:config-propagation]], [[REQUIREMENT:event-portability]]
-   RULES:          [[RULE:single-channel]], [[RULE:single-resource]], [[RULE:no-accounts]], [[RULE:manager-retained]]
-   PRE-CONDITION:  The event is provisioned by the administrator and the manager holds its Manager role.
-   TRIGGER:        The manager receives the Manager role of an upcoming event.
-   POST-CONDITION: The event carries its channels, agenda, tags, roles, access list, and interaction settings, ready for the rehearsal.

The manager lays out the channels and their fallback resources, curates
the agenda and the question tags, grants the Moderator and Presenter
roles, maintains the access list, and sets the interaction options of
the event, BECAUSE a broadcast event needs its stage, its staff, and its
audience set up before anyone can rehearse it.

### SCENARIO: Lay Out the Channels {{configure-event-channels}}

-   TYPE: Main

1.  The manager opens the configuration of the event.
2.  The manager defines the channels of the event and marks one of them as active.
3.  The manager selects the active resource of each channel among its provisioned streaming resources.
4.  The manager sets the interaction options, the name appearance, and the login and interaction messages of the event.
5.  The system validates the settings and propagates them to the connected clients.

### SCENARIO: Curate the Agenda {{configure-event-agenda}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 2
-   OUTCOME:      The event carries an ordered agenda the moderator advances during the live event.

2.  The manager defines the ordered agenda points of the event and the tags corresponding to them.
3.  The system stores the agenda for the presenter and the moderators.

### SCENARIO: Curate the Tags {{configure-event-tags}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 2
-   OUTCOME:      The event carries a tag vocabulary for the questions, partly reserved for the moderators.

2.  The manager defines the tag vocabulary of the questions, reserving some tags for the moderators.
3.  The system offers the public tags to the attendees and every tag to the moderators.

### SCENARIO: Grant the Event Roles {{configure-event-roles}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 2
-   OUTCOME:      The moderators and the presenter can enter the unpublished event for the rehearsal.

2.  The manager grants the Moderator and Presenter roles of the event by email address, or revokes them again.
3.  The system creates the users of the roles without permanent accounts and admits them to the unpublished event.

### SCENARIO: Maintain the Access List {{configure-event-access}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 2
-   OUTCOME:      The access list names exactly the invited attendees.

2.  The manager adds attendees to the access list by email address, or removes them again.
3.  The system deletes a removed user without any role entirely.

### SCENARIO: Delete the Event {{configure-event-delete}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 2
-   OUTCOME:      The event no longer exists.

2.  The manager deletes the event entirely.
3.  The system deletes the event with its messages, statistics, and remaining Manager roles.

USE-CASE: Switch Streaming Provider {{switch-provider}}
-----------------------------------

-   ACTOR:          [[ROLE:manager]]
-   JOURNEYS:       [[STEP:configure]]
-   ACTIVITIES:     [[ACTIVITY:go-live]]
-   REQUIREMENTS:   [[REQUIREMENT:multi-provider]], [[REQUIREMENT:provider-switch]], [[REQUIREMENT:config-propagation]]
-   RULES:          [[RULE:single-channel]], [[RULE:single-resource]]
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

USE-CASE: Create Event from Registration Import {{create-event}}
-----------------------------------------------

-   ACTOR:          [[ROLE:manager]]
-   JOURNEYS:       [[STEP:configure]]
-   ACTIVITIES:     [[ACTIVITY:plan-event]]
-   REQUIREMENTS:   [[REQUIREMENT:registration-import]], [[REQUIREMENT:registration-export]], [[REQUIREMENT:event-portability]]
-   RULES:          [[RULE:token-format]], [[RULE:no-accounts]]
-   PRE-CONDITION:  The manager has an Excel sheet of the Event Registration System and an event to populate.
-   TRIGGER:        The Event Registration System delivers the Excel sheet of the attendees of an upcoming event.
-   POST-CONDITION: The access list and tokens are created and URLs returned to the Event Registration System.

The manager imports the Excel sheet of the Event Registration System to fill the event access list and generate authorization
tokens, then exports an Excel sheet of personal access URLs back to the Event Registration System, avoiding duplicate
invitations on repeated imports, BECAUSE provisioning hundreds of attendees by hand is error-prone and does not scale.

### SCENARIO: Import and Return URLs {{create-event-import}}

-   TYPE: Main

1.  The manager uploads the Excel sheet of the Event Registration System to the event.
2.  The system creates access-list users for new emails and skips existing ones.
3.  The system generates a "NNN-NNN" authorization token per user in state issued.
4.  The system composes each user's personal access URL with event, user, and token.
5.  The system returns an Excel sheet with the URL column filled to the Event Registration System.

USE-CASE: Publish, Start, and Finish Event {{publish-start-finish}}
------------------------------------------

-   ACTOR:          [[ROLE:manager]]
-   JOURNEYS:       [[STEP:configure]]
-   ACTIVITIES:     [[ACTIVITY:go-live]], [[ACTIVITY:finish-event]]
-   RULES:          [[RULE:anonymize]]
-   PRE-CONDITION:  The event is configured and its access list is populated.
-   TRIGGER:        The scheduled date of the event approaches.
-   POST-CONDITION: The event is finished, access is closed, and the personal data is anonymized.

The manager publishes the configured event to make it visible to the invited attendees, starts it when the live stream goes
on air, and finishes it afterwards, BECAUSE the visibility, the live interaction, and the anonymization of an event are
deliberate decisions of the manager, not side effects of the clock.

### SCENARIO: Publish, Start, and Finish {{publish-start-finish-main}}

-   TYPE: Main

1.  The manager publishes the configured event.
2.  The system makes the event visible to the invited attendees.
3.  The manager starts the event when the live stream goes on air.
4.  The system opens the stream and the interaction channels for the attendees.
5.  The manager finishes the event after the live stream has ended.
6.  The system closes the access and anonymizes the personal data of the event.

### SCENARIO: Start Without Publishing {{publish-start-finish-unpublished}}

-   TYPE:         Alternative
-   RESULT:       Resume
-   AT-MAIN-STEP: 1
-   OUTCOME:      The event is running without having been visible to the attendees beforehand, and the flow resumes at step 5.

1.  The manager starts the still unpublished event directly.
2.  The system opens the stream and the interaction channels for the attendees.

USE-CASE: Export Anonymized Event Data {{export-data}}
--------------------------------------

-   ACTOR:          [[ROLE:manager]]
-   JOURNEYS:       [[STEP:export]]
-   ACTIVITIES:     [[ACTIVITY:archive-results]]
-   REQUIREMENTS:   [[REQUIREMENT:export-inputs]], [[REQUIREMENT:event-stats]], [[REQUIREMENT:channel-stats]], [[REQUIREMENT:user-stats]], [[REQUIREMENT:debug-stats]], [[REQUIREMENT:stats-snapshots]]
-   RULES:          [[RULE:anonymize]], [[RULE:like-count]], [[RULE:manager-retained]]
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

### SCENARIO: Inspect the Event Statistics {{export-data-stats}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 2
-   OUTCOME:      The manager has evaluated the audience size, composition, channel popularity, and authentication flow without producing an export file.

2.  The manager opens the statistics of the event instead of triggering the export.
3.  The system shows the curve of logged-in attendees over time and the number of viewers per channel.
4.  The system shows the recorded viewer statistics by country, browser, device, and viewport.
5.  The system shows the login-challenge statistics of issued, sent, and used authorization tokens.

USE-CASE: Present Forwarded Questions {{present}}
-------------------------------------

-   ACTOR:          [[ROLE:presenter]]
-   ACTIVITIES:     [[ACTIVITY:rehearse-event]], [[ACTIVITY:present-talk]]
-   REQUIREMENTS:   [[REQUIREMENT:forward-presenter]], [[REQUIREMENT:presenter-dashboard]], [[REQUIREMENT:presenter-hints]]
-   RULES:          [[RULE:forward-lock]]
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

### SCENARIO: Suspend a Forwarded Question {{present-suspend}}

-   TYPE:         Alternative
-   RESULT:       Success
-   AT-MAIN-STEP: 2
-   OUTCOME:      The question is marked suspended and leaves the active basket without having been addressed on stage.

2.  The presenter decides not to address a forwarded question on stage.
3.  The presenter marks the question as suspended.
4.  The system removes the question from the active basket.

### SCENARIO: Forwarded Questions Only {{present-only-forwarded}}

-   TYPE:         Alternative
-   RESULT:       Resume
-   AT-MAIN-STEP: 1
-   OUTCOME:      The presenter works on the curated forwarded questions alone, and the flow resumes at step 2.

1.  The presenter views the forwarded questions only, while the pending, accepted, and rejected messages of the event stay invisible to them.

### SCENARIO: Confirm a Raised Alert {{present-confirm-alert}}

-   TYPE:         Alternative
-   RESULT:       Resume
-   AT-MAIN-STEP: 1
-   OUTCOME:      The alert is taken off the stage view, and the flow resumes at step 1.

1.  The presenter sees an alert a moderator has raised on the stage view.
2.  The presenter confirms the alert, which takes it off the stage view.
