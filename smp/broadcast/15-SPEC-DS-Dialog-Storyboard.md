---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:34
---

SPEC: Dialog Storyboard (DS)
============================

STORYBOARD: Attendee Joins and Watches {{attendee-join}}
--------------------------------------

-   USE-CASE: [[USE-CASE:join-event]]
-   SCENARIO: [[SCENARIO:join-event-watch]]
-   PATTERN:  [[PATTERN:two-factor-login]]

### FRAME

-   Event Landing; The attendee opens the event URL and sees the event title, login message, and an email field.
-   Email Entry; The attendee enters their email; the system confirms a token has been sent to that address.
-   Token Challenge; A token field appears with the email read-only; the attendee types the six-digit token.
-   Consent Gate; The required login information is shown and the attendee accepts the conditions.
-   Main Screen; The live video plays on the left with the interaction sidebar on the right.

STORYBOARD: Attendee Asks a Tagged Question {{ask-question}}
-------------------------------------------

-   USE-CASE: [[USE-CASE:ask-question]]
-   SCENARIO: [[SCENARIO:ask-question-moderated]]
-   PATTERN:  [[PATTERN:video-sidebar]]

### FRAME

-   Questions Tab; The attendee selects the questions tab in the sidebar showing existing accepted questions.
-   Compose Question; The attendee types a question and the available question tags are offered for selection.
-   Tag and Submit; The attendee picks one or more tags and submits the question.
-   Pending Acknowledgement; The question appears in the attendee's own list marked as pending moderation.
-   Becomes Visible; After approval the question becomes visible and likeable for all attendees.

STORYBOARD: Attendee Reads and Posts Chat {{chat-interaction}}
-----------------------------------------

-   USE-CASE: [[USE-CASE:ask-question]]
-   SCENARIO: [[SCENARIO:ask-question-moderated]]
-   PATTERN:  [[PATTERN:message-stream]]

### FRAME

-   Chat Tab; The attendee opens the Chat tab and sees the scrolling stream with a "2 new messages" jump indicator.
-   Read Mixed Stream; Others' messages show name, time, and like count, an amber moderator message stands out, and a deleted message reads "This message was deleted".
-   Like and Reply; The attendee likes a message, raising its count, and follows a quoted original link back to its source.
-   Compose and Send; The attendee types in the bottom composer, optionally adds an emoji, and sends the message.
-   Under Review; The attendee's own message appears right-aligned marked "pending… / under review" until moderation resolves it.

STORYBOARD: Moderator Forwards to Presenter {{moderate-forward}}
-------------------------------------------

-   USE-CASE: [[USE-CASE:moderate]]
-   SCENARIO: [[SCENARIO:moderate-forward]]
-   PATTERN:  [[PATTERN:kanban-board]]

### FRAME

-   Board Overview; The moderator sees question cards in the pending lane and chat cards in a separate lane.
-   Filter Pending; The moderator filters to show only pending questions to focus the triage.
-   Approve Card; The moderator approves a relevant question, moving it to the accepted lane.
-   Forward with Hint; The moderator forwards the card to the presenter and attaches a routing hint.
-   Presenter Basket; The card appears in the presenter's ordered work basket and is locked from attendee edits.

STORYBOARD: Manager Switches Provider Live {{switch-provider}}
------------------------------------------

-   USE-CASE: [[USE-CASE:switch-provider]]
-   SCENARIO: [[SCENARIO:switch-provider-failover]]
-   PATTERN:  [[PATTERN:master-detail]]

### FRAME

-   Channel Master; The manager selects the affected channel from the master list of channels.
-   Resource Detail; The channel's resources are shown with the currently active provider highlighted.
-   Activate Fallback; The manager activates a different resource as the new active one.
-   Propagation Confirmed; The system confirms the change has been pushed to all connected clients.
-   Seamless Switch; Attendee players transition to the new stream with no user action required.

STORYBOARD: Manager Imports Ventari Sheet {{ventari-import}}
-----------------------------------------

-   USE-CASE: [[USE-CASE:create-event]]
-   SCENARIO: [[SCENARIO:create-event-import]]
-   PATTERN:  [[PATTERN:master-detail]]

### FRAME

-   Event Config; The manager opens the event configuration and selects the attendee import action.
-   Upload Sheet; The manager uploads the Ventari Excel sheet with attendee columns.
-   Import Summary; The system reports new users created and existing users skipped, with tokens generated.
-   URL Preview; The system shows the composed personal access URLs per attendee.
-   Return Download; The manager downloads the returned Excel sheet with the URL column filled for Ventari.
