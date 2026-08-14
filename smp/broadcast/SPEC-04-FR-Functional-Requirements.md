---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:34
---

#   SPEC: Functional Requirements (FR)

##  REQUIREMENT: User Authentication <a id="SPEC-FR-authentication"></a>

-   PRIORITY: MUST

The system MUST authenticate participants via their email address before showing the video stream or, at minimum, before
allowing participation in questions and chat, and MUST re-check that the event still lists the user for access even when
the user is already authenticated, BECAUSE access must be restricted to invited participants to minimize foreign viewers.

##  REQUIREMENT: Limit Parallel Access <a id="SPEC-FR-parallel-access"></a>

-   PRIORITY: MUST

When participants must be authenticated to watch, the system MUST allow an event to be viewed only once per participant at a
time, closing the prior connection on a new login, BECAUSE single concurrent sessions minimize unauthorized outside viewing.

##  REQUIREMENT: Ask Questions <a id="SPEC-FR-questions"></a>

-   PRIORITY: MUST

The system MUST let attendees submit questions as a dedicated feedback channel feeding the Q&A rounds, BECAUSE structured
audience questions are a core interaction the event format depends on.

##  REQUIREMENT: Chat Messages <a id="SPEC-FR-chat"></a>

-   PRIORITY: MUST

The system MUST let attendees send chat messages for direct comment on the event, BECAUSE live commentary keeps the
audience engaged during the broadcast.

##  REQUIREMENT: Like Messages <a id="SPEC-FR-likes"></a>

-   PRIORITY: MUST

The system MUST let attendees like questions and chat messages and undo the like, BECAUSE liking surfaces the most
relevant audience input for moderators and presenters.

##  REQUIREMENT: Reply to Chat Messages <a id="SPEC-FR-replies"></a>

-   PRIORITY: SHOULD

The system SHOULD let attendees reply to chat messages and MUST allow an event to disable replies, BECAUSE threaded
replies aid discussion but are not appropriate for every event format.

##  REQUIREMENT: Configurable Name Appearance <a id="SPEC-FR-name-appearance"></a>

-   PRIORITY: MUST

The system MUST display an attendee's name on messages as full "Firstname Lastname", first name only, or anonymous per event
configuration, always expose the email address (at least on hover), and MAY derive the name from the email if none is given,
BECAUSE events differ in how much attendee identity should be revealed.

##  REQUIREMENT: Personal Display Filtering <a id="SPEC-FR-display-options"></a>

-   PRIORITY: SHOULD

The system SHOULD let an attendee choose to see only their own messages and questions or also those of others, BECAUSE
attendees want to track their own contributions without distraction.

##  REQUIREMENT: Client-Side Sentiment Analysis <a id="SPEC-FR-client-sentiment"></a>

-   PRIORITY: COULD

The system COULD perform configurable client-side sentiment analysis that checks attendee input before it is sent and may
prevent improper submissions, BECAUSE filtering at the source reduces server moderation load and discourages misconduct.

##  REQUIREMENT: Server-Side Sentiment Analysis <a id="SPEC-FR-server-sentiment"></a>

-   PRIORITY: COULD

The system COULD perform configurable server-side sentiment analysis that checks attendee input before it is stored, and
COULD auto-accept positive and auto-reject negative input, BECAUSE automated triage assists moderators with high message
volume.

##  REQUIREMENT: Edit and Delete Messages <a id="SPEC-FR-message-editing"></a>

-   PRIORITY: SHOULD

The system SHOULD let attendees edit and delete their own chat and question messages, mark edited messages for others, and
re-run moderation on edits where required, BECAUSE attendees must correct mistakes without bypassing moderation.

##  REQUIREMENT: Tag Question Messages <a id="SPEC-FR-question-tags"></a>

-   PRIORITY: SHOULD

The system SHOULD let attendees tag question messages with predefined tags to give context such as the addressed person or
agenda point, BECAUSE tags help moderators and presenters route and group questions.

##  REQUIREMENT: Moderate Chat and Questions <a id="SPEC-FR-moderation"></a>

-   PRIORITY: MUST

The system MUST support optional moderation in which moderators reject, approve, or forward attendee input, with messages
held pending until approved when moderation is enabled, BECAUSE organizers need control over what becomes publicly visible.

##  REQUIREMENT: Forward Inputs to Presenter <a id="SPEC-FR-forward-presenter"></a>

-   PRIORITY: MUST

The system MUST let moderators forward approved inputs to a presenter so the presenter sees only a curated subset rather than
all approved messages, BECAUSE the presenter on stage can only process a focused set of items.

##  REQUIREMENT: Answer Attendee Inputs <a id="SPEC-FR-answer-inputs"></a>

-   PRIORITY: SHOULD

The system SHOULD let moderators reply to an attendee's input, including non-visible direct messages, BECAUSE moderators
need to clarify details or provide support privately.

##  REQUIREMENT: Moderator-Authored Messages <a id="SPEC-FR-moderator-messages"></a>

-   PRIORITY: SHOULD

The system SHOULD let moderators author chats and questions visible to others under a sender name defaulting to "Moderator"
but overridable on send, BECAUSE prepared questions are needed to seed Q&A sessions.

##  REQUIREMENT: Export Attendee Inputs <a id="SPEC-FR-export-inputs"></a>

-   PRIORITY: MUST

After an event finishes, the system MUST let managers export all attendee inputs including at least timestamp, state, number
of likes, and message text, BECAUSE organizers need a durable record of audience interaction.

##  REQUIREMENT: Presenter Hints and Alerts <a id="SPEC-FR-presenter-hints"></a>

-   PRIORITY: SHOULD

The system SHOULD let moderators send textual hints to the presenter and raise an alert the presenter can confirm,
BECAUSE the moderator must steer the live presenter with timing and routing guidance.

##  REQUIREMENT: Sort and Filter Messages <a id="SPEC-FR-sort-filter"></a>

-   PRIORITY: SHOULD

The system SHOULD let moderators filter messages and manually order forwarded questions, BECAUSE moderators need a clear
overview and a defined order for the presenter to ask questions.

##  REQUIREMENT: Manage Embedded Application <a id="SPEC-FR-manage-app"></a>

-   PRIORITY: COULD

The system COULD let moderators administer an embedded third-party application when it exposes an administration view,
BECAUSE some events integrate interactive apps that the moderator must control.

##  REQUIREMENT: Browser Access <a id="SPEC-FR-browser-access"></a>

-   PRIORITY: MUST

The system MUST be accessible from any reasonably recent web browser without installation, BECAUSE attendees use both
managed and unmanaged devices with no common client software.

##  REQUIREMENT: Individual Event Access URL <a id="SPEC-FR-individual-url"></a>

-   PRIORITY: MUST

The system MUST allow accessing an event via an individual, unguessable URL of the form `#/event=<event>`, BECAUSE an
obscure entry point minimizes access by external viewers.

##  REQUIREMENT: Personalized Event Access URL <a id="SPEC-FR-personalized-url"></a>

-   PRIORITY: SHOULD

The system SHOULD support an event URL that also carries the user email (`&user=<email>`), making the email read-only in the
login dialog, BECAUSE pre-filling the identity streamlines the attendee login.

##  REQUIREMENT: Automatic Event Access URL <a id="SPEC-FR-automatic-url"></a>

-   PRIORITY: SHOULD

The system SHOULD support an event URL carrying a pre-generated access token (`&token=<token>`) that auto-authenticates the
user without a login dialog, with single or multiple use governed by event settings, BECAUSE automated access enables
frictionless joining for trusted distributions.

##  REQUIREMENT: Direct Resource Access URL <a id="SPEC-FR-resource-url"></a>

-   PRIORITY: SHOULD

The system SHOULD support a `&resource=<resource>` URL parameter that selects a specific event resource on access, BECAUSE
attendees reloading the page must return to the same stream or static resource.

##  REQUIREMENT: GDPR-Compliant EU Processing <a id="SPEC-FR-gdpr-eu"></a>

-   PRIORITY: MUST

The system MUST provide all services in compliance with GDPR within the EU, BECAUSE the audience and operator are subject
to European data-protection law.

##  REQUIREMENT: Explicit User Consent <a id="SPEC-FR-user-consent"></a>

-   PRIORITY: MUST

The system MUST require event attendees to give explicit consent before participating under defined conditions, in addition
to prior platform consent, BECAUSE consent is both a legal safeguard and a psychological hurdle against prohibited stream
sharing.

##  REQUIREMENT: Login and Interaction Messages <a id="SPEC-FR-info-messages"></a>

-   PRIORITY: SHOULD

The system SHOULD optionally display configurable text with one or two links at login and at interaction time, BECAUSE
organizers communicate event information and conduct rules at these moments.

##  REQUIREMENT: Multiple Streaming Providers <a id="SPEC-FR-multi-provider"></a>

-   PRIORITY: MUST

The system MUST allow multiple streaming providers to be configured per event, BECAUSE a configured fallback is required
to recover from provider problems even during a running event.

##  REQUIREMENT: Live Provider Switching <a id="SPEC-FR-provider-switch"></a>

-   PRIORITY: MUST

The system MUST allow switching the active streaming provider during an event, with attendee clients following the switch
without user interaction, BECAUSE provider outages must be mitigated without disrupting the audience.

##  REQUIREMENT: Import Ventari Attendees <a id="SPEC-FR-ventari-import"></a>

-   PRIORITY: MUST

The system MUST import a Ventari Excel sheet to populate an event's access list and generate authorization tokens, avoiding
duplicate invitations on repeated imports, BECAUSE events are provisioned from the Ventari registration system.

##  REQUIREMENT: Return Access URLs to Ventari <a id="SPEC-FR-ventari-export"></a>

-   PRIORITY: MUST

The system MUST generate each attendee's personal access URL containing event, user, and a "NNN-NNN" six-digit token and
return it in an Excel sheet to Ventari, BECAUSE Ventari distributes the join URLs to attendees.

##  REQUIREMENT: Import and Export Event <a id="SPEC-FR-event-portability"></a>

-   PRIORITY: SHOULD

The system SHOULD export an event with its related entities to a serialized format such as YAML and re-import it, BECAUSE
this eases development, demonstration, and creation of recurring production events.

##  REQUIREMENT: General Event Statistics <a id="SPEC-FR-event-stats"></a>

-   PRIORITY: MUST

The system MUST provide an attendee statistics curve of logged-in users over time, BECAUSE organizers need to observe
audience size and trend during the event.

##  REQUIREMENT: Debugging Statistics <a id="SPEC-FR-debug-stats"></a>

-   PRIORITY: SHOULD

The system SHOULD record login-challenge statistics including issued, sent, and used authorization tokens, BECAUSE
operators need visibility into the authentication flow for diagnosis.

##  REQUIREMENT: Channel Statistics <a id="SPEC-FR-channel-stats"></a>

-   PRIORITY: SHOULD

The system SHOULD show the number of viewers per channel of an event, BECAUSE organizers want to know the relative
popularity of language and resolution variants.

##  REQUIREMENT: User Statistics <a id="SPEC-FR-user-stats"></a>

-   PRIORITY: SHOULD

The system SHOULD record viewer statistics including country, browser, device, and viewport, using country to select the
default application language on first use, BECAUSE audience composition informs both reporting and localization.

##  REQUIREMENT: Live Configuration Propagation <a id="SPEC-FR-config-propagation"></a>

-   PRIORITY: MUST

The system MUST propagate event configuration changes directly to all connected participants, BECAUSE toggles such as
enabling chat must take effect for the live audience without a reload.

##  REQUIREMENT: Presenter Dashboard <a id="SPEC-FR-presenter-dashboard"></a>

-   PRIORITY: COULD

The system COULD provide a dedicated presenter dashboard showing forwarded inputs for processing on stage, BECAUSE the
presenter needs a focused working view, though its design is not yet finalized.

##  REQUIREMENT: Multiple-Choice Feedback <a id="SPEC-FR-mc-feedback"></a>

-   PRIORITY: COULD

The system COULD provide real-time multiple-choice questions answered by attendees, BECAUSE polls add interaction during
the event.

##  REQUIREMENT: Mobile Device Support <a id="SPEC-FR-mobile"></a>

-   PRIORITY: COULD

The system COULD let participants take part on mobile phones, at least for video with possible interaction restrictions,
BECAUSE many attendees join from mobile devices.

##  REQUIREMENT: In-Session Language Switching <a id="SPEC-FR-language-switch"></a>

-   PRIORITY: SHOULD

The system SHOULD let an attendee switch the display and content language between German and English at any time from the
header, applying the change immediately, BECAUSE attendees expect to read the interface and translated messages in their
preferred one of the two supported languages.

##  REQUIREMENT: Light and Dark Theme <a id="SPEC-FR-theme-toggle"></a>

-   PRIORITY: COULD

The system COULD let an attendee toggle a light or dark theme from the header, applying it immediately across the interface,
BECAUSE attendees view events under varied lighting and prefer a comfortable appearance.

##  REQUIREMENT: Deleted Message Placeholder <a id="SPEC-FR-deleted-placeholder"></a>

-   PRIORITY: SHOULD

When an attendee deletes a message, the system SHOULD retain its position in the stream and show a "This message was deleted"
placeholder instead of removing it, BECAUSE preserving the gap keeps the surrounding conversation coherent for readers.
