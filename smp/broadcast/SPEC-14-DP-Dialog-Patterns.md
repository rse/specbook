---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:34
---

#   SPEC: Dialog Patterns (DP)

##  PATTERN: Two-Factor Login <a id="SPEC-DP-two-factor-login"></a>

-   CONTEXT: An attendee accessing an event that requires email-verified access.
-   PROBLEM: The system must confirm the attendee controls an authorized email without permanent accounts.

The dialog collects the email, sends a one-time token to it, and then collects that token in a second step, optionally
pre-filling fields from the URL, BECAUSE a challenge-response over email proves address control with no stored credential.

##  PATTERN: Consent Gate <a id="SPEC-DP-consent-gate"></a>

-   CONTEXT: Entry to an event or interaction channel that requires acknowledged terms.
-   PROBLEM: Participation must be blocked until the attendee explicitly accepts the stated conditions.

A modal presents the configured login or interaction information with required-to-accept controls and only releases the
attendee onward once accepted, BECAUSE explicit acknowledgement is both a legal and psychological safeguard.

##  PATTERN: Video-with-Sidebar <a id="SPEC-DP-video-sidebar"></a>

-   CONTEXT: The main attendee screen during a live event with interaction enabled.
-   PROBLEM: The attendee must watch the stream and interact without either crowding the other.

The video occupies the primary area while a tabbed sidebar hosts the Q&A, Hudspad, Chat, and Support tabs, collapsing
responsively on small screens, BECAUSE co-locating stream and interaction keeps attention on the event while interaction
stays reachable.

##  PATTERN: Live Message Stream <a id="SPEC-DP-message-stream"></a>

-   CONTEXT: The chat and Q&A tabs where attendees read and post a continuous flow of messages.
-   PROBLEM: Messages of mixed provenance and state arrive continuously and the attendee must follow them without losing place.

Messages render as a scrolling list of bubbles distinguished by provenance and state, with own messages right-aligned, others
left-aligned, moderator messages tinted, quoted originals linking back to their source, deleted messages shown as a
placeholder, per-message like counts and reply affordances, and floating "new messages" jump indicators above and below,
BECAUSE clear per-message styling and unread cues let attendees follow a fast, mixed stream without confusion.

##  PATTERN: Inline Composer <a id="SPEC-DP-composer"></a>

-   CONTEXT: The bottom of the chat and Q&A tabs where the attendee writes input.
-   PROBLEM: The attendee must compose, send, and see the moderation outcome of their own input within the same stream.

A persistent input field with an emoji picker and send control sits below the message list, and the attendee's just-sent
message appears in the stream marked "pending… / under review" until moderation resolves it, BECAUSE keeping the composer
and the input's own state in one place makes posting and its consequence immediately legible.

##  PATTERN: Kanban Moderation Board <a id="SPEC-DP-kanban-board"></a>

-   CONTEXT: A moderator triaging a stream of incoming chat and question messages.
-   PROBLEM: Many messages must be classified and routed quickly with a clear sense of their state.

Messages appear as cards in state lanes (pending, accepted, forwarded, answered) that the moderator advances by action, with
filters and manual reordering, BECAUSE spatial state and drag actions make high-throughput triage fast and unambiguous.

##  PATTERN: Master-Detail Configuration <a id="SPEC-DP-master-detail"></a>

-   CONTEXT: A manager configuring an event's channels, resources, and options.
-   PROBLEM: A large nested configuration must be navigated and edited without losing orientation.

A master list of channels and resources on one side drives a detail editor on the other, so selecting an item reveals its
parameters for editing, BECAUSE master-detail keeps a large hierarchical configuration navigable and focused.

##  PATTERN: Live Statistics Dashboard <a id="SPEC-DP-stats-dashboard"></a>

-   CONTEXT: A manager or studio screen observing event health during the broadcast.
-   PROBLEM: Operators need an at-a-glance, continuously updating view of audience and channels.

A dashboard composes a time-series attendee curve with per-channel pie charts that refresh from periodic statistics
snapshots, BECAUSE combined trend and distribution views convey event health without manual querying.
