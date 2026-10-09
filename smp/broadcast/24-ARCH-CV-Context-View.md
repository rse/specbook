---
Created:  2026-06-18 10:18
Modified: 2026-09-05 00:30
---

ARCH: Context View (CV)
=======================

##  ENTITY: Attendee {{attendee}}

-   KIND:      Person
-   DIRECTION: Bidirectional
-   TERMS:     [[TERM:attendee]]
-   ACTORS:    [[ROLE:attendee]]
-   USE-CASES: [[USE-CASE:join-event]], [[USE-CASE:authenticate]], [[USE-CASE:ask-question]], [[USE-CASE:chat-during-event]]
-   PREMISES:  [[PREMISE:websocket-passage]]
-   DATA:      Login credentials, video playback, chat, questions, likes

The attendee is the person who authenticates, watches the stream, and
interacts, through the browser-based web client of the solution,
BECAUSE Broadcast is a browser-delivered solution serving thousands of
concurrent attendees.

##  ENTITY: Event Operator {{operator}}

-   KIND:      Person
-   DIRECTION: Bidirectional
-   TERMS:     [[TERM:manager]], [[TERM:moderator]], [[TERM:presenter]]
-   ACTORS:    [[ROLE:moderator]], [[ROLE:presenter]], [[ROLE:manager]]
-   USE-CASES: [[USE-CASE:configure-event]], [[USE-CASE:create-event]], [[USE-CASE:switch-provider]],
               [[USE-CASE:publish-start-finish]], [[USE-CASE:export-data]], [[USE-CASE:moderate]],
               [[USE-CASE:moderate-chat]], [[USE-CASE:steer-presenter]], [[USE-CASE:present]]
-   DATA:      Event configuration, moderation actions, statistics, exports

The event operator is a manager, moderator, or presenter who configures
events, moderates input, and presents forwarded questions, through the
same browser-based web client as the attendees, BECAUSE all event
operation happens through the same web application as attendance.

##  ENTITY: Streaming Provider {{provider}}

-   KIND:      System
-   DIRECTION: Outbound
-   TERMS:     [[TERM:provider]]
-   USE-CASES: [[USE-CASE:join-event]], [[USE-CASE:configure-event]], [[USE-CASE:switch-provider]]
-   PREMISES:  [[PREMISE:provider-delivery]]
-   DATA:      Live video ingest and playback streams

External streaming providers such as msg Filmstudio, msg Broadcast,
YouTube, Cloudflare, Twitch, and 3Q ingest and deliver the video,
BECAUSE the solution is streaming-provider independent and consumes
provider endpoints rather than hosting video.

##  ENTITY: Content CDN {{cdn}}

-   KIND:      Service
-   DIRECTION: Outbound
-   USE-CASES: [[USE-CASE:join-event]]
-   DATA:      Static client assets and static resources

A Cloudflare content delivery network fronts static content for fast,
stable distribution, BECAUSE static assets must load quickly and
reliably for a global, large-scale audience.

##  ENTITY: Event Registration System {{registration-system}}

-   KIND:      System
-   DIRECTION: Bidirectional
-   VIA:       [[ENTITY:operator]]
-   TERMS:     [[TERM:registration-system]]
-   USE-CASES: [[USE-CASE:create-event]]
-   PREMISES:  [[PREMISE:audience-known]], [[PREMISE:registration-exchange]]
-   DATA:      Attendee registration data and generated access URLs

The Event Registration System supplies attendee registration data and
receives generated access URLs without any direct technical interface:
the manager carries both as Excel sheets, uploading the exported
attendee list into the event and handing the returned URL sheet back,
BECAUSE events are provisioned from the organization's existing
registration system, which distributes the invitations itself.

##  ENTITY: Email Gateway {{email}}

-   KIND:      Service
-   DIRECTION: Outbound
-   USE-CASES: [[USE-CASE:authenticate]]
-   PREMISES:  [[PREMISE:email-delivery]]
-   DATA:      Authorization token emails

An external mail-sending service delivers one-time authorization tokens
to attendees, BECAUSE email is the first-factor channel through which
access is verified.

##  ENTITY: Translation LLM {{llm}}

-   KIND:      Service
-   DIRECTION: Outbound
-   USE-CASES: [[USE-CASE:join-event]], [[USE-CASE:ask-question]], [[USE-CASE:chat-during-event]]
-   PREMISES:  [[PREMISE:translation-service]], [[PREMISE:message-personal-data]]
-   DATA:      Source and translated message texts

An external AI/LLM service translates message texts between the
supported languages, BECAUSE chat and questions are made available in
German and English on the fly.

##  ENTITY: Embedded Third-Party App {{app}}

-   KIND:      System
-   DIRECTION: Bidirectional
-   USE-CASES: [[USE-CASE:moderate-chat]]
-   DATA:      Interactive app content and administration

An optional third-party application is embedded into the event for
additional interactivity, with a separate admin URL for moderators,
BECAUSE some events integrate external interactive tooling.
