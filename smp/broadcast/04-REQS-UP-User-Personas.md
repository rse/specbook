---
Created:  2026-06-18 10:18
Modified: 2026-09-05 00:30
---

REQS: User Personas (UP)
========================

##  ROLE: Attendee {{attendee}}

-   TYPE: Person
-   TERM: [[TERM:attendee]]

The attendee watches the stream of the event they were invited to and
takes part in its interaction with messages and likes of their own,
BECAUSE the audience has to participate without ever gaining a view on
the moderation or on the personal data of other attendees.

##  ROLE: Moderator {{moderator}}

-   TYPE: Person
-   TERM: [[TERM:moderator]]

The moderator gatekeeps the interaction of a running event by deciding,
answering, forwarding, and seeding messages and by steering the
presenter, where the Q&A moderator and the chat moderator hold the very
same role and split the work by message type by convention only, BECAUSE
the audience has to see only what the organizers approve while the
presenter receives a curated selection.

##  ROLE: Presenter {{presenter}}

-   TYPE: Person
-   TERM: [[TERM:presenter]]

The presenter receives the curated questions on stage and records their
processing, seeing nothing else of the interaction, BECAUSE the person
on air has to be shielded from the raw audience input.

##  ROLE: Manager {{manager}}

-   TYPE: Person
-   TERM: [[TERM:manager]]

The manager owns an event from its configuration through its live run to
its archived export, without taking part in the moderation, BECAUSE one
accountable role has to control the visibility, the audience, and the
lifecycle of the event.

##  ROLE: Administrator {{administrator}}

-   TYPE: Person
-   TERM: [[TERM:administrator]]

The administrator provisions the events and the streaming providers
through the configuration of the software, without ever touching the
attendees and their messages, BECAUSE the operation of the platform has
to be reproducible from configuration and free of personal data.

##  PERSONA: Anna {{attendee}}

-   ROLES:       [[ROLE:attendee]]
-   TERMS:       [[TERM:attendee]]
-   GOAL:        Watch the live event effortlessly and get her questions answered.
-   FRUSTRATION: Streaming tools that demand accounts, apps, or plugins before she can even watch.

"I just want to watch the town hall and ask my question without jumping
through hoops."

##  PERSONA: Markus {{moderator-chat}}

-   ROLES:       [[ROLE:moderator]]
-   TERMS:       [[TERM:moderator]], [[TERM:chat]]
-   GOAL:        Keep the chat conversation civil and on-topic with minimal effort.
-   FRUSTRATION: Chat tools without moderation support, letting spam and off-topic noise drown the conversation.

"I keep the Chat conversation clean."

##  PERSONA: Peter {{moderator-qa}}

-   ROLES:       [[ROLE:moderator]]
-   TERMS:       [[TERM:moderator]], [[TERM:question]]
-   GOAL:        Filter the incoming questions and forward only the relevant ones to the presenter.
-   FRUSTRATION: Unfiltered question streams where duplicates and noise bury the questions that truly matter.

"I keep the Q&A funnel clean and feed the presenter only questions which
truly matter."

##  PERSONA: Petra {{presenter}}

-   ROLES:       [[ROLE:presenter]]
-   TERMS:       [[TERM:presenter]]
-   GOAL:        Deliver her talk while receiving the curated questions at the right moment.
-   FRUSTRATION: Being distracted on stage by raw chat noise instead of a few curated questions.

"On stage I need the right questions in front of me at the right moment,
and nothing else."

##  PERSONA: Manfred {{manager}}

-   ROLES:       [[ROLE:manager]]
-   TERMS:       [[TERM:manager]], [[TERM:registration-system]]
-   GOAL:        Set up events quickly and hand the access URLs back to the Event Registration System.
-   FRUSTRATION: Manual, error-prone event setup with access URLs that have to be copied around by hand.

"Setting up an event and getting the access URLs back to the Event
Registration System has to be quick and repeatable."

##  PERSONA: Sven {{administrator}}

-   ROLES:       [[ROLE:administrator]]
-   TERMS:       [[TERM:administrator]], [[TERM:provider]]
-   GOAL:        Provision events and streaming providers reproducibly via configuration.
-   FRUSTRATION: Platforms that require per-event manual clicks and store personal data he must not touch.

"I provision events and streaming providers via config; I never touch
attendees' personal data."

