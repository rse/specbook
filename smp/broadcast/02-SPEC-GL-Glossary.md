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
    BROADER: [[TERM:User]];
    A [[TERM:User]] invited to and logged into a specific [[TERM:Event]]
    who watches the stream and may use the interaction channels; an
    Attendee exists only for the duration of the [[TERM:Event]].

-   TERM: User {{user}};
    A person identified by their email address within a specific
    [[TERM:Event]], existing only while granted a [[TERM:Role]], present
    on the [[TERM:Access List]], or joining via the access email pattern
    of the [[TERM:Event]]; a User is never a permanent account, and an
    [[TERM:Attendee]] is a User logged into the [[TERM:Event]].

-   TERM: Manager {{manager}};
    BROADER: [[TERM:Role]];
    DISTINCT-FROM: [[TERM:Administrator]];
    An event-level [[TERM:Role]] that can edit, start, stop, and delete an
    [[TERM:Event]] and export its anonymized data; the Manager role is
    retained after the [[TERM:Event]] finishes until the [[TERM:Event]]
    is deleted.

-   TERM: Moderator {{moderator}};
    BROADER: [[TERM:Role]];
    DISTINCT-FROM: [[TERM:Presenter]];
    An event-specific [[TERM:Role]] that moderates chat and question
    [[TERM:Message]]s by rejecting, approving, and forwarding them, and
    that supports the [[TERM:Presenter]] with hints and curated input.

-   TERM: Presenter {{presenter}};
    BROADER: [[TERM:Role]];
    DISTINCT-FROM: [[TERM:Moderator]];
    An event-specific [[TERM:Role]] held by the person on stage in a
    recorded video [[TERM:Event]], receiving the [[TERM:Message]]s
    forwarded by the [[TERM:Moderator]] and marking them answered or
    suspended after processing them live; unlike the [[TERM:Moderator]],
    the Presenter curates nothing and sees only the forwarded subset.

-   TERM: Administrator {{administrator}};
    SYNONYMS: Software Administrator, Hardware Administrator;
    DISTINCT-FROM: [[TERM:Manager]];
    A permanent system role; the Hardware Administrator manages the
    physical server while the Software Administrator manages the
    software configuration and creates [[TERM:Event]]s.

-   TERM: Role {{role}};
    SYNONYMS: Event Role;
    A grant of special rights to a [[TERM:User]] within a specific
    [[TERM:Event]], of type [[TERM:Manager]], [[TERM:Moderator]], or
    [[TERM:Presenter]]; the [[TERM:Administrator]] is a permanent system
    role, not an event Role.

-   TERM: Channel {{channel}};
    DISTINCT-FROM: [[TERM:Resource]];
    A logical content stream of an [[TERM:Event]] grouping language- and
    resolution-specific [[TERM:Resource]]s; exactly one Channel of an
    [[TERM:Event]] is active at a time.

-   TERM: Resource {{resource}};
    DISTINCT-FROM: [[TERM:Channel]];
    A physical content delivery endpoint backing a [[TERM:Channel]],
    such as a provider video stream or a static website; exactly one
    Resource of a [[TERM:Channel]] is active at a time.

-   TERM: Streaming Provider {{provider}};
    SYNONYMS: Provider, CDN Provider;
    An external service such as msg Filmstudio, YouTube, Cloudflare,
    Twitch, or 3Q that ingests and delivers the video stream addressed
    by a [[TERM:Resource]] through configured provider parameters.

-   TERM: Message {{message}};
    A single unit of [[TERM:Event]] interaction of type [[TERM:Chat]],
    [[TERM:Question]], or [[TERM:Support]], carrying language-specific
    texts and moving through a moderation and presentation lifecycle.

-   TERM: Question {{question}};
    SYNONYMS: Question Message;
    BROADER: [[TERM:Message]];
    A [[TERM:Message]] submitted by an [[TERM:Attendee]] as structured
    audience input for the Q&A rounds; it passes through the full
    moderation and presentation lifecycle, may carry
    [[TERM:Question Tag]]s, and may receive [[TERM:Like]]s.

-   TERM: Chat {{chat}};
    SYNONYMS: Chat Message;
    BROADER: [[TERM:Message]];
    A [[TERM:Message]] sent by an [[TERM:Attendee]] as direct live
    commentary on the [[TERM:Event]], visible to the audience once
    accepted; it may receive [[TERM:Like]]s and, where enabled, replies.

-   TERM: Support {{support}};
    SYNONYMS: Support Message;
    BROADER: [[TERM:Message]];
    A [[TERM:Message]] exchanged privately between an [[TERM:Attendee]]
    and the [[TERM:Moderator]]s for clarification and help; it is never
    visible to the audience and needs no moderation.

-   TERM: Like {{like}};
    The marking of a [[TERM:Question]] or [[TERM:Chat]] as relevant by
    an [[TERM:Attendee]], tracked per [[TERM:User]] and revocable until
    the [[TERM:Event]] finishes, thereafter conserved as a bare count by
    the [[TERM:Anonymization]].

-   TERM: Authorization Token {{authtoken}};
    SYNONYMS: Access Token;
    DISTINCT-FROM: [[TERM:Session Token]];
    A one-time, time-limited "NNN-NNN" six-digit second factor proving
    an [[TERM:Attendee]] controls their email address; it may be
    pre-generated for automatic access.

-   TERM: Session Token {{sessiontoken}};
    DISTINCT-FROM: [[TERM:Authorization Token]];
    The result of a successful login granting an [[TERM:Attendee]] an
    active connection to an [[TERM:Event]]; only one Session Token per
    User per [[TERM:Event]] may be active at a time.

-   TERM: Access List {{accesslist}};
    The set of Users, identified by email, invited to a specific
    [[TERM:Event]]; together with the access email pattern it determines
    who may be granted [[TERM:Event]] access.

-   TERM: Event Registration System {{registration-system}};
    The external registration platform from which [[TERM:Attendee]]
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
