---
Created:  2026-06-18 10:18
Modified: 2026-08-29 13:40
---

REQS: Domain Glossary (GL)
==========================

-   TERM: Event {{event}};
    TYPE: Entity;
    PREMISES: [[PREMISE:audience-bound]], [[PREMISE:two-languages]], [[PREMISE:start-surge]];
    The central, organizer-defined live broadcast occasion to which an
    audience is invited; it carries all configuration, [[TERM:Channel]]s,
    roles, the [[TERM:Access List]], and [[TERM:Message]]s, and
    progresses from planning through running to finished.

-   TERM: Attendee {{attendee}};
    TYPE: Actor;
    SYNONYMS: Participant, Viewer;
    BROADER: [[TERM:User]];
    PREMISES: [[PREMISE:email-at-hand]], [[PREMISE:audience-bound]], [[PREMISE:websocket-passage]], [[PREMISE:start-surge]], [[PREMISE:url-leakage]];
    A [[TERM:User]] invited to and logged into a specific [[TERM:Event]]
    who watches the stream and may use the interaction channels; an
    Attendee exists only for the duration of the [[TERM:Event]].

-   TERM: User {{user}};
    TYPE: Entity;
    A person identified by their email address within a specific
    [[TERM:Event]], existing only while granted a [[TERM:Role]], present
    on the [[TERM:Access List]], or joining via the access email pattern
    of the [[TERM:Event]]; a User is never a permanent account, and an
    [[TERM:Attendee]] is a User logged into the [[TERM:Event]].

-   TERM: Manager {{manager}};
    TYPE: Actor;
    BROADER: [[TERM:Role]];
    DISTINCT-FROM: [[TERM:Administrator]];
    An event-level [[TERM:Role]] that can edit, start, stop, and delete an
    [[TERM:Event]] and export its anonymized data; the Manager role is
    retained after the [[TERM:Event]] finishes until the [[TERM:Event]]
    is deleted.

-   TERM: Moderator {{moderator}};
    TYPE: Actor;
    BROADER: [[TERM:Role]];
    DISTINCT-FROM: [[TERM:Presenter]];
    PREMISES: [[PREMISE:interaction-abuse]];
    An event-specific [[TERM:Role]] that moderates chat and question
    [[TERM:Message]]s by rejecting, approving, and forwarding them, and
    that supports the [[TERM:Presenter]] with hints and curated input.

-   TERM: Presenter {{presenter}};
    TYPE: Actor;
    BROADER: [[TERM:Role]];
    DISTINCT-FROM: [[TERM:Moderator]];
    An event-specific [[TERM:Role]] held by the person on stage in a
    recorded video [[TERM:Event]], receiving the [[TERM:Message]]s
    forwarded by the [[TERM:Moderator]] and marking them answered or
    suspended after processing them live; unlike the [[TERM:Moderator]],
    the Presenter curates nothing and sees only the forwarded subset.

-   TERM: Administrator {{administrator}};
    TYPE: Actor;
    SYNONYMS: Software Administrator, Hardware Administrator;
    DISTINCT-FROM: [[TERM:Manager]];
    A permanent system role; the Hardware Administrator manages the
    physical server while the Software Administrator manages the
    software configuration and creates [[TERM:Event]]s.

-   TERM: Role {{role}};
    TYPE: Entity;
    SYNONYMS: Event Role;
    A grant of special rights to a [[TERM:User]] within a specific
    [[TERM:Event]], of type [[TERM:Manager]], [[TERM:Moderator]], or
    [[TERM:Presenter]]; the [[TERM:Administrator]] is a permanent system
    role, not an event Role.

-   TERM: Channel {{channel}};
    TYPE: Entity;
    DISTINCT-FROM: [[TERM:Resource]];
    A logical content stream of an [[TERM:Event]] grouping language- and
    resolution-specific [[TERM:Resource]]s; exactly one Channel of an
    [[TERM:Event]] is active at a time.

-   TERM: Resource {{resource}};
    TYPE: Entity;
    DISTINCT-FROM: [[TERM:Channel]];
    PREMISES: [[PREMISE:provider-delivery]];
    A physical content delivery endpoint backing a [[TERM:Channel]],
    such as a provider video stream or a static website; exactly one
    Resource of a [[TERM:Channel]] is active at a time.

-   TERM: Streaming Provider {{provider}};
    TYPE: Actor;
    SYNONYMS: Provider, CDN Provider;
    PREMISES: [[PREMISE:provider-delivery]];
    An external service such as msg Filmstudio, YouTube, Cloudflare,
    Twitch, or 3Q that ingests and delivers the video stream addressed
    by a [[TERM:Resource]] through configured provider parameters.

-   TERM: Message {{message}};
    TYPE: Entity;
    PREMISES: [[PREMISE:two-languages]], [[PREMISE:translation-service]], [[PREMISE:message-personal-data]], [[PREMISE:interaction-abuse]];
    A single unit of [[TERM:Event]] interaction of type [[TERM:Chat]],
    [[TERM:Question]], or [[TERM:Support]], carrying language-specific
    texts and moving through a moderation and presentation lifecycle.

-   TERM: Question {{question}};
    TYPE: Entity;
    SYNONYMS: Question Message;
    BROADER: [[TERM:Message]];
    A [[TERM:Message]] submitted by an [[TERM:Attendee]] as structured
    audience input for the Q&A rounds; it passes through the full
    moderation and presentation lifecycle, may carry
    [[TERM:Question Tag]]s, and may receive [[TERM:Like]]s.

-   TERM: Chat {{chat}};
    TYPE: Entity;
    SYNONYMS: Chat Message;
    BROADER: [[TERM:Message]];
    A [[TERM:Message]] sent by an [[TERM:Attendee]] as direct live
    commentary on the [[TERM:Event]], visible to the audience once
    accepted; it may receive [[TERM:Like]]s and, where enabled, replies.

-   TERM: Support {{support}};
    TYPE: Entity;
    SYNONYMS: Support Message;
    BROADER: [[TERM:Message]];
    A [[TERM:Message]] exchanged privately between an [[TERM:Attendee]]
    and the [[TERM:Moderator]]s for clarification and help; it is never
    visible to the audience and needs no moderation.

-   TERM: Like {{like}};
    TYPE: Entity;
    The marking of a [[TERM:Question]] or [[TERM:Chat]] as relevant by
    an [[TERM:Attendee]], tracked per [[TERM:User]] and revocable until
    the [[TERM:Event]] finishes, thereafter conserved as a bare count by
    the [[TERM:Anonymization]].

-   TERM: Authorization Token {{authtoken}};
    TYPE: Entity;
    SYNONYMS: Access Token;
    DISTINCT-FROM: [[TERM:Session Token]];
    PREMISES: [[PREMISE:email-at-hand]], [[PREMISE:email-delivery]];
    A one-time, time-limited "NNN-NNN" six-digit second factor proving
    an [[TERM:Attendee]] controls their email address; it may be
    pre-generated for automatic access.

-   TERM: Session Token {{sessiontoken}};
    TYPE: Entity;
    DISTINCT-FROM: [[TERM:Authorization Token]];
    PREMISES: [[PREMISE:url-leakage]];
    The result of a successful login granting an [[TERM:Attendee]] an
    active connection to an [[TERM:Event]]; only one Session Token per
    User per [[TERM:Event]] may be active at a time.

-   TERM: Access List {{accesslist}};
    TYPE: Entity;
    PREMISES: [[PREMISE:audience-known]], [[PREMISE:registration-exchange]], [[PREMISE:url-leakage]];
    The set of Users, identified by email, invited to a specific
    [[TERM:Event]]; together with the access email pattern it determines
    who may be granted [[TERM:Event]] access.

-   TERM: Event Registration System {{registration-system}};
    TYPE: Actor;
    PREMISES: [[PREMISE:audience-known]], [[PREMISE:registration-exchange]];
    The external registration platform from which [[TERM:Attendee]]
    data is imported via Excel and to which generated access URLs are
    returned.

-   TERM: Anonymization {{anonymization}};
    TYPE: Activity;
    SYNONYMS: Privacy by Design Finish;
    PREMISES: [[PREMISE:message-personal-data]];
    The automated procedure on [[TERM:Event]] finish that reduces
    [[TERM:Message]]s to like counts, anonymizes sender names, drops
    personal relations, deletes tokens and Users, and removes
    [[TERM:Moderator]] roles.

-   TERM: Sentiment Analysis {{sentiment}};
    TYPE: Activity;
    SYNONYMS: Profanity Check;
    PREMISES: [[PREMISE:interaction-abuse]];
    The optional client-side or server-side evaluation of
    [[TERM:Message]] text yielding a sentiment score used to prevent,
    auto-accept, or auto-reject improper input.

-   TERM: Question Tag {{questiontag}};
    TYPE: Entity;
    SYNONYMS: Tag;
    A named label attachable to a Question [[TERM:Message]] giving it
    context such as the addressed person or [[TERM:Agenda Point]],
    optionally restricted to [[TERM:Moderator]]s.

-   TERM: Agenda Point {{agendapoint}};
    TYPE: Entity;
    A phase of an [[TERM:Event]], described by a short text and placed
    in a defined sequence, letting [[TERM:Attendee]]s and
    [[TERM:Moderator]]s track which part of the [[TERM:Event]] is
    currently active and letting a [[TERM:Question Tag]] relate a
    [[TERM:Question]] to it.
