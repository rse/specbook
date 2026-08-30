---
Created:  2026-06-18 10:18
Modified: 2026-08-30 00:49
---

ARCH: Context View (CV)
=======================

##  ENTITY: Attendee Browser {{attendee}}

-   KIND:      Person
-   DIRECTION: Bidirectional
-   DATA:      Login credentials, video playback, chat, questions, likes

The attendee's web browser is the primary client through which a person
authenticates, watches the stream, and interacts, BECAUSE Broadcast is a
browser-delivered solution serving thousands of concurrent attendees.

##  ENTITY: Operator Browser {{operator}}

-   KIND:      Person
-   DIRECTION: Bidirectional
-   DATA:      Event configuration, moderation actions, statistics, exports

Managers, moderators, and presenters use their browsers to configure
events, moderate input, and present forwarded questions, BECAUSE all
event operation happens through the same web application as attendance.

##  ENTITY: Streaming Provider {{provider}}

-   KIND:      System
-   DIRECTION: Outbound
-   DATA:      Live video ingest and playback streams

External streaming providers such as msg Filmstudio, msg Broadcast,
YouTube, Cloudflare, Twitch, and 3Q ingest and deliver the video,
BECAUSE the solution is streaming-provider independent and consumes
provider endpoints rather than hosting video.

##  ENTITY: Content CDN {{cdn}}

-   KIND:      Service
-   DIRECTION: Outbound
-   DATA:      Static client assets and static resources

A Cloudflare content delivery network fronts static content for fast,
stable distribution, BECAUSE static assets must load quickly and
reliably for a global, large-scale audience.

##  ENTITY: Event Registration System {{registration-system}}

-   KIND:      System
-   DIRECTION: Bidirectional
-   DATA:      Attendee registration data and generated access URLs

The Event Registration System supplies attendee registration data and
receives generated access URLs via Excel exchange, BECAUSE events are
provisioned from the organization's existing registration system.

##  ENTITY: Email Gateway {{email}}

-   KIND:      Service
-   DIRECTION: Outbound
-   DATA:      Authorization token emails

An external mail-sending service delivers one-time authorization tokens
to attendees, BECAUSE email is the first-factor channel through which
access is verified.

##  ENTITY: Translation LLM {{llm}}

-   KIND:      Service
-   DIRECTION: Outbound
-   DATA:      Source and translated message texts

An external AI/LLM service translates message texts between the
supported languages, BECAUSE chat and questions are made available in
German and English on the fly.

##  ENTITY: Embedded Third-Party App {{app}}

-   KIND:      System
-   DIRECTION: Bidirectional
-   DATA:      Interactive app content and administration

An optional third-party application is embedded into the event for
additional interactivity, with a separate admin URL for moderators,
BECAUSE some events integrate external interactive tooling.
