---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

#   SPEC: Business Rules (BR)

##  RULE: Single Active Session per Event {{single-session}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:user]], [[TERM:sessiontoken]], [[TERM:event]]
-   CONSTRAINS: [[FR.parallel-access]]

A User MUST have at most one active Session Token per Event at any time; a new login MUST delete any existing Session Token
and close its connection, BECAUSE concurrent sessions would allow access sharing beyond the invited participant.

##  RULE: Access Requires List or Pattern Match {{access-grant}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:user]], [[TERM:event]], [[TERM:accesslist]]
-   CONSTRAINS: [[FR.authentication]]

A User MUST be granted access to an Event only according to the first matching case:

1.  The email of the User is on the access list of the Event: access is granted.
2.  The email of the User matches the access email pattern of the Event: access is granted.
3.  The Event allows anonymous access: access is granted.

Otherwise the User MUST NOT be granted access, BECAUSE access must be limited to the audience the organizer intends.

##  RULE: Single Active Channel {{single-channel}}

-   CATEGORY:   Constraint
-   SOURCE:     Domain
-   GOVERNS:    [[TERM:channel]], [[TERM:event]]
-   CONSTRAINS: [[FR.provider-switch]]

Exactly one Channel of an Event MUST be active at any time, BECAUSE attendees follow one logical content stream that
defines the current event feed.

##  RULE: Single Active Resource per Channel {{single-resource}}

-   CATEGORY:   Constraint
-   SOURCE:     Domain
-   GOVERNS:    [[TERM:resource]], [[TERM:channel]]
-   CONSTRAINS: [[FR.provider-switch]], [[FR.multi-provider]]

Exactly one Resource of a Channel MUST be active at any time, BECAUSE switching the active Resource is the mechanism by
which the live streaming provider is changed.

##  RULE: Moderation Determines Initial Visibility {{moderation-gate}}

-   CATEGORY:   Action
-   SOURCE:     Business
-   GOVERNS:    [[TERM:message]]
-   CONSTRAINS: [[FR.moderation]], [[FR.chat]], [[FR.questions]]

When moderation is enabled for a message type, an attendee Message MUST start in state pending and become visible only once
accepted; when disabled, it MUST start in state accepted, BECAUSE organizers must control what the audience sees.

##  RULE: Moderator Messages Auto-Accepted {{moderator-accept}}

-   CATEGORY:   Action
-   SOURCE:     Business
-   GOVERNS:    [[TERM:message]], [[TERM:moderator]]
-   CONSTRAINS: [[FR.moderator-messages]]

A Message authored by a Moderator MUST be created in state accepted and carry the sender name "Moderator" unless overridden,
BECAUSE moderator-authored content is trusted and needs no further approval.

##  RULE: Forwarded Messages Are Immutable {{forward-lock}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:message]], [[TERM:attendee]]
-   CONSTRAINS: [[FR.message-editing]], [[FR.forward-presenter]]

Once a Message reaches state forwarded, the attendee MUST NOT edit or delete it, BECAUSE the presenter relies on the
forwarded content remaining stable for live processing.

##  RULE: State Set Depends on Message Type {{type-states}}

-   CATEGORY:   Constraint
-   SOURCE:     Domain
-   GOVERNS:    [[TERM:message]], [[TERM:question]], [[TERM:chat]], [[TERM:support]]
-   CONSTRAINS: [[FR.moderation]]

A Message MUST use only the states its type permits:

1.  The Message is a Question: pending, accepted, rejected, forwarded, answered, and suspended.
2.  The Message is a Chat: pending, accepted, and rejected.
3.  The Message is a Support message: accepted.

No other combination of Message type and state is permitted, BECAUSE each message type has a different interaction
lifecycle.

##  RULE: Sentiment Auto-Decision Threshold {{sentiment-threshold}}

-   CATEGORY:   Derivation
-   SOURCE:     Business
-   GOVERNS:    [[TERM:sentiment]], [[TERM:message]]
-   CONSTRAINS: [[FR.server-sentiment]]

When server-side sentiment analysis is enabled, a sentiment score below -0.1 MUST be treated as improper and a score at or
above it as proper for auto-accept and auto-reject decisions, BECAUSE a defined threshold makes automated moderation
predictable.

##  RULE: Anonymization on Event Finish {{anonymize}}

-   CATEGORY:   Action
-   SOURCE:     Law
-   GOVERNS:    [[TERM:anonymization]], [[TERM:event]], [[TERM:message]], [[TERM:like]], [[TERM:authtoken]],
                [[TERM:sessiontoken]], [[TERM:accesslist]], [[TERM:user]], [[TERM:role]]
-   CONSTRAINS: [[FR.user-consent]], [[FR.gdpr-eu]]

When an Event finishes, its Messages MUST be reduced to a bare like count with Chat and Question sender names set to
"Anonymous" and liker and sender relations dropped, its Authorization and Session Tokens MUST be deleted, its access list
MUST be cleared with the referenced Users deleted, and its Moderator Roles MUST be deleted while its Manager Roles are
retained, BECAUSE personal data must not be retained beyond the event (GDPR Art. 5(1)(e), storage limitation).

##  RULE: Likes Conserved as Count on Finish {{like-count}}

-   CATEGORY:   Action
-   SOURCE:     Business
-   GOVERNS:    [[TERM:like]], [[TERM:message]], [[TERM:event]]
-   CONSTRAINS: [[FR.likes]], [[FR.export-inputs]]

When an Event finishes, the number of likers of each Message MUST be computed and stored as its bare likes count before the
liker relations are removed, BECAUSE like totals must survive anonymization for the exported record.

##  RULE: Token Format and Validity {{token-format}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:authtoken]], [[TERM:event]]
-   CONSTRAINS: [[FR.ventari-export]], [[FR.automatic-url]]

An Authorization Token MUST be formatted as six digits "NNN-NNN"; a normal login token MUST expire within 5 minutes while a
pre-generated token lasts until the event ends, expiring on first use only if the Event so configures, BECAUSE token
strength and lifetime balance security against convenient automated access.

##  RULE: No Permanent User Accounts {{no-accounts}}

-   CATEGORY:   Constraint
-   SOURCE:     Law
-   GOVERNS:    [[TERM:user]], [[TERM:role]], [[TERM:event]], [[TERM:accesslist]]

A User MUST NOT exist as a permanent account: a User exists only while granted a Role, present on an Event access list, or
joining via a matching access email pattern, BECAUSE privacy by design (GDPR Art. 25) forbids persistent personal data
beyond operational need.

##  RULE: Manager Retained for Export {{manager-retained}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:role]], [[TERM:manager]], [[TERM:event]]
-   CONSTRAINS: [[FR.export-inputs]]

A Manager Role MUST be retained after Event finish until the Event is deleted entirely, BECAUSE Managers must still export
the anonymized event data.
