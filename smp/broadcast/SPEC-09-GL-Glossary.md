---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

#   SPEC: Glossary (GL)

##  TERM: Event <a id="SPEC-GL-event"></a>

The central, organizer-defined live broadcast occasion to which an audience is invited; it carries all configuration,
channels, roles, access list, and messages, and progresses from planning through running to finished.

##  TERM: Attendee <a id="SPEC-GL-attendee"></a>

-   SYNONYMS: Participant, Viewer

A person invited to and logged into a specific Event who watches the stream and may use the interaction channels; an
Attendee exists only for the duration of the Event.

##  TERM: Manager <a id="SPEC-GL-manager"></a>

An event-level role that can edit, start, stop, and delete an Event and export its anonymized data; the Manager role is
retained after the Event finishes until the Event is deleted.

##  TERM: Moderator <a id="SPEC-GL-moderator"></a>

An event-specific role that moderates chat and question Messages by rejecting, approving, and forwarding them, and that
supports the Presenter with hints and curated input.

##  TERM: Presenter <a id="SPEC-GL-presenter"></a>

The physical moderator on stage in a recorded video Event who receives forwarded Messages from the Moderator and marks them
answered or suspended after processing them live.

##  TERM: Administrator <a id="SPEC-GL-administrator"></a>

-   SYNONYMS: Software Administrator, Hardware Administrator

A permanent system role; the Hardware Administrator manages the physical server while the Software Administrator manages the
software configuration and creates Events.

##  TERM: Channel <a id="SPEC-GL-channel"></a>

A logical content stream of an Event grouping language- and resolution-specific Resources; exactly one Channel of an Event is
active at a time.

##  TERM: Resource <a id="SPEC-GL-resource"></a>

A physical content delivery endpoint backing a Channel, such as a provider video stream or a static website; exactly one
Resource of a Channel is active at a time.

##  TERM: Streaming Provider <a id="SPEC-GL-provider"></a>

-   SYNONYMS: Provider, CDN Provider

An external service such as msg Filmstudio, YouTube, Cloudflare, Twitch, or 3Q that ingests and delivers the video stream
addressed by a Resource through configured provider parameters.

##  TERM: Message <a id="SPEC-GL-message"></a>

A single unit of Event interaction of type Chat, Question, or Support, carrying language-specific texts and moving through a
moderation and presentation lifecycle.

##  TERM: Authorization Token <a id="SPEC-GL-authtoken"></a>

-   SYNONYMS: Access Token, Token

A one-time, time-limited "NNN-NNN" six-digit second factor proving an Attendee controls their email address; it may be
pre-generated for automatic access.

##  TERM: Session Token <a id="SPEC-GL-sessiontoken"></a>

-   SYNONYMS: Session

The result of a successful login granting an Attendee an active connection to an Event; only one Session Token per User per
Event may be active at a time.

##  TERM: Access List <a id="SPEC-GL-accesslist"></a>

The set of Users, identified by email, invited to a specific Event; together with the access email pattern it determines who
may be granted Event access.

##  TERM: Ventari <a id="SPEC-GL-ventari"></a>

The external U2D registration platform from which attendee data is imported via Excel and to which generated access URLs are
returned.

##  TERM: Anonymization <a id="SPEC-GL-anonymization"></a>

-   SYNONYMS: Privacy by Design Finish

The automated procedure on Event finish that reduces Messages to like counts, anonymizes sender names, drops personal
relations, deletes tokens and Users, and removes Moderator roles.

##  TERM: Sentiment Analysis <a id="SPEC-GL-sentiment"></a>

-   SYNONYMS: Profanity Check

The optional client-side or server-side evaluation of message text yielding a sentiment score used to prevent, auto-accept,
or auto-reject improper input.

##  TERM: Question Tag <a id="SPEC-GL-questiontag"></a>

-   SYNONYMS: Tag

A named label attachable to a Question Message giving it context such as the addressed person or agenda point, optionally
restricted to Moderators.
