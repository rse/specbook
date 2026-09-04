---
Created:  2026-08-30 12:00
Modified: 2026-09-05 02:00
---

DATA: Authorization Model (AM)
==============================

##  PERMISSION

-   Enter the Event {{attendee-enter-event}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:Event]]; OPERATIONS: Read;
    STATES: [[STATE:Published]], [[STATE:Running]];
    CONDITION: The email of the attendee is on the access list or matches the access email pattern of the event, or the event allows anonymous access.;
    RULES: [[RULE:access-grant]], [[RULE:no-accounts]];
    USE-CASES: [[SCENARIO:join-event-watch]], [[SCENARIO:authenticate-denied]];
    The attendee sees the event with its login and interaction information, but none of its configuration.

-   Prove the Email Address {{attendee-prove-email}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:AuthorizationToken]];
    OPERATIONS: [[TRANSITION:send]], [[consume]], [[consume-automatic]];
    CONDITION: The token was issued for the email address of the attendee.;
    RULES: [[RULE:token-format]], [[RULE:single-session]];
    USE-CASES: [[USE-CASE:authenticate]];
    The attendee requests, receives, and returns the one-time token of their own login challenge.

-   Watch the Active Channel {{attendee-watch-channel}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:Channel]]; OPERATIONS: Read;
    CONDITION: The channel belongs to the event the attendee entered.;
    RULES: [[RULE:single-channel]];
    USE-CASES: [[SCENARIO:join-event-watch]], [[SCENARIO:switch-provider-failover]];
    The attendee sees the channels of the event and follows the active one.

-   Play the Active Resource {{attendee-play-resource}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:Resource]]; OPERATIONS: Read;
    CONDITION: The resource backs a channel of the event the attendee entered.;
    RULES: [[RULE:single-resource]];
    USE-CASES: [[SCENARIO:join-event-watch]], [[SCENARIO:join-event-resource]];
    The attendee plays the active resource, or the resource named by the event URL, without seeing its provider parameters.

-   Follow the Agenda {{attendee-follow-agenda}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:AgendaPoint]]; OPERATIONS: Read;
    CONDITION: The agenda point belongs to the event the attendee entered.;
    USE-CASES: [[SCENARIO:steer-presenter-agenda]];
    The attendee sees the agenda of the event and which agenda point is currently active.

-   Send Messages {{attendee-send-message}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: Create;
    CONDITION: The event is running, the type of the message is enabled for the event, and the throttling limit is not exceeded.;
    RULES: [[RULE:moderation-gate]], [[RULE:type-states]];
    USE-CASES: [[SCENARIO:ask-question-moderated]], [[SCENARIO:ask-question-throttled]], [[SCENARIO:chat-post]], [[SCENARIO:chat-reply]];
    The attendee sends chat, question, and support messages of their own, which await the moderation decision or are accepted at once, as the moderation setting of the event determines.

-   Read Visible Messages {{attendee-read-message}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    STATES: [[STATE:Accepted]], [[STATE:Forwarded]], [[STATE:Answered]], [[STATE:Suspended]];
    CONDITION: The message is a chat, a question the event does not keep private, or a support message of the attendee's own conversation.;
    RULES: [[RULE:moderation-gate]];
    USE-CASES: [[SCENARIO:chat-post]], [[SCENARIO:chat-own-only]], [[SCENARIO:chat-pending-private]];
    The attendee reads the messages which passed the moderation, with their texts and like counts, under the sender name the event configures.

-   Track Own Messages {{attendee-track-own}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    STATES: [[STATE:Pending]];
    CONDITION: The attendee is the sender of the message.;
    RULES: [[RULE:moderation-gate]];
    USE-CASES: [[SCENARIO:ask-question-moderated]], [[SCENARIO:chat-pending-private]];
    The attendee sees their own messages while they still await the moderation decision.

-   Correct Own Messages {{attendee-edit-own}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:Message]];
    OPERATIONS: Update, Delete, [[TRANSITION:resubmit]];
    STATES: [[STATE:Pending]], [[STATE:Accepted]];
    CONDITION: The attendee is the sender of the message.;
    RULES: [[RULE:forward-lock]], [[RULE:moderation-gate]];
    USE-CASES: [[SCENARIO:chat-edit]], [[SCENARIO:chat-delete]], [[SCENARIO:chat-locked]];
    The attendee edits or deletes their own chat messages and questions until a question is forwarded, where an edit is marked and resubmitted to the moderation as the event requires.

-   Like Messages {{attendee-like}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: Update;
    STATES: [[STATE:Accepted]], [[STATE:Forwarded]], [[STATE:Answered]], [[STATE:Suspended]];
    CONDITION: The update is confined to adding or revoking the attendee's own like on a chat or question of another attendee.;
    RULES: [[RULE:like-count]];
    USE-CASES: [[SCENARIO:chat-like]];
    The attendee likes the visible messages of others and revokes the like again until the event finishes.

-   Use Public Tags {{attendee-use-tags}}; ROLE: [[ROLE:attendee]]; ENTITY: [[ENTITY:QuestionTag]]; OPERATIONS: Read;
    CONDITION: The tag is not reserved for moderators.;
    USE-CASES: [[SCENARIO:ask-question-moderated]];
    The attendee sees the available tags of the event and attaches them to their own questions.

-   Enter the Event {{moderator-enter-event}}; ROLE: [[ROLE:moderator]]; ENTITY: [[ENTITY:Event]]; OPERATIONS: Read;
    STATES: [[STATE:Planning]], [[STATE:Published]], [[STATE:Running]];
    CONDITION: The moderator holds the Moderator role of the event.;
    RULES: [[RULE:anonymize]];
    USE-CASES: [[USE-CASE:moderate]], [[USE-CASE:moderate-chat]], [[USE-CASE:steer-presenter]], [[SCENARIO:moderate-after-finish]];
    The moderator sees the event with its interaction settings, also before it is published for the rehearsal, but loses the access when the event finishes, as the anonymization deletes the Moderator roles.

-   Steer the Presenter {{moderator-steer-presenter}}; ROLE: [[ROLE:moderator]]; ENTITY: [[ENTITY:Event]]; OPERATIONS: Update;
    STATES: [[STATE:Running]];
    CONDITION: The update is confined to the presenter alert and the active agenda point of the event.;
    USE-CASES: [[USE-CASE:steer-presenter]];
    The moderator raises the presenter alert and advances the active agenda point, but changes no other setting of the event.

-   Review All Messages {{moderator-read-messages}}; ROLE: [[ROLE:moderator]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    CONDITION: The message belongs to the event the moderator holds the Moderator role of.;
    USE-CASES: [[SCENARIO:moderate-forward]], [[SCENARIO:moderate-chat-answer]];
    The moderator reads every message of the event in every state, with its sender, sentiment score, and like count.

-   Decide Pending Messages {{moderator-decide}}; ROLE: [[ROLE:moderator]]; ENTITY: [[ENTITY:Message]];
    OPERATIONS: [[accept]], [[reject]];
    RULES: [[RULE:moderation-gate]], [[RULE:sentiment-threshold]];
    USE-CASES: [[SCENARIO:moderate-forward]], [[SCENARIO:moderate-reject]];
    The moderator accepts or rejects the pending chats and questions, where the server-side sentiment analysis decides in their place if the event so configures.

-   Forward Questions {{moderator-forward}}; ROLE: [[ROLE:moderator]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: [[TRANSITION:forward]], Update;
    STATES: [[STATE:Accepted]], [[STATE:Forwarded]];
    CONDITION: The message is a question, and the update is confined to the presenter annotation, the ordering, and the tags of the message.;
    RULES: [[RULE:type-states]], [[RULE:forward-lock]];
    USE-CASES: [[SCENARIO:moderate-forward]];
    The moderator forwards accepted questions to the presenter in a chosen order, attaching hints and tags, while the text of the question stays untouched.

-   Process Forwarded Questions {{moderator-process}}; ROLE: [[ROLE:moderator]]; ENTITY: [[ENTITY:Message]];
    OPERATIONS: [[TRANSITION:answer]], [[TRANSITION:suspend]];
    USE-CASES: [[SCENARIO:moderate-settle]];
    The moderator marks a forwarded question answered or suspended on behalf of the presenter.

-   Author Messages {{moderator-author}}; ROLE: [[ROLE:moderator]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: Create;
    CONDITION: The event is running.;
    RULES: [[RULE:moderator-accept]];
    USE-CASES: [[SCENARIO:moderate-chat-answer]], [[SCENARIO:moderate-chat-seed]];
    The moderator answers attendees publicly or privately and seeds the conversation, where the messages are accepted at once upon creation under the sender name "Moderator" unless overridden.

-   Use All Tags {{moderator-use-tags}}; ROLE: [[ROLE:moderator]]; ENTITY: [[ENTITY:QuestionTag]]; OPERATIONS: Read;
    USE-CASES: [[SCENARIO:moderate-forward]];
    The moderator uses every tag of the event on questions, including the ones reserved for moderators.

-   Enter the Event {{presenter-enter-event}}; ROLE: [[ROLE:presenter]]; ENTITY: [[ENTITY:Event]]; OPERATIONS: Read;
    STATES: [[STATE:Planning]], [[STATE:Published]], [[STATE:Running]];
    CONDITION: The presenter holds the Presenter role of the event.;
    USE-CASES: [[USE-CASE:present]];
    The presenter sees the event with its agenda and presenter alert, also before it is published for the rehearsal.

-   Confirm the Alert {{presenter-confirm-alert}}; ROLE: [[ROLE:presenter]]; ENTITY: [[ENTITY:Event]]; OPERATIONS: Update;
    STATES: [[STATE:Running]];
    CONDITION: The update is confined to unraising the presenter alert of the event.;
    USE-CASES: [[SCENARIO:present-confirm-alert]];
    The presenter confirms a raised alert, which takes it off the stage view again.

-   Read Forwarded Questions {{presenter-read-forwarded}}; ROLE: [[ROLE:presenter]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    STATES: [[STATE:Forwarded]], [[STATE:Answered]], [[STATE:Suspended]];
    RULES: [[RULE:forward-lock]];
    USE-CASES: [[SCENARIO:present-answer]], [[SCENARIO:present-only-forwarded]];
    The presenter sees the forwarded questions in their order with the moderator hints, and never the pending, accepted, or rejected messages.

-   Process Forwarded Questions {{presenter-process}}; ROLE: [[ROLE:presenter]]; ENTITY: [[ENTITY:Message]];
    OPERATIONS: [[TRANSITION:answer]], [[TRANSITION:suspend]];
    USE-CASES: [[SCENARIO:present-answer]], [[SCENARIO:present-suspend]];
    The presenter marks a forwarded question answered once addressed on stage, or suspended when it will not be addressed.

-   Configure the Event {{manager-configure-event}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:Event]]; OPERATIONS: Read, Update;
    CONDITION: The manager holds the Manager role of the event.;
    RULES: [[RULE:manager-retained]];
    USE-CASES: [[USE-CASE:configure-event]], [[SCENARIO:export-data-after]];
    The manager reads and edits every setting of the event in every state, keeping the access after the event finishes for the export.

-   Run the Event {{manager-run-event}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:Event]];
    OPERATIONS: [[TRANSITION:publish]], [[start]], [[start-unpublished]], [[TRANSITION:finish]];
    RULES: [[RULE:anonymize]];
    USE-CASES: [[USE-CASE:publish-start-finish]];
    The manager publishes, starts, and finishes the event, where finishing triggers the anonymization.

-   Delete the Event {{manager-delete-event}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:Event]]; OPERATIONS: Delete;
    CONDITION: The manager holds the Manager role of the event.;
    RULES: [[RULE:manager-retained]], [[RULE:no-accounts]];
    USE-CASES: [[SCENARIO:configure-event-delete]];
    The manager deletes the event entirely, which deletes the remaining Manager roles with it.

-   Lay Out the Channels {{manager-channels}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:Channel]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The channel belongs to the event the manager holds the Manager role of.;
    RULES: [[RULE:single-channel]];
    USE-CASES: [[SCENARIO:configure-event-channels]];
    The manager defines the channels of the event and switches the active one.

-   Switch the Resource {{manager-resources}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:Resource]]; OPERATIONS: Read, Update;
    CONDITION: The update is confined to activating a resource of a channel of the event.;
    RULES: [[RULE:single-resource]];
    USE-CASES: [[SCENARIO:configure-event-channels]], [[SCENARIO:switch-provider-failover]];
    The manager switches the active resource of a channel to a fallback streaming provider, without changing the provider parameters.

-   Grant Event Roles {{manager-roles}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:Role]]; OPERATIONS: Create, Read, Delete;
    CONDITION: The role belongs to the event the manager holds the Manager role of.;
    RULES: [[RULE:no-accounts]], [[RULE:anonymize]];
    USE-CASES: [[SCENARIO:configure-event-roles]];
    The manager grants and revokes the Manager, Moderator, and Presenter roles of the event by email.

-   Maintain the Access List {{manager-access-list}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:User]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The user is on the access list of the event the manager holds the Manager role of.;
    RULES: [[RULE:access-grant]], [[RULE:no-accounts]];
    USE-CASES: [[SCENARIO:configure-event-access]], [[SCENARIO:create-event-import]];
    The manager invites attendees by email, individually or by importing the sheet of the Event Registration System, and removes them again, where a removed user without a role ceases to exist.

-   Issue Access Tokens {{manager-tokens}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:AuthorizationToken]]; OPERATIONS: Create, Read;
    STATES: [[STATE:Issued]];
    CONDITION: The token belongs to the event the manager holds the Manager role of.;
    RULES: [[RULE:token-format]];
    USE-CASES: [[SCENARIO:create-event-import]];
    The manager pre-generates the tokens of the imported attendees and exports their personal access URLs, seeing the tokens in state issued only.

-   Curate the Tags {{manager-tags}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:QuestionTag]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The tag belongs to the event the manager holds the Manager role of.;
    USE-CASES: [[SCENARIO:configure-event-tags]];
    The manager defines the tag vocabulary of the event, including the tags reserved for moderators.

-   Curate the Agenda {{manager-agenda}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:AgendaPoint]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The agenda point belongs to the event the manager holds the Manager role of.;
    USE-CASES: [[SCENARIO:configure-event-agenda]];
    The manager defines the ordered agenda of the event and the tags corresponding to its points.

-   Export the Messages {{manager-export-messages}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    CONDITION: The message belongs to the event the manager holds the Manager role of.;
    RULES: [[RULE:like-count]], [[RULE:manager-retained]];
    USE-CASES: [[SCENARIO:export-data-after]];
    The manager reads every message of the event with its texts, timestamps, state, and like count, and exports them after the event has finished.

-   Inspect the Event Statistics {{manager-statistics-event}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:EventStatistic]]; OPERATIONS: Read;
    CONDITION: The statistic belongs to the event the manager holds the Manager role of.;
    USE-CASES: [[SCENARIO:export-data-stats]];
    The manager inspects the curve of logged-in attendees and the login challenge counts over time.

-   Inspect the Channel Statistics {{manager-statistics-channel}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:ChannelStatistic]]; OPERATIONS: Read;
    CONDITION: The statistic belongs to a channel of the event the manager holds the Manager role of.;
    USE-CASES: [[SCENARIO:export-data-stats]];
    The manager inspects the number of viewers per channel over time.

-   Inspect the Viewer Statistics {{manager-statistics-user}}; ROLE: [[ROLE:manager]]; ENTITY: [[ENTITY:UserStatistic]]; OPERATIONS: Read;
    CONDITION: The statistic belongs to a user of the event the manager holds the Manager role of.;
    USE-CASES: [[SCENARIO:export-data-stats]];
    The manager inspects the audience composition by country, browser, device, and viewport.

-   Provision Events {{administrator-events}}; ROLE: [[ROLE:administrator]]; ENTITY: [[ENTITY:Event]]; OPERATIONS: Create, Read;
    CONDITION: The operation is performed through the configuration, not through the user interface of the event.;
    The administrator creates the configured events with their settings, reading them back but none of their audience data, outside any use case.

-   Provision Channels {{administrator-channels}}; ROLE: [[ROLE:administrator]]; ENTITY: [[ENTITY:Channel]]; OPERATIONS: Create, Read;
    CONDITION: The operation is performed through the configuration.;
    The administrator creates the initial channels of a provisioned event, which the manager lays out further, outside any use case.

-   Provision Resources {{administrator-resources}}; ROLE: [[ROLE:administrator]]; ENTITY: [[ENTITY:Resource]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The operation is performed through the configuration.;
    RULES: [[RULE:single-resource]];
    The administrator binds the resources of the channels to the configured streaming providers, outside any use case.

-   Provision Provider Parameters {{administrator-params}}; ROLE: [[ROLE:administrator]]; ENTITY: [[ENTITY:ResourceProviderParam]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The operation is performed through the configuration.;
    The administrator supplies the key-value parameters each streaming provider needs to address its stream, outside any use case.

-   Grant the Manager Role {{administrator-manager-role}}; ROLE: [[ROLE:administrator]]; ENTITY: [[ENTITY:Role]]; OPERATIONS: Create, Read, Delete;
    CONDITION: The role is a Manager role, granted through the configuration.;
    RULES: [[RULE:manager-retained]];
    The administrator grants the initial Manager role of a provisioned event by email, from which the manager proceeds on their own, outside any use case.
