---
Created:  2026-08-30 14:00
Modified: 2026-08-30 14:00
---

REQS: Solution Premises (SP)
============================

##  PREMISE: Registered Audience Known in Advance {{audience-known}}

-   TYPE:        Assumption
-   TERMS:       [[TERM:registration-system]], [[TERM:accesslist]]
-   LIKELIHOOD:  Low
-   IMPACT:      High
-   CONSEQUENCE: Without an attendee list ahead of the event, no individual access URLs can be
                 generated and returned, so the event has to fall back onto an access email
                 pattern or onto anonymous access.
-   MITIGATION:  Access email patterns and anonymous access remain available as fallback access
                 modes of an event.
-   AFFECTS:     [[FR.registration-import]], [[FR.registration-export]], [[FR.individual-url]]

The audience of an event is registered in the Event Registration System before the event takes
place, so that its attendee list is available for import while the event is planned, BECAUSE the
organization invites its events through the registration system and never on the day of the event
itself.

##  PREMISE: Attendees Read Their Email While Logging In {{email-at-hand}}

-   TYPE:        Assumption
-   TERMS:       [[TERM:attendee]], [[TERM:authtoken]]
-   LIKELIHOOD:  Medium
-   IMPACT:      Medium
-   CONSEQUENCE: An attendee without access to their mailbox at login time cannot consume the
                 authorization token within its validity of 5 minutes and is locked out of the
                 event.
-   MITIGATION:  Personalized and automatic access URLs let a pre-verified attendee skip the token
                 step, and the token validity is configurable per event.
-   AFFECTS:     [[FR.authentication]], [[NR.token-strength]], [[RULE:token-format]]

An attendee has their mailbox at hand on the device (or next to it) while logging in, so that the
one-time authorization token reaches them within its validity, BECAUSE the invitation itself
arrives by email and attendees join from the same workplace or home context.

##  PREMISE: Ten Thousand Attendees Is the Upper Bound {{audience-bound}}

-   TYPE:        Assumption
-   TERMS:       [[TERM:event]], [[TERM:attendee]]
-   LIKELIHOOD:  Low
-   IMPACT:      High
-   CONSEQUENCE: An event exceeding 10.000 simultaneous attendees exhausts the dimensioned relay
                 and proxy capacity, degrading or refusing the connections of the excess audience.
-   MITIGATION:  The horizontal scaling of proxy, relay, and server instances leaves headroom,
                 which is confirmed by a load test before each larger event.
-   AFFECTS:     [[NR.attendee-scale]], [[NR.scalability]]

No single event gathers more than 10.000 simultaneous attendees, the size of the largest digital
town hall of the organization, BECAUSE the invited audience is bounded by the workforce of the
organization and its registration figures.

##  PREMISE: Attendee Networks Pass WebSocket Traffic {{websocket-passage}}

-   TYPE:        Assumption
-   TERMS:       [[TERM:attendee]]
-   LIKELIHOOD:  Medium
-   IMPACT:      High
-   CONSEQUENCE: An attendee behind a proxy or firewall which blocks long-lived WebSocket
                 connections sees the video but receives neither the live interaction nor the
                 configuration updates.
-   MITIGATION:  All connections use the standard HTTPS port with a WebSocket upgrade, and the
                 client reports a failed real-time connection to the attendee.
-   AFFECTS:     [[FR.browser-access]], [[FR.chat]], [[FR.questions]], [[NR.browser-compat]]

The corporate and home networks of the attendees permit long-lived WebSocket connections over
HTTPS, BECAUSE the live interaction and the configuration propagation are carried over
MQTT-over-WebSocket rather than over plain HTTP requests.

##  PREMISE: German and English Cover All Events {{two-languages}}

-   TYPE:        Assumption
-   TERMS:       [[TERM:event]], [[TERM:message]]
-   LIKELIHOOD:  Low
-   IMPACT:      Low
-   CONSEQUENCE: An event held in a third language needs a further translation target and user
                 interface locale, which the solution does not offer.
-   AFFECTS:     [[NR.streaming-quality]], [[FR.language-switch]]

Every event is held in German or English and its audience reads at least one of the two, BECAUSE
these are the working languages of the organization.

##  PREMISE: Streaming Providers Deliver the Video {{provider-delivery}}

-   TYPE:        Dependency
-   TERMS:       [[TERM:provider]], [[TERM:resource]]
-   LIKELIHOOD:  Medium
-   IMPACT:      High
-   CONSEQUENCE: Without a working provider resource there is no video, and the event degrades
                 to an interaction channel without a stream.
-   MITIGATION:  Every event is configured with at least one fallback provider resource, and the
                 operators switch providers live without user interaction.
-   AFFECTS:     [[FR.multi-provider]], [[FR.provider-switch]], [[NR.failover]], [[NR.streaming-quality]]

The external streaming providers (such as msg Filmstudio, YouTube, Cloudflare, or 3Q) ingest,
encode, and deliver the video and expose an embeddable playback URL in the required 1080p30
quality, BECAUSE the solution deliberately neither produces nor hosts the video streams itself.

##  PREMISE: Registration System Exchanges Attendee Data {{registration-exchange}}

-   TYPE:        Dependency
-   TERMS:       [[TERM:registration-system]], [[TERM:accesslist]]
-   LIKELIHOOD:  Low
-   IMPACT:      Medium
-   CONSEQUENCE: A changed export format of the registration system breaks the attendee import,
                 and the invitation emails cannot carry the individual access URLs.
-   MITIGATION:  The exchange uses plain Excel sheets in an agreed column layout, which the
                 manager can adjust by hand in the worst case.
-   AFFECTS:     [[FR.registration-import]], [[FR.registration-export]]

The Event Registration System exports the attendee registrations of an event as an Excel sheet,
accepts the generated access URLs in return, and sends the invitation emails itself, BECAUSE the
organization provisions its events from its existing registration system and the solution does
not send invitations.

##  PREMISE: Email Gateway Delivers Tokens Within Minutes {{email-delivery}}

-   TYPE:        Dependency
-   TERMS:       [[TERM:authtoken]]
-   LIKELIHOOD:  Medium
-   IMPACT:      High
-   CONSEQUENCE: A delayed or undelivered token email locks the attendee out, as the token
                 expires after 5 minutes, and at the event start thousands of attendees are
                 affected at once.
-   MITIGATION:  The token validity is configurable per event, and automatic access URLs let
                 pre-verified attendees enter without a token email.
-   AFFECTS:     [[FR.authentication]], [[NR.token-strength]], [[RULE:token-format]]

The external email gateway accepts the one-time authorization token emails at the burst rate of an
event start and delivers them to the attendees within a minute, BECAUSE the email token is the
first-factor authentication of the solution.

##  PREMISE: Translation Service Available During Events {{translation-service}}

-   TYPE:        Dependency
-   TERMS:       [[TERM:message]]
-   LIKELIHOOD:  Medium
-   IMPACT:      Low
-   CONSEQUENCE: Without the service, messages remain in their source language only, so the
                 attendees of the other language read untranslated chat and questions.
-   MITIGATION:  Messages are stored and shown in their source language regardless, and the
                 translation is added asynchronously once the service responds.
-   AFFECTS:     [[FR.language-switch]]

The external AI/LLM service translates message texts between German and English on the fly within
a few seconds, BECAUSE the two-language audience expects to read chat and questions in their own
language.

##  PREMISE: EU Hosting on Self-Operated Infrastructure {{eu-hosting}}

-   TYPE:        Dependency
-   LIKELIHOOD:  Low
-   IMPACT:      High
-   CONSEQUENCE: Hosting outside the EU or on a public cloud without an EU data-processing
                 agreement violates the GDPR obligations of the operator and voids the cost
                 advantage of the solution.
-   MITIGATION:  The hosting contract fixes the data center location, and the containerized
                 deployment is portable to any other EU hoster.
-   AFFECTS:     [[FR.gdpr-eu]], [[NR.gdpr]], [[NR.cost]]

The Hetzner data center in Nürnberg, Germany, provides the virtual machines the solution runs on,
within the EU and at a price below the equivalent public cloud offerings, BECAUSE self-hosting
within the EU is both the legal and the economic foundation of the solution.

##  PREMISE: Connection Surge at Event Start {{start-surge}}

-   TYPE:        Risk
-   TERMS:       [[TERM:event]], [[TERM:attendee]]
-   LIKELIHOOD:  High
-   IMPACT:      High
-   CONSEQUENCE: Thousands of attendees logging in within the same minute overload the token
                 issuing, the email gateway, and the relays, so that the first minutes of the
                 event are lost for a part of the audience.
-   MITIGATION:  Proxy, relay, and server instances are scaled out before the event, and
                 personalized and automatic access URLs let most attendees bypass the token step.
-   AFFECTS:     [[NR.attendee-scale]], [[NR.scalability]], [[FR.authentication]]

The audience of a large event connects within a very short window around the announced start
rather than spread over time, BECAUSE attendees open their invitation link only when the event
begins.

##  PREMISE: Access URLs Forwarded Beyond the Audience {{url-leakage}}

-   TYPE:        Risk
-   TERMS:       [[TERM:attendee]], [[TERM:sessiontoken]], [[TERM:accesslist]]
-   LIKELIHOOD:  Medium
-   IMPACT:      Medium
-   CONSEQUENCE: Uninvited persons watch a confidential event and take part in its interaction
                 under the identity of an invited attendee.
-   MITIGATION:  Access is granted to listed or pattern-matching email addresses only, each
                 attendee holds a single active session, and unguessable URLs with time-limited
                 tokens shorten the window of a leaked link.
-   AFFECTS:     [[FR.parallel-access]], [[NR.token-strength]], [[RULE:single-session]], [[RULE:access-grant]]

An invited attendee forwards their individual access URL to colleagues or posts it publicly,
BECAUSE personal links are easily shared and attendees do not perceive them as secrets.

##  PREMISE: Message Texts Contain Personal Data {{message-personal-data}}

-   TYPE:        Risk
-   TERMS:       [[TERM:message]], [[TERM:anonymization]]
-   LIKELIHOOD:  High
-   IMPACT:      Medium
-   CONSEQUENCE: Personal data written into chat and questions is exported to the organizers and
                 sent to the external translation service, so that a retention or transfer
                 beyond the given consent violates the GDPR.
-   MITIGATION:  Attendees give explicit consent before interacting, the finish procedure
                 anonymizes all attendee data, and the translation service is contracted under
                 an EU data-processing agreement.
-   AFFECTS:     [[FR.user-consent]], [[NR.gdpr]], [[NR.privacy]], [[RULE:anonymize]]

Attendees write personal data of themselves or of others into chat messages and questions, BECAUSE
free-text interaction cannot be constrained to non-personal content.

##  PREMISE: Abusive Interaction from the Audience {{interaction-abuse}}

-   TYPE:        Risk
-   TERMS:       [[TERM:message]], [[TERM:moderator]], [[TERM:sentiment]]
-   LIKELIHOOD:  Medium
-   IMPACT:      Medium
-   CONSEQUENCE: Spam, floods, or offensive messages drown the legitimate questions and put the
                 moderators under pressure during the live event.
-   MITIGATION:  Messages are moderated before becoming visible, submissions are throttled per
                 attendee, and the sentiment analysis flags offensive content automatically.
-   AFFECTS:     [[FR.moderation]], [[FR.server-sentiment]], [[NR.throttling]], [[RULE:moderation-gate]]

A part of the audience misuses the chat and question channels with spam, floods, or offensive
content, BECAUSE large invited audiences are never free of disruptive participants.
