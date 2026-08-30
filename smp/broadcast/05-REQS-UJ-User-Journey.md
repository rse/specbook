---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

REQS: User Journey (UJ)
=======================

JOURNEY: Attend a Broadcast event {{attend}}
---------------------------------

-   ACTORS:      [[PERSONA:attendee]]

### STEP: Receive personal event invitation URL {{attend-invitation}}

-   STAGE:       Awareness
-   GOAL:        Learn that an event is happening and that access is granted
-   TOUCHPOINT:  Invitation email containing the individual event URL
-   ACTION:      The attendee reads the invitation and clicks the personalized event link.
-   EMOTION:     Curious (+1)

### STEP: Open event page and review login info {{arrival}}

-   STAGE:       Consideration
-   GOAL:        Understand what the event is and how to join
-   TOUCHPOINT:  Event landing screen in the web browser
-   ACTION:      The attendee reads the optional login message and any links before deciding to log in.
-   EMOTION:     Interested (+1)
-   PAIN-POINT:  Uncertainty whether the link is genuine and what data will be collected.
-   OPPORTUNITY: The event landing screen states organizer, purpose, and data handling upfront, so the attendee can trust the link.

### STEP: Authenticate via email token {{authenticate}}

-   STAGE:       Decision
-   GOAL:        Gain access to the live video stream
-   TOUCHPOINT:  Login dialog with email and token challenge
-   ACTION:      The attendee enters the email, receives a 6-digit token by mail, and submits it.
-   EMOTION:     Slightly impatient (-1)
-   PAIN-POINT:  Waiting for the token email and re-checking the inbox adds friction before the event.
-   OPPORTUNITY: The token email arrives within seconds and the token field accepts a pasted value, so the wait before the event stays minimal.

### STEP: Watch stream and interact {{participate}}

-   STAGE:       Usage
-   GOAL:        Follow the event and contribute questions, chat, and likes
-   TOUCHPOINT:  Main attendee screen with video and interaction sidebar
-   ACTION:      The attendee watches the stream, posts questions or chat messages, and likes others' messages.
-   EMOTION:     Engaged (+2)
-   PAIN-POINT:  Messages may be delayed by moderation, so the attendee is unsure whether input arrived.
-   OPPORTUNITY: Submitted messages appear immediately in a pending state, so the attendee knows the input arrived.

JOURNEY: Operate a Broadcast Event {{operate}}
----------------------------------

-   ACTORS:      [[PERSONA:manager]]

### STEP: Configure and run the event {{configure}}

-   STAGE:       Usage
-   GOAL:        Set up, start, and control an event end-to-end
-   TOUCHPOINT:  Manager configuration screen and Event Registration System Excel import/export
-   ACTION:      The manager imports attendees, configures channels and options, and starts the event.
-   EMOTION:     Focused (0)
-   PAIN-POINT:  Coordinating streaming providers, access lists, and tokens before going live is error-prone.
-   OPPORTUNITY: The configuration screen validates the imported attendee list and the streaming settings before the event goes live.

### STEP: Export anonymized results after event {{export}}

-   STAGE:       Usage
-   GOAL:        Capture and share the event's interaction outcomes
-   TOUCHPOINT:  Manager export function producing a downloadable file
-   ACTION:      The manager exports anonymized messages with timestamps, states, and like counts.
-   EMOTION:     Satisfied (+2)

JOURNEY: Moderate a Broadcast Event {{moderate}}
-----------------------------------

-   ACTORS:      [[PERSONA:moderator-chat]], [[PERSONA:moderator-qa]]

### STEP: Moderate and support the presenter {{support}}

-   STAGE:       Usage
-   GOAL:        Keep interaction clean and forward the best questions to the presenter
-   TOUCHPOINT:  Moderator Kanban board of chat and question messages
-   ACTION:      The moderator approves, rejects, and forwards messages and sends hints to the presenter.
-   EMOTION:     Pressured (-2)
-   PAIN-POINT:  High message volume under time pressure makes it hard to keep an overview.
-   OPPORTUNITY: The Kanban board groups messages by state and highlights new arrivals, so the moderator keeps an overview under load.

