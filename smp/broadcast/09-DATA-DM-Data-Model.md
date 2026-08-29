---
Created:  2026-06-18 10:18
Modified: 2026-08-29 17:28
---

#   DATA: Data Model (DM)

##  ENTITY: Event (*)

-   REQUIREMENTS: [[FR.individual-url]], [[FR.authentication]], [[FR.automatic-url]],
    [[FR.user-consent]], [[FR.info-messages]], [[FR.name-appearance]], [[FR.chat]],
    [[FR.replies]], [[FR.questions]], [[FR.moderation]], [[FR.client-sentiment]],
    [[FR.server-sentiment]], [[FR.presenter-hints]], [[FR.manage-app]],
    [[FR.config-propagation]], [[FR.event-portability]]
-   TERMS: [[TERM:event]]

The master entity describing a single live broadcast event and all of its configuration,
BECAUSE the entire data model is event-centric and every other entity hangs off an event.

-   ATTRIBUTE: eventId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the event used in the access URL,
    BECAUSE attendees reach a specific event by an unguessable link.

-   ATTRIBUTE: title (*); TYPE: `string`;
    Display title of the event such as "Townhall 1/23",
    BECAUSE attendees and managers need a human-readable label.

-   ATTRIBUTE: description (*); TYPE: `string`;
    Free-text description of the event,
    BECAUSE organizers describe the purpose and content of the event.

-   ATTRIBUTE: begin (*); TYPE: `datetime`;
    Planned start date and time of the event,
    BECAUSE attendees and operators must know when the event starts.

-   ATTRIBUTE: end (*); TYPE: `datetime`;
    Planned end date and time of the event,
    BECAUSE scheduling and the finish procedure depend on the planned end.

-   ATTRIBUTE: language; TYPE: `string`; DEFAULT: `en`;
    Targeted mother language of the event,
    BECAUSE it sets the default language despite on-the-fly translation of interaction.

-   ATTRIBUTE: state; TYPE: `enum(planning,published,running,finished)`; DEFAULT: `planning`;
    Lifecycle state controlling attendee visibility and access,
    BECAUSE an event progresses from private setup to live to archived.

-   ATTRIBUTE: loginInfo; TYPE: `string`; DEFAULT: `""`;
    HTML markup shown to attendees at login,
    BECAUSE managers convey event information and links at entry.

-   ATTRIBUTE: loginInfoToBeAccepted; TYPE: `boolean`; DEFAULT: `false`;
    Whether the login information must be explicitly accepted,
    BECAUSE some events require acknowledged consent before joining.

-   ATTRIBUTE: interactionInfo; TYPE: `string`; DEFAULT: `""`;
    HTML markup shown when interaction is enabled,
    BECAUSE conduct rules must be presented before chat or questions.

-   ATTRIBUTE: interactionInfoToBeAccepted; TYPE: `boolean`; DEFAULT: `false`;
    Whether the interaction information must be explicitly accepted,
    BECAUSE some events require acknowledged conduct rules before interacting.

-   ATTRIBUTE: allowAccessAnonymous; TYPE: `boolean`; DEFAULT: `false`;
    Whether anonymous attendees may access the event without authorization,
    BECAUSE public events accept unauthenticated viewers.

-   ATTRIBUTE: accessEmailPattern; TYPE: `string`; DEFAULT: `""`;
    Pattern that grants access to any matching email beyond the access list,
    BECAUSE events can admit whole email domains without enumerating users.

-   ATTRIBUTE: chatEnabled; TYPE: `boolean`; DEFAULT: `false`;
    Whether attendees may send chat messages,
    BECAUSE chat is an optional interaction channel per event.

-   ATTRIBUTE: chatAllowAnonymous; TYPE: `boolean`; DEFAULT: `false`;
    Whether chat messages may be sent as "Anonymous",
    BECAUSE events differ in how much chat identity is revealed.

-   ATTRIBUTE: chatName; TYPE: `enum(full,firstname,anonymous)`; DEFAULT: `full`;
    How the attendee name appears on chat messages,
    BECAUSE the event controls the displayed chat identity.

-   ATTRIBUTE: chatReply; TYPE: `boolean`; DEFAULT: `false`;
    Whether chat messages may be replied to,
    BECAUSE threaded replies are appropriate only for some events.

-   ATTRIBUTE: chatThrottling; TYPE: `integer`; DEFAULT: 1;
    Maximum chat messages per user per minute,
    BECAUSE rate limiting prevents denial-of-service abuse.

-   ATTRIBUTE: chatModerator; TYPE: `boolean`; DEFAULT: `false`;
    Whether chat messages are moderated before becoming visible,
    BECAUSE organizers may require approval of chat content.

-   ATTRIBUTE: supportEnabled; TYPE: `boolean`; DEFAULT: `false`;
    Whether attendees may chat with support for technical problems,
    BECAUSE events may offer a dedicated support channel.

-   ATTRIBUTE: appEnabled; TYPE: `boolean`; DEFAULT: `false`;
    Whether a third-party application is integrated,
    BECAUSE events may embed an interactive app.

-   ATTRIBUTE: appTitle; TYPE: `string`; DEFAULT: `""`;
    Display title of the embedded third-party application,
    BECAUSE the embedded app needs a label for attendees.

-   ATTRIBUTE: appURL; TYPE: `string`; DEFAULT: `""`;
    URL of the embedded third-party application,
    BECAUSE the client must load the app from a defined location.

-   ATTRIBUTE: appAdminURL; TYPE: `string`; DEFAULT: `""`;
    Administration URL of the embedded third-party application,
    BECAUSE moderators control the app through a separate admin view.

-   ATTRIBUTE: presenterAlert; TYPE: `string`; DEFAULT: `""`;
    Alert text a moderator can raise for the presenter,
    BECAUSE the moderator must signal urgent information to the presenter.

-   ATTRIBUTE: presenterAlertState; TYPE: `enum(raised,unraised)`; DEFAULT: `unraised`;
    Whether the presenter alert is currently visible to the presenter,
    BECAUSE the alert is toggled on by the moderator and confirmed off.

-   ATTRIBUTE: questionsEnabled; TYPE: `boolean`; DEFAULT: `false`;
    Whether attendees may ask questions,
    BECAUSE questions are an optional interaction channel per event.

-   ATTRIBUTE: questionsAllowAnonymous; TYPE: `boolean`; DEFAULT: `false`;
    Whether questions may be sent as "Anonymous",
    BECAUSE events differ in how much question identity is revealed.

-   ATTRIBUTE: questionsName; TYPE: `enum(full,firstname,anonymous)`; DEFAULT: `full`;
    How the attendee name appears on questions,
    BECAUSE the event controls the displayed question identity.

-   ATTRIBUTE: questionsThrottling; TYPE: `integer`; DEFAULT: 1;
    Maximum questions per user per time window,
    BECAUSE rate limiting prevents abuse of the question channel.

-   ATTRIBUTE: questionsPrivate; TYPE: `boolean`; DEFAULT: `false`;
    Whether questions are hidden from other attendees and seen only by moderators,
    BECAUSE some events keep questions private to the moderation team.

-   ATTRIBUTE: questionsModerator; TYPE: `boolean`; DEFAULT: `false`;
    Whether questions are moderated before becoming visible,
    BECAUSE organizers may require approval of questions.

-   ATTRIBUTE: expireAuthTokenOnFirstUse; TYPE: `boolean`; DEFAULT: `true`;
    Whether pre-generated authorization tokens expire after first use,
    BECAUSE events choose between one-time and reusable pre-generated tokens.

-   ATTRIBUTE: sentimentSenderAnalysis; TYPE: `boolean`; DEFAULT: `false`;
    Whether lightweight client-side sentiment analysis is enabled,
    BECAUSE the event can check input at the source before sending.

-   ATTRIBUTE: sentimentSenderAutoPrevent; TYPE: `boolean`; DEFAULT: `false`;
    Whether improper input is prevented from submission on the client,
    BECAUSE the event can block misconduct before it reaches the server.

-   ATTRIBUTE: sentimentModeratorAnalysis; TYPE: `boolean`; DEFAULT: `false`;
    Whether full server-side sentiment analysis is enabled,
    BECAUSE the event can check input before it is stored.

-   ATTRIBUTE: sentimentModeratorAutoAccept; TYPE: `boolean`; DEFAULT: `false`;
    Whether proper input is auto-accepted on the server,
    BECAUSE moderators can be relieved of approving positive input.

-   ATTRIBUTE: sentimentModeratorAutoReject; TYPE: `boolean`; DEFAULT: `false`;
    Whether improper input is auto-rejected on the server,
    BECAUSE moderators can be relieved of rejecting negative input.

-   RELATION: channels; TARGET: [[ENTITY:Channel]]; ARITY: `0..n`;
    Language-specific content distributors of the event,
    BECAUSE an event delivers content through one or more logical channels.

-   RELATION: roles; TARGET: [[ENTITY:Role]]; ARITY: `0..n`;
    Manager, Moderator, and Presenter roles for the event,
    BECAUSE event-specific rights are granted through roles.

-   RELATION: accessList; TARGET: [[ENTITY:User]]; ARITY: `0..n`;
    Invited attendees identified by email,
    BECAUSE access is granted to an explicit list of users.

-   RELATION: messages; TARGET: [[ENTITY:Message]]; ARITY: `0..n`;
    Messages written during the event,
    BECAUSE all chat, question, and support input belongs to the event.

-   RELATION: statistics; TARGET: [[ENTITY:EventStatistic]]; ARITY: `0..n`;
    Periodic cumulative statistics snapshots,
    BECAUSE trend visualization requires periodic counts.

-   RELATION: availableQuestionTags; TARGET: [[ENTITY:QuestionTag]]; ARITY: `0..n`;
    Tags available for use on questions,
    BECAUSE the event defines the vocabulary for tagging questions.

-   RELATION: activeAgendaPoint; TARGET: [[ENTITY:AgendaPoint]]; ARITY: `0..1`;
    The currently active agenda point,
    BECAUSE attendees see which phase of the event is current.

-   RELATION: agendaPoints; TARGET: [[ENTITY:AgendaPoint]]; ARITY: `0..n`;
    All agenda points of the event,
    BECAUSE the event has an ordered agenda of phases.

##  ENTITY: AgendaPoint

-   REQUIREMENTS: [[FR.question-tags]]
-   TERMS: [[TERM:agendapoint]]

The textual description of a phase in an event,
BECAUSE attendees and moderators track which part of the event is currently active.

-   ATTRIBUTE: agendaPointId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the agenda point,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: text (*); TYPE: `string`;
    Description of the current phase of the event,
    BECAUSE the phase must be presented in human-readable form.

-   ATTRIBUTE: orderPosition (*); TYPE: `integer`;
    Ordering position of the phase,
    BECAUSE agenda points have a defined sequence.

-   RELATION: correspondingTags; TARGET: [[ENTITY:QuestionTag]]; ARITY: `0..n`;
    Question tags corresponding to this agenda point,
    BECAUSE questions can be associated with the agenda phase they relate to.

##  ENTITY: Channel

-   REQUIREMENTS: [[FR.multi-provider]], [[FR.provider-switch]], [[FR.channel-stats]]
-   TERMS: [[TERM:channel]]

A logical content delivery stream linking video streams to an event,
BECAUSE an event groups its streams by language and resolution into channels.

-   ATTRIBUTE: channelId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the channel,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: name (*); TYPE: `string`;
    Display name of the channel such as "Digital Townhall",
    BECAUSE attendees choose between named channels.

-   ATTRIBUTE: active; TYPE: `boolean`; DEFAULT: `false`;
    Whether the channel is the currently active one,
    BECAUSE only one channel of an event is active at once.

-   ATTRIBUTE: default; TYPE: `boolean`; DEFAULT: `false`;
    Whether this channel is activated by default on entering an event,
    BECAUSE attendees need a defined initial channel.

-   RELATION: resources; TARGET: [[ENTITY:Resource]]; ARITY: `1..n`;
    Physical resources backing the channel,
    BECAUSE a channel is delivered by one or more provider resources.

-   RELATION: statistics; TARGET: [[ENTITY:ChannelStatistic]]; ARITY: `0..n`;
    Periodic viewer statistics of the channel,
    BECAUSE organizers track viewers per channel over time.

##  ENTITY: Resource

-   REQUIREMENTS: [[FR.multi-provider]], [[FR.provider-switch]], [[FR.resource-url]]
-   TERMS: [[TERM:resource]], [[TERM:provider]]

A physical content delivery resource such as a provider stream or static website linked to a channel,
BECAUSE a channel must map to concrete provider endpoints to be playable.

-   ATTRIBUTE: resourceId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the resource,
    BECAUSE it is referenced as a foreign key and in the access URL.

-   ATTRIBUTE: providerId (*); TYPE: `string`;
    Provider identifier from the event configuration file,
    BECAUSE a resource binds to a specific configured streaming provider.

-   ATTRIBUTE: active; TYPE: `boolean`; DEFAULT: `false`;
    Whether this resource is the active resource of the channel,
    BECAUSE only one resource of a channel is active at once for provider switching.

-   RELATION: params; TARGET: [[ENTITY:ResourceProviderParam]]; ARITY: `0..n`;
    Provider key-value parameters assigned to this resource,
    BECAUSE each provider needs configured parameters to address its stream.

##  ENTITY: ResourceProviderParam

-   REQUIREMENTS: [[FR.multi-provider]]
-   TERMS: [[TERM:provider]]

A key-value parameter belonging to exactly one resource and provider, defined in the event configuration file,
BECAUSE provider endpoints are parameterized by values an administrator supplies.

-   ATTRIBUTE: resourceId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Identifier of the owning resource,
    BECAUSE the parameter belongs to exactly one resource.

-   ATTRIBUTE: providerId (*); TYPE: `key string`;
    Provider identifier from the configuration file,
    BECAUSE the parameter is scoped to one provider.

-   ATTRIBUTE: key (*); TYPE: `key string`;
    Parameter key defined in the configuration file,
    BECAUSE each provider parameter is identified by its key.

-   ATTRIBUTE: value (*); TYPE: `string`;
    Value the administrator entered for the key,
    BECAUSE the concrete endpoint requires the supplied value.

##  ENTITY: Role

-   REQUIREMENTS: [[FR.moderation]], [[FR.forward-presenter]], [[FR.export-inputs]]
-   TERMS: [[TERM:role]], [[TERM:manager]], [[TERM:moderator]], [[TERM:presenter]]

A grant of special rights to a specific user within an event,
BECAUSE the application is role-based and rights are granted through roles.

-   ATTRIBUTE: roleId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the role,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: type; TYPE: `enum(Manager,Moderator,Presenter)`; DEFAULT: `Presenter`;
    The role granted to the person for the event,
    BECAUSE each role carries a distinct set of rights.

-   ATTRIBUTE: email (*); TYPE: `string`;
    Email address of the authorized person,
    BECAUSE roles are granted by email without permanent accounts.

##  ENTITY: User

-   REQUIREMENTS: [[FR.authentication]], [[FR.name-appearance]], [[FR.likes]],
    [[FR.personalized-url]], [[FR.registration-import]]
-   TERMS: [[TERM:user]], [[TERM:attendee]], [[TERM:accesslist]]

A helper entity enabling event-based logins for invited or pattern-matched attendees,
BECAUSE the system holds no permanent accounts yet must identify attendees per event.

-   ATTRIBUTE: userId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the user,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: email (*); TYPE: `string`;
    Concrete email address of the user,
    BECAUSE authorization tokens are sent to this address at login.

-   ATTRIBUTE: firstname; TYPE: `string`; DEFAULT: `""`;
    Optional first name of the user,
    BECAUSE it is displayed on the user's chat and question messages.

-   ATTRIBUTE: lastname; TYPE: `string`; DEFAULT: `""`;
    Optional last name of the user,
    BECAUSE it is displayed on the user's chat and question messages.

-   RELATION: likes; TARGET: [[ENTITY:Message]]; ARITY: `0..n`;
    Messages the user marked as liked,
    BECAUSE likes are tracked per user until anonymization.

-   RELATION: sentMessages; TARGET: [[ENTITY:Message]]; ARITY: `0..n`;
    Messages the user has sent,
    BECAUSE authorship links a message to its sending user.

-   RELATION: statistics; TARGET: [[ENTITY:UserStatistic]]; ARITY: `0..n`;
    Periodic statistics about the user,
    BECAUSE viewer information is captured per user over time.

##  ENTITY: Message

-   REQUIREMENTS: [[FR.chat]], [[FR.questions]], [[FR.likes]], [[FR.replies]],
    [[FR.moderation]], [[FR.forward-presenter]], [[FR.answer-inputs]],
    [[FR.moderator-messages]], [[FR.message-editing]], [[FR.deleted-placeholder]],
    [[FR.server-sentiment]], [[FR.sort-filter]], [[FR.question-tags]], [[FR.export-inputs]]
-   TERMS: [[TERM:message]], [[TERM:chat]], [[TERM:question]], [[TERM:support]], [[TERM:like]],
    [[TERM:sentiment]]

A single chat, support, or question item tracked for attendees and moderators,
BECAUSE all event interaction is represented uniformly as messages with language-specific texts.

-   ATTRIBUTE: messageId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the message,
    BECAUSE it is the foreign key for the translated message texts.

-   ATTRIBUTE: type; TYPE: `enum(Chat,Support,Question)`; DEFAULT: `Chat`;
    The kind of message,
    BECAUSE each type has a distinct lifecycle and visibility.

-   ATTRIBUTE: timestamp; TYPE: `datetime`; DEFAULT: `Date.now()`;
    Time the sender created the message,
    BECAUSE ordering and export require the creation time.

-   ATTRIBUTE: timestampAnswered; TYPE: `datetime`; DEFAULT: `Date.now()`;
    Time the message was answered,
    BECAUSE the presenter records when a question was answered.

-   ATTRIBUTE: state; TYPE: `enum(pending,accepted,rejected,forwarded,answered,suspended)`;
    Moderation and processing state of the message,
    BECAUSE the message moves through a defined moderation and presentation lifecycle.

-   ATTRIBUTE: originalLanguage; TYPE: `string`;
    Language the sender originally wrote the message in,
    BECAUSE the difference between human-written and AI-translated text must always be visible.

-   ATTRIBUTE: senderName; TYPE: `string`;
    Display name shown to others for the sender,
    BECAUSE the visible name depends on event naming and anonymity options.

-   ATTRIBUTE: presenterAnnotation; TYPE: `string`;
    Hint a moderator attaches for the presenter on forwarding,
    BECAUSE the presenter benefits from routing guidance on a forwarded message.

-   ATTRIBUTE: likes; TYPE: `integer`; DEFAULT: `0`;
    Computed number of likes conserved on event finish,
    BECAUSE the like total must survive removal of liker relations for GDPR.

-   ATTRIBUTE: sentimentScore; TYPE: `float`;
    Server-side sentiment score between -1 and 1,
    BECAUSE the analysis result is stored for display and auto-moderation.

-   ATTRIBUTE: edited; TYPE: `enum(none,insignificant,significant,deleted)`;
    Whether and how the message was changed or deleted,
    BECAUSE edits must be marked for others and edits stop once forwarded.

-   RELATION: sender; TARGET: [[ENTITY:User]]; ARITY: `0..1`;
    The authoring attendee of the message,
    BECAUSE a message has an author until the sender is removed on finish.

-   RELATION: liker; TARGET: [[ENTITY:User]]; ARITY: `0..n`;
    Attendees who liked the message,
    BECAUSE likes are tracked per liking user before anonymization.

-   RELATION: event; TARGET: [[ENTITY:Event]]; ARITY: `1`;
    The event the message belongs to,
    BECAUSE the event link must persist even after senders are deleted.

-   RELATION: replyTo; TARGET: [[ENTITY:Message]]; ARITY: `0..1`;
    The message this message replies to,
    BECAUSE chat replies and moderator answers chain messages together.

-   RELATION: predecessor; TARGET: [[ENTITY:Message]]; ARITY: `0..1`;
    The preceding message in a manual ordering,
    BECAUSE moderators sort forwarded messages for the presenter.

-   RELATION: questionTags; TARGET: [[ENTITY:QuestionTag]]; ARITY: `0..n`;
    Tags attached to a question message,
    BECAUSE questions can be tagged with zero or more tags for context.

-   RELATION: messageText; TARGET: [[ENTITY:MessageText]]; ARITY: `1..n`;
    The message texts of this message,
    BECAUSE each message text can be translated to multiple languages.

##  ENTITY: MessageText

-   REQUIREMENTS: [[FR.language-switch]], [[FR.export-inputs]]
-   TERMS: [[TERM:message]]

A language-specific text of a message,
BECAUSE a message is translated into multiple languages while retaining one original.

-   ATTRIBUTE: messageTextId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the message text,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: language; TYPE: `string`;
    Language the text is written in,
    BECAUSE each text variant is identified by its language.

-   ATTRIBUTE: text; TYPE: `string`;
    The message text in the stated language,
    BECAUSE the displayed content depends on the chosen language.

##  ENTITY: QuestionTag

-   REQUIREMENTS: [[FR.question-tags]]
-   TERMS: [[TERM:questiontag]]

A named tag attachable to question messages,
BECAUSE questions are categorized by topic or addressed person for routing and grouping.

-   ATTRIBUTE: questionTagId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the question tag,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: text; TYPE: `unique string`;
    Unique tag name,
    BECAUSE tags are identified and displayed by their name.

-   ATTRIBUTE: moderatorOnly; TYPE: `boolean`;
    Whether only a Moderator or Manager may use the tag,
    BECAUSE some tags are reserved for the moderation team.

-   ATTRIBUTE: group; TYPE: `string`;
    Logical group the tag belongs to such as a topic or person,
    BECAUSE tags are organized into meaningful groups.

##  ENTITY: AuthorizationToken

-   REQUIREMENTS: [[FR.authentication]], [[FR.automatic-url]], [[FR.registration-import]],
    [[FR.registration-export]], [[FR.debug-stats]]
-   TERMS: [[TERM:authtoken]]

A one-time second factor proving an attendee controls the email address used as the first factor,
BECAUSE email-verified access is the core mechanism limiting the audience.

-   ATTRIBUTE: token (*); TYPE: `string`; CONSTRAINT: `six digits as NNN-NNN`;
    The generated one-time token for the next login attempt,
    BECAUSE the attendee proves control of the email by returning this token.

-   ATTRIBUTE: validUntil; TYPE: `datetime`; DEFAULT: `Date.now() + 1d`;
    Expiry time of the token, unset for pre-generated tokens,
    BECAUSE ordinary tokens expire within minutes while pre-generated ones last until event end.

-   ATTRIBUTE: state; TYPE: `enum(issued,sent,used)`; DEFAULT: `issued`;
    Lifecycle state of the token,
    BECAUSE debugging statistics and anonymized sums need the token state.

-   RELATION: user; TARGET: [[ENTITY:User]]; ARITY: `1`;
    The user the token was issued for,
    BECAUSE a token authorizes exactly one user.

-   RELATION: event; TARGET: [[ENTITY:Event]]; ARITY: `1`;
    The event the token was issued for,
    BECAUSE a token grants access to exactly one event.

##  ENTITY: SessionToken

-   REQUIREMENTS: [[FR.authentication]], [[FR.parallel-access]], [[FR.event-stats]]
-   TERMS: [[TERM:sessiontoken]]

The result of a successful login of a user to an event,
BECAUSE an active session must be tracked to enforce single concurrent access.

-   ATTRIBUTE: sessionId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the session,
    BECAUSE the active session of a user for an event must be addressable.

-   ATTRIBUTE: issuedAt; TYPE: `datetime`; DEFAULT: `Date.now()`;
    Time the user successfully entered the event,
    BECAUSE the session start time is recorded for tracking.

-   RELATION: user; TARGET: [[ENTITY:User]]; ARITY: `1`;
    The user the session was issued for,
    BECAUSE a session belongs to exactly one user.

-   RELATION: event; TARGET: [[ENTITY:Event]]; ARITY: `1`;
    The event the session was issued for,
    BECAUSE a session grants access to exactly one event.

##  ENTITY: EventStatistic

-   REQUIREMENTS: [[FR.event-stats]], [[FR.debug-stats]]

A periodic cumulative snapshot of event-wide counts,
BECAUSE trend visualization of audience size and authentication flow requires regular snapshots.

-   ATTRIBUTE: eventStatisticId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the event statistic,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: timestamp; TYPE: `datetime`; DEFAULT: `Date.now()`;
    Time the snapshot was created,
    BECAUSE statistics are plotted over time.

-   ATTRIBUTE: numberOfIssuedAuthTokens (*); TYPE: `integer`;
    Count of issued authorization tokens at the timestamp,
    BECAUSE debugging statistics track issued tokens.

-   ATTRIBUTE: numberOfSentAuthTokens (*); TYPE: `integer`;
    Count of sent authorization tokens at the timestamp,
    BECAUSE debugging statistics track sent tokens.

-   ATTRIBUTE: numberOfUsedAuthTokens (*); TYPE: `integer`;
    Count of used authorization tokens at the timestamp,
    BECAUSE debugging statistics track used tokens.

-   ATTRIBUTE: numberOfSessionTokens (*); TYPE: `integer`;
    Count of session tokens at the timestamp,
    BECAUSE logged-in users are derived from session tokens.

-   ATTRIBUTE: numberOfConnections (*); TYPE: `integer`;
    Count of active MQTT connections at the timestamp,
    BECAUSE active viewers differ from sessions once an attendee leaves.

##  ENTITY: ChannelStatistic

-   REQUIREMENTS: [[FR.channel-stats]]

A periodic count of viewers for a channel,
BECAUSE organizers need per-channel popularity over time.

-   ATTRIBUTE: channelStatisticId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the channel statistic,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: timestamp; TYPE: `datetime`; DEFAULT: `Date.now()`;
    Time the snapshot was created,
    BECAUSE channel statistics are plotted over time.

-   ATTRIBUTE: numberOfViewers (*); TYPE: `integer`;
    Count of viewers of the channel at the timestamp,
    BECAUSE the per-channel viewer count is the tracked metric.

##  ENTITY: UserStatistic

-   REQUIREMENTS: [[FR.user-stats]]

Tracked viewer information about a user,
BECAUSE audience composition informs reporting and default localization.

-   ATTRIBUTE: userStatisticId; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the user statistic,
    BECAUSE it is referenced as a foreign key.

-   ATTRIBUTE: timestamp; TYPE: `datetime`; DEFAULT: `Date.now()`;
    Time the snapshot was created,
    BECAUSE user statistics are recorded over time.

-   ATTRIBUTE: country (*); TYPE: `string`;
    ISO country code from GeoIP tracking,
    BECAUSE country selects the default application language on first use.

-   ATTRIBUTE: browserType (*); TYPE: `string`;
    Type of browser used,
    BECAUSE browser distribution informs compatibility decisions.

-   ATTRIBUTE: deviceType (*); TYPE: `string`;
    Type of device used,
    BECAUSE device distribution informs responsive design priorities.

-   ATTRIBUTE: viewportWidth (*); TYPE: `integer`;
    Width in pixels of the browser viewport,
    BECAUSE viewport sizing informs layout decisions.

-   ATTRIBUTE: viewportHeight (*); TYPE: `integer`;
    Height in pixels of the browser viewport,
    BECAUSE viewport sizing informs layout decisions.
