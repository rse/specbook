---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

#   SPEC: Business Rules (BR)

##  RULE: Single Active Session per Event {{single-session}}

-   CATEGORY:   Invariant
-   CONSTRAINS: [[FR.parallel-access]]

A User MUST have at most one active Session Token per Event at any time; a new login MUST delete any existing Session Token
and close its connection, BECAUSE concurrent sessions would allow access sharing beyond the invited participant.

##  RULE: Access Requires List or Pattern Match {{access-grant}}

-   CATEGORY:   Constraint
-   CONSTRAINS: [[FR.authentication]]

A User MUST be granted Event access only if their email is on the Event access list, matches the Event access email pattern,
or the Event allows anonymous access, BECAUSE access must be limited to the audience the organizer intends.

##  RULE: Single Active Channel {{single-channel}}

-   CATEGORY:   Invariant
-   CONSTRAINS: [[FR.provider-switch]]

Exactly one Channel of an Event MUST be active at any time, BECAUSE attendees follow one logical content stream that
defines the current event feed.

##  RULE: Single Active Resource per Channel {{single-resource}}

-   CATEGORY:   Invariant
-   CONSTRAINS: [[FR.provider-switch]], [[FR.multi-provider]]

Exactly one Resource of a Channel MUST be active at any time, BECAUSE switching the active Resource is the mechanism by
which the live streaming provider is changed.

##  RULE: Moderation Determines Initial Visibility {{moderation-gate}}

-   CATEGORY:   Policy
-   CONSTRAINS: [[FR.moderation]], [[FR.chat]], [[FR.questions]]

When moderation is enabled for a message type, an attendee Message MUST start in state pending and become visible only once
accepted; when disabled, it MUST start in state accepted, BECAUSE organizers must control what the audience sees.

##  RULE: Moderator Messages Auto-Accepted {{moderator-accept}}

-   CATEGORY:   Policy
-   CONSTRAINS: [[FR.moderator-messages]]

A Message authored by a Moderator MUST be created in state accepted and carry the sender name "Moderator" unless overridden,
BECAUSE moderator-authored content is trusted and needs no further approval.

##  RULE: Forwarded Messages Are Immutable {{forward-lock}}

-   CATEGORY:   Constraint
-   CONSTRAINS: [[FR.message-editing]], [[FR.forward-presenter]]

Once a Message reaches state forwarded, the attendee MUST NOT edit or delete it, BECAUSE the presenter relies on the
forwarded content remaining stable for live processing.

##  RULE: State Set Depends on Message Type {{type-states}}

-   CATEGORY:   Constraint
-   CONSTRAINS: [[FR.moderation]]

A Question MAY use all message states, a Chat MUST use only pending, accepted, and rejected, and a Support message MUST only
be accepted, BECAUSE each message type has a different interaction lifecycle.

##  RULE: Sentiment Auto-Decision Threshold {{sentiment-threshold}}

-   CATEGORY:   Derivation
-   CONSTRAINS: [[FR.server-sentiment]]

When server-side sentiment analysis is enabled, a sentiment score below -0.1 MUST be treated as improper and a score at or
above it as proper for auto-accept and auto-reject decisions, BECAUSE a defined threshold makes automated moderation
predictable.

##  RULE: Anonymization on Event Finish {{anonymize}}

-   CATEGORY:   Policy
-   CONSTRAINS: [[FR.user-consent]], [[FR.gdpr-eu]]

On Event finish the system MUST reduce Messages to a bare like count, set Chat and Question sender names to "Anonymous", drop
liker and sender relations, delete Authorization and Session Tokens, clear the access list and delete referenced Users, and
delete Moderator roles while retaining Manager roles, BECAUSE personal data must not be retained beyond the event.

##  RULE: Likes Conserved as Count on Finish {{like-count}}

-   CATEGORY:   Derivation
-   CONSTRAINS: [[FR.likes]], [[FR.export-inputs]]

On Event finish the number of likers of a Message MUST be computed and stored as the bare likes count before the liker
relations are removed, BECAUSE like totals must survive anonymization for the exported record.

##  RULE: Token Format and Validity {{token-format}}

-   CATEGORY:   Constraint
-   CONSTRAINS: [[FR.ventari-export]], [[FR.automatic-url]]

An Authorization Token MUST be formatted as six digits "NNN-NNN"; a normal login token MUST expire within 5 minutes while a
pre-generated token lasts until the event ends, expiring on first use only if the Event so configures, BECAUSE token
strength and lifetime balance security against convenient automated access.

##  RULE: No Permanent User Accounts {{no-accounts}}

-   CATEGORY: Policy

The system MUST NOT maintain permanent user accounts; a User exists only while granted a Role, present on an Event access
list, or joining via a matching access email pattern, BECAUSE privacy by design forbids persistent personal data beyond
operational need.

##  RULE: Manager Retained for Export {{manager-retained}}

-   CATEGORY:   Policy
-   CONSTRAINS: [[FR.export-inputs]]

A Manager Role MUST be retained after Event finish until the Event is deleted entirely, BECAUSE Managers must still export
the anonymized event data.
