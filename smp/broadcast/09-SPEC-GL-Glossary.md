---
Created:  2026-06-18 10:18
Modified: 2026-08-19 22:04
---

SPEC: Glossary (GL)
===================

-   TERM: Event {{event}};
    The central, organizer-defined live broadcast occasion to which an
    audience is invited; it carries all configuration, [[TERM:Channel]]s,
    roles, the [[TERM:Access List]], and [[TERM:Message]]s, and
    progresses from planning through running to finished.

-   TERM: Attendee {{attendee}};
    SYNONYMS: Participant, Viewer;
    A person invited to and logged into a specific [[TERM:Event]] who
    watches the stream and may use the interaction channels; an Attendee
    exists only for the duration of the [[TERM:Event]].

-   TERM: Manager {{manager}};
    An event-level role that can edit, start, stop, and delete an
    [[TERM:Event]] and export its anonymized data; the Manager role is
    retained after the [[TERM:Event]] finishes until the [[TERM:Event]]
    is deleted.

-   TERM: Moderator {{moderator}};
    An event-specific role that moderates chat and question
    [[TERM:Message]]s by rejecting, approving, and forwarding them, and
    that supports the [[TERM:Presenter]] with hints and curated input.

-   TERM: Presenter {{presenter}};
    The physical moderator on stage in a recorded video [[TERM:Event]]
    who receives forwarded [[TERM:Message]]s from the [[TERM:Moderator]]
    and marks them answered or suspended after processing them live.

-   TERM: Administrator {{administrator}};
    SYNONYMS: Software Administrator, Hardware Administrator;
    A permanent system role; the Hardware Administrator manages the
    physical server while the Software Administrator manages the
    software configuration and creates [[TERM:Event]]s.

-   TERM: Channel {{channel}};
    A logical content stream of an [[TERM:Event]] grouping language- and
    resolution-specific [[TERM:Resource]]s; exactly one Channel of an
    [[TERM:Event]] is active at a time.

-   TERM: Resource {{resource}};
    A physical content delivery endpoint backing a [[TERM:Channel]],
    such as a provider video stream or a static website; exactly one
    Resource of a [[TERM:Channel]] is active at a time.

-   TERM: Streaming Provider {{provider}};
    SYNONYMS: Provider, CDN Provider;
    An external service such as msg Filmstudio, YouTube, Cloudflare,
    Twitch, or 3Q that ingests and delivers the video stream addressed
    by a [[TERM:Resource]] through configured provider parameters.

-   TERM: Message {{message}};
    A single unit of [[TERM:Event]] interaction of type Chat, Question,
    or Support, carrying language-specific texts and moving through a
    moderation and presentation lifecycle.

-   TERM: Authorization Token {{authtoken}};
    SYNONYMS: Access Token, Token;
    A one-time, time-limited "NNN-NNN" six-digit second factor proving
    an [[TERM:Attendee]] controls their email address; it may be
    pre-generated for automatic access.

-   TERM: Session Token {{sessiontoken}};
    SYNONYMS: Session;
    The result of a successful login granting an [[TERM:Attendee]] an
    active connection to an [[TERM:Event]]; only one Session Token per
    User per [[TERM:Event]] may be active at a time.

-   TERM: Access List {{accesslist}};
    The set of Users, identified by email, invited to a specific
    [[TERM:Event]]; together with the access email pattern it determines
    who may be granted [[TERM:Event]] access.

-   TERM: Ventari {{ventari}};
    The external U2D registration platform from which [[TERM:Attendee]]
    data is imported via Excel and to which generated access URLs are
    returned.

-   TERM: Anonymization {{anonymization}};
    SYNONYMS: Privacy by Design Finish;
    The automated procedure on [[TERM:Event]] finish that reduces
    [[TERM:Message]]s to like counts, anonymizes sender names, drops
    personal relations, deletes tokens and Users, and removes
    [[TERM:Moderator]] roles.

-   TERM: Sentiment Analysis {{sentiment}};
    SYNONYMS: Profanity Check;
    The optional client-side or server-side evaluation of
    [[TERM:Message]] text yielding a sentiment score used to prevent,
    auto-accept, or auto-reject improper input.

-   TERM: Question Tag {{questiontag}};
    SYNONYMS: Tag;
    A named label attachable to a Question [[TERM:Message]] giving it
    context such as the addressed person or agenda point, optionally
    restricted to [[TERM:Moderator]]s.
