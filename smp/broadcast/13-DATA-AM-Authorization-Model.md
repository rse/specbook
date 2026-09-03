---
Created:  2026-08-30 12:00
Modified: 2026-08-30 12:00
---

DATA: Authorization Model (AM)
==============================

ROLE: Attendee {{attendee}}
--------------

-   ACTORS: [[PERSONA:attendee]]
-   TERM:   [[TERM:attendee]]

The attendee watches the stream of the event they were invited to and
takes part in its interaction with messages and likes of their own,
BECAUSE the audience has to participate without ever gaining a view on
the moderation or on the personal data of other attendees.

### PERMISSION

-   Enter the Event {{attendee-enter-event}}; ENTITY: [[ENTITY:Event]]; OPERATIONS: Read;
    STATES: [[STATE:Published]], [[STATE:Running]];
    CONDITION: The email of the attendee is on the access list or matches the access email pattern of the event, or the event allows anonymous access.;
    RULES: [[RULE:access-grant]], [[RULE:no-accounts]];
    The attendee sees the event with its login and interaction information, but none of its configuration.

-   Prove the Email Address {{attendee-prove-email}}; ENTITY: [[ENTITY:AuthorizationToken]];
    OPERATIONS: [[TRANSITION:send]], [[consume]], [[consume-automatic]];
    CONDITION: The token was issued for the email address of the attendee.;
    RULES: [[RULE:token-format]], [[RULE:single-session]];
    The attendee requests, receives, and returns the one-time token of their own login challenge.

-   Watch the Active Channel {{attendee-watch-channel}}; ENTITY: [[ENTITY:Channel]]; OPERATIONS: Read;
    CONDITION: The channel belongs to the event the attendee entered.;
    RULES: [[RULE:single-channel]];
    The attendee sees the channels of the event and follows the active one.

-   Play the Active Resource {{attendee-play-resource}}; ENTITY: [[ENTITY:Resource]]; OPERATIONS: Read;
    CONDITION: The resource backs a channel of the event the attendee entered.;
    RULES: [[RULE:single-resource]];
    The attendee plays the active resource, or the resource named by the event URL, without seeing its provider parameters.

-   Follow the Agenda {{attendee-follow-agenda}}; ENTITY: [[ENTITY:AgendaPoint]]; OPERATIONS: Read;
    CONDITION: The agenda point belongs to the event the attendee entered.;
    The attendee sees the agenda of the event and which agenda point is currently active.

-   Send Messages {{attendee-send-message}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Create;
    CONDITION: The event is running, the type of the message is enabled for the event, and the throttling limit is not exceeded.;
    RULES: [[RULE:moderation-gate]], [[RULE:type-states]];
    The attendee sends chat, question, and support messages of their own, which start in the state the moderation setting of the event determines.

-   Read Visible Messages {{attendee-read-message}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    STATES: [[STATE:Accepted]], [[STATE:Forwarded]], [[STATE:Answered]], [[STATE:Suspended]];
    CONDITION: The message is a chat, a question the event does not keep private, or a support message of the attendee's own conversation.;
    RULES: [[RULE:moderation-gate]];
    The attendee reads the messages which passed the moderation, with their texts and like counts, under the sender name the event configures.

-   Track Own Messages {{attendee-track-own}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    STATES: [[STATE:Pending]];
    CONDITION: The attendee is the sender of the message.;
    RULES: [[RULE:moderation-gate]];
    The attendee sees their own messages while they still await the moderation decision.

-   Correct Own Messages {{attendee-edit-own}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Update, Delete;
    STATES: [[STATE:Pending]], [[STATE:Accepted]];
    CONDITION: The attendee is the sender of the message.;
    RULES: [[RULE:forward-lock]], [[RULE:moderation-gate]];
    The attendee edits or deletes their own chat messages and questions until a question is forwarded, where an edit is marked and moderated again as the event requires.

-   Like Messages {{attendee-like}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Update;
    STATES: [[STATE:Accepted]], [[STATE:Forwarded]], [[STATE:Answered]], [[STATE:Suspended]];
    CONDITION: The update is confined to adding or revoking the attendee's own like on a chat or question of another attendee.;
    RULES: [[RULE:like-count]];
    The attendee likes the visible messages of others and revokes the like again until the event finishes.

-   Use Public Tags {{attendee-use-tags}}; ENTITY: [[ENTITY:QuestionTag]]; OPERATIONS: Read;
    CONDITION: The tag is not reserved for moderators.;
    The attendee sees the available tags of the event and attaches them to their own questions.

ROLE: Moderator {{moderator}}
---------------

-   ACTORS: [[PERSONA:moderator-qa]], [[PERSONA:moderator-chat]]
-   TERM:   [[TERM:moderator]]

The moderator gatekeeps the interaction of a running event by deciding,
answering, forwarding, and seeding messages and by steering the
presenter, where the Q&A moderator and the chat moderator hold the very
same role and split the work by message type by convention only, BECAUSE
the audience has to see only what the organizers approve while the
presenter receives a curated selection.

### PERMISSION

-   Enter the Event {{moderator-enter-event}}; ENTITY: [[ENTITY:Event]]; OPERATIONS: Read;
    STATES: [[STATE:Planning]], [[STATE:Published]], [[STATE:Running]];
    CONDITION: The moderator holds the Moderator role of the event.;
    RULES: [[RULE:anonymize]];
    The moderator sees the event with its interaction settings, also before it is published for the rehearsal, but loses the access when the event finishes, as the anonymization deletes the Moderator roles.

-   Steer the Presenter {{moderator-steer-presenter}}; ENTITY: [[ENTITY:Event]]; OPERATIONS: Update;
    STATES: [[STATE:Running]];
    CONDITION: The update is confined to the presenter alert and the active agenda point of the event.;
    The moderator raises the presenter alert and advances the active agenda point, but changes no other setting of the event.

-   Review All Messages {{moderator-read-messages}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    CONDITION: The message belongs to the event the moderator holds the Moderator role of.;
    The moderator reads every message of the event in every state, with its sender, sentiment score, and like count.

-   Decide Pending Messages {{moderator-decide}}; ENTITY: [[ENTITY:Message]];
    OPERATIONS: [[TRANSITION:accept]], [[TRANSITION:reject]];
    RULES: [[RULE:moderation-gate]], [[RULE:sentiment-threshold]];
    The moderator accepts or rejects the pending chats and questions, where the server-side sentiment analysis decides in their place if the event so configures.

-   Forward Questions {{moderator-forward}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: [[TRANSITION:forward]], Update;
    STATES: [[STATE:Accepted]], [[STATE:Forwarded]];
    CONDITION: The message is a question, and the update is confined to the presenter annotation, the ordering, and the tags of the message.;
    RULES: [[RULE:type-states]], [[RULE:forward-lock]];
    The moderator forwards accepted questions to the presenter in a chosen order, attaching hints and tags, while the text of the question stays untouched.

-   Process Forwarded Questions {{moderator-process}}; ENTITY: [[ENTITY:Message]];
    OPERATIONS: [[TRANSITION:answer]], [[TRANSITION:suspend]];
    The moderator marks a forwarded question answered or suspended on behalf of the presenter.

-   Author Messages {{moderator-author}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Create;
    CONDITION: The event is running.;
    RULES: [[RULE:moderator-accept]];
    The moderator answers attendees publicly or privately and seeds the conversation, where the messages are created directly in state accepted under the sender name "Moderator" unless overridden.

-   Use All Tags {{moderator-use-tags}}; ENTITY: [[ENTITY:QuestionTag]]; OPERATIONS: Read;
    The moderator uses every tag of the event on questions, including the ones reserved for moderators.

ROLE: Presenter {{presenter}}
---------------

-   ACTORS: [[PERSONA:presenter]]
-   TERM:   [[TERM:presenter]]

The presenter receives the curated questions on stage and records their
processing, seeing nothing else of the interaction, BECAUSE the person
on air has to be shielded from the raw audience input.

### PERMISSION

-   Enter the Event {{presenter-enter-event}}; ENTITY: [[ENTITY:Event]]; OPERATIONS: Read;
    STATES: [[STATE:Planning]], [[STATE:Published]], [[STATE:Running]];
    CONDITION: The presenter holds the Presenter role of the event.;
    The presenter sees the event with its agenda and presenter alert, also before it is published for the rehearsal.

-   Confirm the Alert {{presenter-confirm-alert}}; ENTITY: [[ENTITY:Event]]; OPERATIONS: Update;
    STATES: [[STATE:Running]];
    CONDITION: The update is confined to unraising the presenter alert of the event.;
    The presenter confirms a raised alert, which takes it off the stage view again.

-   Read Forwarded Questions {{presenter-read-forwarded}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    STATES: [[STATE:Forwarded]], [[STATE:Answered]], [[STATE:Suspended]];
    RULES: [[RULE:forward-lock]];
    The presenter sees the forwarded questions in their order with the moderator hints, and never the pending, accepted, or rejected messages.

-   Process Forwarded Questions {{presenter-process}}; ENTITY: [[ENTITY:Message]];
    OPERATIONS: [[TRANSITION:answer]], [[TRANSITION:suspend]];
    The presenter marks a forwarded question answered once addressed on stage, or suspended when it will not be addressed.

ROLE: Manager {{manager}}
-------------

-   ACTORS: [[PERSONA:manager]]
-   TERM:   [[TERM:manager]]

The manager owns an event from its configuration through its live run to
its archived export, without taking part in the moderation, BECAUSE one
accountable role has to control the visibility, the audience, and the
lifecycle of the event.

### PERMISSION

-   Configure the Event {{manager-configure-event}}; ENTITY: [[ENTITY:Event]]; OPERATIONS: Read, Update;
    CONDITION: The manager holds the Manager role of the event.;
    RULES: [[RULE:manager-retained]];
    The manager reads and edits every setting of the event in every state, keeping the access after the event finishes for the export.

-   Run the Event {{manager-run-event}}; ENTITY: [[ENTITY:Event]];
    OPERATIONS: [[TRANSITION:publish]], [[start]], [[start-unpublished]], [[TRANSITION:finish]];
    RULES: [[RULE:anonymize]];
    The manager publishes, starts, and finishes the event, where finishing triggers the anonymization.

-   Delete the Event {{manager-delete-event}}; ENTITY: [[ENTITY:Event]]; OPERATIONS: Delete;
    CONDITION: The manager holds the Manager role of the event.;
    RULES: [[RULE:manager-retained]], [[RULE:no-accounts]];
    The manager deletes the event entirely, which deletes the remaining Manager roles with it.

-   Lay Out the Channels {{manager-channels}}; ENTITY: [[ENTITY:Channel]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The channel belongs to the event the manager holds the Manager role of.;
    RULES: [[RULE:single-channel]];
    The manager defines the channels of the event and switches the active one.

-   Switch the Resource {{manager-resources}}; ENTITY: [[ENTITY:Resource]]; OPERATIONS: Read, Update;
    CONDITION: The update is confined to activating a resource of a channel of the event.;
    RULES: [[RULE:single-resource]];
    The manager switches the active resource of a channel to a fallback streaming provider, without changing the provider parameters.

-   Grant Event Roles {{manager-roles}}; ENTITY: [[ENTITY:Role]]; OPERATIONS: Create, Read, Delete;
    CONDITION: The role belongs to the event the manager holds the Manager role of.;
    RULES: [[RULE:no-accounts]], [[RULE:anonymize]];
    The manager grants and revokes the Manager, Moderator, and Presenter roles of the event by email.

-   Maintain the Access List {{manager-access-list}}; ENTITY: [[ENTITY:User]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The user is on the access list of the event the manager holds the Manager role of.;
    RULES: [[RULE:access-grant]], [[RULE:no-accounts]];
    The manager invites attendees by email, individually or by importing the sheet of the Event Registration System, and removes them again, where a removed user without a role ceases to exist.

-   Issue Access Tokens {{manager-tokens}}; ENTITY: [[ENTITY:AuthorizationToken]]; OPERATIONS: Create, Read;
    STATES: [[STATE:Issued]];
    CONDITION: The token belongs to the event the manager holds the Manager role of.;
    RULES: [[RULE:token-format]];
    The manager pre-generates the tokens of the imported attendees and exports their personal access URLs, seeing the tokens in state issued only.

-   Curate the Tags {{manager-tags}}; ENTITY: [[ENTITY:QuestionTag]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The tag belongs to the event the manager holds the Manager role of.;
    The manager defines the tag vocabulary of the event, including the tags reserved for moderators.

-   Curate the Agenda {{manager-agenda}}; ENTITY: [[ENTITY:AgendaPoint]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The agenda point belongs to the event the manager holds the Manager role of.;
    The manager defines the ordered agenda of the event and the tags corresponding to its points.

-   Export the Messages {{manager-export-messages}}; ENTITY: [[ENTITY:Message]]; OPERATIONS: Read;
    CONDITION: The message belongs to the event the manager holds the Manager role of.;
    RULES: [[RULE:like-count]], [[RULE:manager-retained]];
    The manager reads every message of the event with its texts, timestamps, state, and like count, and exports them after the event has finished.

-   Inspect the Event Statistics {{manager-statistics-event}}; ENTITY: [[ENTITY:EventStatistic]]; OPERATIONS: Read;
    CONDITION: The statistic belongs to the event the manager holds the Manager role of.;
    The manager inspects the curve of logged-in attendees and the login challenge counts over time.

-   Inspect the Channel Statistics {{manager-statistics-channel}}; ENTITY: [[ENTITY:ChannelStatistic]]; OPERATIONS: Read;
    CONDITION: The statistic belongs to a channel of the event the manager holds the Manager role of.;
    The manager inspects the number of viewers per channel over time.

-   Inspect the Viewer Statistics {{manager-statistics-user}}; ENTITY: [[ENTITY:UserStatistic]]; OPERATIONS: Read;
    CONDITION: The statistic belongs to a user of the event the manager holds the Manager role of.;
    The manager inspects the audience composition by country, browser, device, and viewport.

ROLE: Administrator {{administrator}}
-------------------

-   ACTORS: [[PERSONA:administrator]]
-   TERM:   [[TERM:administrator]]

The administrator provisions the events and the streaming providers
through the configuration of the software, without ever touching the
attendees and their messages, BECAUSE the operation of the platform has
to be reproducible from configuration and free of personal data.

### PERMISSION

-   Provision Events {{administrator-events}}; ENTITY: [[ENTITY:Event]]; OPERATIONS: Create, Read;
    CONDITION: The operation is performed through the configuration, not through the user interface of the event.;
    The administrator creates the configured events with their settings, reading them back but none of their audience data.

-   Provision Channels {{administrator-channels}}; ENTITY: [[ENTITY:Channel]]; OPERATIONS: Create, Read;
    CONDITION: The operation is performed through the configuration.;
    The administrator creates the initial channels of a provisioned event, which the manager lays out further.

-   Provision Resources {{administrator-resources}}; ENTITY: [[ENTITY:Resource]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The operation is performed through the configuration.;
    RULES: [[RULE:single-resource]];
    The administrator binds the resources of the channels to the configured streaming providers.

-   Provision Provider Parameters {{administrator-params}}; ENTITY: [[ENTITY:ResourceProviderParam]]; OPERATIONS: Create, Read, Update, Delete;
    CONDITION: The operation is performed through the configuration.;
    The administrator supplies the key-value parameters each streaming provider needs to address its stream.

-   Grant the Manager Role {{administrator-manager-role}}; ENTITY: [[ENTITY:Role]]; OPERATIONS: Create, Read, Delete;
    CONDITION: The role is a Manager role, granted through the configuration.;
    RULES: [[RULE:manager-retained]];
    The administrator grants the initial Manager role of a provisioned event by email, from which the manager proceeds on their own.

