---
Created:  2026-06-18 10:18
Modified: 2026-08-30 10:00
---

UXUI: Dialog Storyboard (DS)
============================

STORYBOARD: Attendee Joins and Watches {{attendee-join}}
--------------------------------------

-   ACTORS:   [[PERSONA:attendee]]
-   SCENARIO: [[SCENARIO:join-event-watch]]

### FRAME

-   Event Landing; SCENARIO-STEP: 1; PATTERNS: [[PATTERN:two-factor-login]];
    The attendee opens the event URL and sees the event title, login message, and an email field.
-   Email Entry; SCENARIO-STEP: 2; PATTERNS: [[PATTERN:two-factor-login]];
    The attendee enters their email; the system confirms a token has been sent to that address.
-   Token Challenge; SCENARIO-STEP: 2; PATTERNS: [[PATTERN:two-factor-login]];
    A token field appears with the email read-only; the attendee types the six-digit token.
-   Consent Gate; SCENARIO-STEP: 2; PATTERNS: [[PATTERN:consent-gate]];
    The required login information is shown and the attendee accepts the conditions.
-   Main Screen; SCENARIO-STEP: 3; PATTERNS: [[PATTERN:video-sidebar]];
    The live video plays on the left with the interaction sidebar on the right.

STORYBOARD: Attendee Asks a Tagged Question {{ask-question}}
-------------------------------------------

-   ACTORS:   [[PERSONA:attendee]]
-   SCENARIO: [[SCENARIO:ask-question-moderated]]

### FRAME

-   Questions Tab; SCENARIO-STEP: 1; PATTERNS: [[PATTERN:video-sidebar]], [[PATTERN:message-stream]];
    The attendee selects the questions tab in the sidebar showing existing accepted questions.
-   Compose Question; SCENARIO-STEP: 2; PATTERNS: [[PATTERN:composer]];
    The attendee types a question and the available question tags are offered for selection.
-   Tag and Submit; SCENARIO-STEP: 3; PATTERNS: [[PATTERN:composer]];
    The attendee picks one or more tags and submits the question.
-   Pending Acknowledgement; SCENARIO-STEP: 4; PATTERNS: [[PATTERN:message-stream]];
    The question appears in the attendee's own list marked as pending moderation, a rejected one tinted and visible to the author only.
-   Becomes Visible; SCENARIO-STEP: 5; PATTERNS: [[PATTERN:message-stream]];
    After approval the question becomes visible and likeable for all attendees.

STORYBOARD: Attendee Reads and Posts Chat {{chat-interaction}}
-----------------------------------------

-   ACTORS:   [[PERSONA:attendee]]
-   SCENARIO: [[SCENARIO:chat-post]]

### FRAME

-   Chat Tab; PATTERNS: [[PATTERN:video-sidebar]], [[PATTERN:message-stream]];
    The attendee opens the Chat tab and sees the scrolling stream with a "2 new messages" jump indicator.
-   Read Mixed Stream; PATTERNS: [[PATTERN:message-stream]];
    Others' messages show name, time, and like count, an amber moderator message stands out, and a quoted original links back to its source.
-   Like and Reply; PATTERNS: [[PATTERN:message-stream]];
    The attendee likes a message, raising its count, and follows a quoted original link back to its source.
-   Compose and Send; SCENARIO-STEP: 2; PATTERNS: [[PATTERN:composer]];
    The attendee types in the bottom composer, optionally adds an emoji, and sends the message.
-   Under Review; SCENARIO-STEP: 4; PATTERNS: [[PATTERN:composer]], [[PATTERN:message-stream]];
    The attendee's own message appears right-aligned marked "pending… / under review" until moderation resolves it.

STORYBOARD: Attendee Gets Support from a Moderator {{support-request}}
--------------------------------------------------

-   ACTORS:   [[PERSONA:attendee]], [[PERSONA:moderator-chat]]
-   SCENARIO: [[SCENARIO:moderate-chat-answer]]

### FRAME

-   Support Tab; ACTOR: [[PERSONA:attendee]]; PATTERNS: [[PATTERN:video-sidebar]], [[PATTERN:composer]];
    The attendee opens the Support tab, which shows only their own requests, and writes a request for help into the composer.
-   Chat Moderation Board; SCENARIO-STEP: 1; ACTOR: [[PERSONA:moderator-chat]]; PATTERNS: [[PATTERN:kanban-board]];
    The moderator reviews the incoming chat messages in the rejected, pending, and accepted lanes beside the stream, the request among them.
-   Direct Reply; SCENARIO-STEP: 4; ACTOR: [[PERSONA:moderator-chat]]; PATTERNS: [[PATTERN:composer]];
    The moderator writes a reply in the board's composer and marks it as a direct message to the attendee instead of a public one.
-   Reply Received; SCENARIO-STEP: 5; ACTOR: [[PERSONA:attendee]]; PATTERNS: [[PATTERN:message-stream]];
    The attendee sees the amber-tinted moderator reply below their own request in the Support tab, without any further approval step.

STORYBOARD: Chat Moderator Triages Messages {{chat-moderation}}
-------------------------------------------

-   ACTORS:   [[PERSONA:moderator-chat]]
-   SCENARIO: [[SCENARIO:moderate-reject]]

### FRAME

-   Board Overview; PATTERNS: [[PATTERN:kanban-board]];
    The moderator opens the chat moderation board with the stream preview beside the rejected, pending, and accepted lanes, each lane heading counting its messages.
-   Narrow Lane; PATTERNS: [[PATTERN:kanban-board]];
    The moderator narrows a lane through the timestamp and tag label filter chips at its head, collapsing the messages outside the filter.
-   Assess Pending; PATTERNS: [[PATTERN:kanban-board]];
    Each pending card shows the sentiment pre-assessment chip (safe, iffy, risk) beside sender and time, above the outlined reject and filled accept buttons.
-   Reject Improper; SCENARIO-STEP: 2; PATTERNS: [[PATTERN:kanban-board]];
    The moderator clicks reject on an improper message, which leaves the pending lane immediately.
-   Hidden from Audience; SCENARIO-STEP: 3; PATTERNS: [[PATTERN:kanban-board]];
    The card reappears at the top of the rejected lane marked rejected, while the accepted lane the audience sees stays unchanged.

STORYBOARD: Moderator Forwards to Presenter {{moderate-forward}}
-------------------------------------------

-   ACTORS:   [[PERSONA:moderator-qa]], [[PERSONA:presenter]]
-   SCENARIO: [[SCENARIO:moderate-forward]]

### FRAME

-   Board Overview; ACTOR: [[PERSONA:moderator-qa]]; PATTERNS: [[PATTERN:kanban-board]];
    The moderator sees question cards in the rejected, pending, accepted, suspended, forwarded, and answered lanes.
-   Filter Pending; SCENARIO-STEP: 1; ACTOR: [[PERSONA:moderator-qa]]; PATTERNS: [[PATTERN:kanban-board]];
    The moderator filters to show only pending questions to focus the triage.
-   Approve Card; SCENARIO-STEP: 2; ACTOR: [[PERSONA:moderator-qa]]; PATTERNS: [[PATTERN:kanban-board]];
    The moderator approves a relevant question, moving it to the accepted lane.
-   Forward with Hint; SCENARIO-STEP: 3; ACTOR: [[PERSONA:moderator-qa]]; PATTERNS: [[PATTERN:kanban-board]];
    The moderator forwards the card to the presenter and attaches a routing hint in the presenter alert.
-   Presenter Basket; SCENARIO-STEP: 5; ACTOR: [[PERSONA:presenter]];
    The card appears in the presenter's ordered work basket below the acknowledgeable hint and is locked from attendee edits.

STORYBOARD: Manager Switches Provider Live {{switch-provider}}
------------------------------------------

-   ACTORS:   [[PERSONA:manager]], [[PERSONA:attendee]]
-   SCENARIO: [[SCENARIO:switch-provider-failover]]

### FRAME

-   Channel Master; SCENARIO-STEP: 1; ACTOR: [[PERSONA:manager]]; PATTERNS: [[PATTERN:master-detail]];
    The manager selects the affected channel from the master list of channels.
-   Resource Detail; SCENARIO-STEP: 1; ACTOR: [[PERSONA:manager]]; PATTERNS: [[PATTERN:master-detail]];
    The channel's resources are shown with the currently active provider highlighted.
-   Activate Fallback; SCENARIO-STEP: 2; ACTOR: [[PERSONA:manager]]; PATTERNS: [[PATTERN:master-detail]];
    The manager activates a different resource as the new active one.
-   Propagation Confirmed; SCENARIO-STEP: 4; ACTOR: [[PERSONA:manager]];
    The system confirms the change has been pushed to all connected clients.
-   Seamless Switch; SCENARIO-STEP: 5; ACTOR: [[PERSONA:attendee]]; PATTERNS: [[PATTERN:video-sidebar]];
    Attendee players transition to the new stream with no user action required.

STORYBOARD: Manager Imports Registration Sheet {{registration-import}}
----------------------------------------------

-   ACTORS:   [[PERSONA:manager]]
-   SCENARIO: [[SCENARIO:create-event-import]]

### FRAME

-   Event Config; PATTERNS: [[PATTERN:master-detail]];
    The manager opens the event configuration, with its basics and event type profile, and selects the attendee import action.
-   Upload Sheet; SCENARIO-STEP: 1;
    The manager uploads the Excel sheet of the Event Registration System with attendee columns.
-   Import Summary; SCENARIO-STEP: 3;
    The system reports new users created and existing users skipped, with tokens generated.
-   URL Preview; SCENARIO-STEP: 4;
    The system shows the composed personal access URLs per attendee.
-   Return Download; SCENARIO-STEP: 5;
    The manager downloads the returned Excel sheet with the URL column filled for the Event Registration System.

