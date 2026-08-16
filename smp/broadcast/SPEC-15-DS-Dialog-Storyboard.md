---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:34
---

#   SPEC: Dialog Storyboard (DS)

##  STORYBOARD: Attendee Joins and Watches {{attendee-join}}

-   PATTERN:  [[PATTERN:two-factor-login]]
-   USE-CASE: [[USE CASE:join-event]]
-   SCENARIO: [[SCENARIO:join-event-token-login]]

1.  **Event Landing**: The attendee opens the event URL and sees the event title, login message, and an email field.
2.  **Email Entry**: The attendee enters their email; the system confirms a token has been sent to that address.
3.  **Token Challenge**: A token field appears with the email read-only; the attendee types the six-digit token.
4.  **Consent Gate**: The required login information is shown and the attendee accepts the conditions.
5.  **Main Screen**: The live video plays on the left with the interaction sidebar on the right.

##  STORYBOARD: Attendee Asks a Tagged Question {{ask-question}}

-   PATTERN:  [[PATTERN:video-sidebar]]
-   USE-CASE: [[USE CASE:ask-question]]
-   SCENARIO: [[SCENARIO:ask-question-moderated]]

1.  **Questions Tab**: The attendee selects the questions tab in the sidebar showing existing accepted questions.
2.  **Compose Question**: The attendee types a question and the available question tags are offered for selection.
3.  **Tag and Submit**: The attendee picks one or more tags and submits the question.
4.  **Pending Acknowledgement**: The question appears in the attendee's own list marked as pending moderation.
5.  **Becomes Visible**: After approval the question becomes visible and likeable for all attendees.

##  STORYBOARD: Attendee Reads and Posts Chat {{chat-interaction}}

-   PATTERN:  [[PATTERN:message-stream]]
-   USE-CASE: [[USE CASE:ask-question]]
-   SCENARIO: [[SCENARIO:ask-question-moderated]]

1.  **Chat Tab**: The attendee opens the Chat tab and sees the scrolling stream with a "2 new messages" jump indicator.
2.  **Read Mixed Stream**: Others' messages show name, time, and like count, an amber moderator message stands out, and a deleted message reads "This message was deleted".
3.  **Like and Reply**: The attendee likes a message, raising its count, and follows a quoted original link back to its source.
4.  **Compose and Send**: The attendee types in the bottom composer, optionally adds an emoji, and sends the message.
5.  **Under Review**: The own message appears right-aligned marked "pending… / under review" until moderation resolves it.

##  STORYBOARD: Moderator Forwards to Presenter {{moderate-forward}}

-   PATTERN:  [[PATTERN:kanban-board]]
-   USE-CASE: [[USE CASE:moderate]]
-   SCENARIO: [[SCENARIO:moderate-forward]]

1.  **Board Overview**: The moderator sees question cards in the pending lane and chat cards in a separate lane.
2.  **Filter Pending**: The moderator filters to show only pending questions to focus the triage.
3.  **Approve Card**: The moderator approves a relevant question, moving it to the accepted lane.
4.  **Forward with Hint**: The moderator forwards the card to the presenter and attaches a routing hint.
5.  **Presenter Basket**: The card appears in the presenter's ordered work basket and is locked from attendee edits.

##  STORYBOARD: Manager Switches Provider Live {{switch-provider}}

-   PATTERN:  [[PATTERN:master-detail]]
-   USE-CASE: [[USE CASE:switch-provider]]
-   SCENARIO: [[SCENARIO:switch-provider-failover]]

1.  **Channel Master**: The manager selects the affected channel from the master list of channels.
2.  **Resource Detail**: The channel's resources are shown with the currently active provider highlighted.
3.  **Activate Fallback**: The manager activates a different resource as the new active one.
4.  **Propagation Confirmed**: The system confirms the change has been pushed to all connected clients.
5.  **Seamless Switch**: Attendee players transition to the new stream with no user action required.

##  STORYBOARD: Manager Imports Ventari Sheet {{ventari-import}}

-   PATTERN:  [[PATTERN:master-detail]]
-   USE-CASE: [[USE CASE:create-event]]
-   SCENARIO: [[SCENARIO:create-event-import]]

1.  **Event Config**: The manager opens the event configuration and selects the attendee import action.
2.  **Upload Sheet**: The manager uploads the Ventari Excel sheet with attendee columns.
3.  **Import Summary**: The system reports new users created and existing users skipped, with tokens generated.
4.  **URL Preview**: The system shows the composed personal access URLs per attendee.
5.  **Return Download**: The manager downloads the returned Excel sheet with the URL column filled for Ventari.
