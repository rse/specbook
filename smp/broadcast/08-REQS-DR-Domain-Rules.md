---
Created:  2026-06-18 10:18
Modified: 2026-08-29 14:05
---

#   REQS: Domain Rules (DR)

##  RULE: Single Active Session per Event {{single-session}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:user]], [[TERM:sessiontoken]], [[TERM:event]]
-   CONSTRAINS: [[REQUIREMENT:parallel-access]]
-   PREMISES:   [[PREMISE:url-leakage]]

A [[TERM:User]] MUST have at most one active [[TERM:Session Token]] per [[TERM:Event]] at any time; a new login MUST delete
any existing [[TERM:Session Token]] and close its connection, BECAUSE concurrent sessions would allow access sharing beyond
the invited [[TERM:Attendee]].

##  RULE: Access Requires List or Pattern Match {{access-grant}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:user]], [[TERM:event]], [[TERM:accesslist]]
-   CONSTRAINS: [[REQUIREMENT:authentication]]
-   PREMISES:   [[PREMISE:url-leakage]]

A [[TERM:User]] MUST be granted access to an [[TERM:Event]] only according to the first matching case:

1.  The email of the [[TERM:User]] is on the [[TERM:Access List]] of the [[TERM:Event]]: access is granted.
2.  The email of the [[TERM:User]] matches the access email pattern of the [[TERM:Event]]: access is granted.
3.  The [[TERM:Event]] allows anonymous access: access is granted.

Otherwise the [[TERM:User]] MUST NOT be granted access, BECAUSE access must be limited to the audience the organizer
intends.

##  RULE: Single Active Channel {{single-channel}}

-   CATEGORY:   Constraint
-   SOURCE:     Domain
-   GOVERNS:    [[TERM:channel]], [[TERM:event]]
-   CONSTRAINS: [[REQUIREMENT:provider-switch]]

Exactly one [[TERM:Channel]] of an [[TERM:Event]] MUST be active at any time, BECAUSE [[TERM:Attendee]]s follow one logical
content stream that defines the current [[TERM:Event]] feed.

##  RULE: Single Active Resource per Channel {{single-resource}}

-   CATEGORY:   Constraint
-   SOURCE:     Domain
-   GOVERNS:    [[TERM:resource]], [[TERM:channel]], [[TERM:provider]]
-   CONSTRAINS: [[REQUIREMENT:provider-switch]], [[REQUIREMENT:multi-provider]]

Exactly one [[TERM:Resource]] of a [[TERM:Channel]] MUST be active at any time, BECAUSE switching the active
[[TERM:Resource]] is the mechanism by which the live [[TERM:Streaming Provider]] is changed.

##  RULE: Moderation Determines Initial Visibility {{moderation-gate}}

-   CATEGORY:   Action
-   SOURCE:     Business
-   GOVERNS:    [[TERM:message]], [[TERM:chat]], [[TERM:question]], [[TERM:attendee]]
-   CONSTRAINS: [[REQUIREMENT:moderation]], [[REQUIREMENT:chat]], [[REQUIREMENT:questions]]
-   PREMISES:   [[PREMISE:interaction-abuse]]

When moderation is enabled for [[TERM:Chat]]s or [[TERM:Question]]s, a [[TERM:Message]] of that type sent by an
[[TERM:Attendee]] MUST start in state pending and become visible only once accepted; when disabled, it MUST start in state
accepted, BECAUSE organizers must control what the audience sees.

##  RULE: Moderator Messages Auto-Accepted {{moderator-accept}}

-   CATEGORY:   Action
-   SOURCE:     Business
-   GOVERNS:    [[TERM:message]], [[TERM:moderator]]
-   CONSTRAINS: [[REQUIREMENT:moderator-messages]]

A [[TERM:Message]] authored by a [[TERM:Moderator]] MUST be created in state accepted and carry the sender name "Moderator"
unless overridden, BECAUSE [[TERM:Moderator]]-authored content is trusted and needs no further approval.

##  RULE: Forwarded Messages Are Immutable {{forward-lock}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:message]], [[TERM:attendee]], [[TERM:presenter]]
-   CONSTRAINS: [[REQUIREMENT:message-editing]], [[REQUIREMENT:forward-presenter]]

Once a [[TERM:Message]] reaches state forwarded, the [[TERM:Attendee]] MUST NOT edit or delete it, BECAUSE the
[[TERM:Presenter]] relies on the forwarded content remaining stable for live processing.

##  RULE: State Set Depends on Message Type {{type-states}}

-   CATEGORY:   Constraint
-   SOURCE:     Domain
-   GOVERNS:    [[TERM:message]], [[TERM:question]], [[TERM:chat]], [[TERM:support]]
-   CONSTRAINS: [[REQUIREMENT:moderation]]

A [[TERM:Message]] MUST use only the states its type permits:

1.  The [[TERM:Message]] is a [[TERM:Question]]: pending, accepted, rejected, forwarded, answered, and suspended.
2.  The [[TERM:Message]] is a [[TERM:Chat]]: pending, accepted, and rejected.
3.  The [[TERM:Message]] is a [[TERM:Support]] message: accepted.

No other combination of [[TERM:Message]] type and state is permitted, BECAUSE each [[TERM:Message]] type has a different
interaction lifecycle.

##  RULE: Sentiment Auto-Decision Threshold {{sentiment-threshold}}

-   CATEGORY:   Derivation
-   SOURCE:     Business
-   GOVERNS:    [[TERM:sentiment]], [[TERM:message]]
-   CONSTRAINS: [[REQUIREMENT:server-sentiment]]

When server-side [[TERM:Sentiment Analysis]] is enabled, a sentiment score of a [[TERM:Message]] below -0.1 MUST be treated
as improper and a score at or above it as proper for auto-accept and auto-reject decisions, BECAUSE a defined threshold
makes automated moderation predictable.

##  RULE: Anonymization on Event Finish {{anonymize}}

-   CATEGORY:   Action
-   SOURCE:     Law
-   GOVERNS:    [[TERM:anonymization]], [[TERM:event]], [[TERM:message]], [[TERM:chat]], [[TERM:question]],
                [[TERM:like]], [[TERM:authtoken]], [[TERM:sessiontoken]], [[TERM:accesslist]], [[TERM:user]],
                [[TERM:role]], [[TERM:moderator]], [[TERM:manager]]
-   CONSTRAINS: [[REQUIREMENT:user-consent]], [[REQUIREMENT:gdpr-eu]]
-   PREMISES:   [[PREMISE:message-personal-data]]

When an [[TERM:Event]] finishes, its [[TERM:Anonymization]] MUST reduce its [[TERM:Message]]s to a bare [[TERM:Like]] count
with [[TERM:Chat]] and [[TERM:Question]] sender names set to "Anonymous" and liker and sender relations dropped, delete its
[[TERM:Authorization Token]]s and [[TERM:Session Token]]s, clear its [[TERM:Access List]] and delete the referenced
[[TERM:User]]s, and delete its [[TERM:Moderator]] [[TERM:Role]]s while retaining its [[TERM:Manager]] [[TERM:Role]]s,
BECAUSE personal data must not be retained beyond the [[TERM:Event]] (GDPR Art. 5(1)(e), storage limitation).

##  RULE: Likes Conserved as Count on Finish {{like-count}}

-   CATEGORY:   Action
-   SOURCE:     Business
-   GOVERNS:    [[TERM:like]], [[TERM:message]], [[TERM:event]], [[TERM:anonymization]]
-   CONSTRAINS: [[REQUIREMENT:likes]], [[REQUIREMENT:export-inputs]]

When an [[TERM:Event]] finishes, the number of [[TERM:Like]]s of each [[TERM:Message]] MUST be computed and stored as its
bare [[TERM:Like]] count before the liker relations are removed, BECAUSE [[TERM:Like]] totals must survive the
[[TERM:Anonymization]] for the exported record.

##  RULE: Token Format and Validity {{token-format}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:authtoken]], [[TERM:event]], [[TERM:registration-system]]
-   CONSTRAINS: [[REQUIREMENT:registration-export]], [[REQUIREMENT:automatic-url]]
-   PREMISES:   [[PREMISE:email-at-hand]], [[PREMISE:email-delivery]]

An [[TERM:Authorization Token]] MUST be formatted as six digits "NNN-NNN"; a normal login token MUST expire within 5 minutes
while a token pre-generated for the [[TERM:Event Registration System]] lasts until the [[TERM:Event]] ends, expiring on
first use only if the [[TERM:Event]] so configures, BECAUSE token strength and lifetime balance security against convenient
automated access.

##  RULE: No Permanent User Accounts {{no-accounts}}

-   CATEGORY:   Constraint
-   SOURCE:     Law
-   GOVERNS:    [[TERM:user]], [[TERM:role]], [[TERM:event]], [[TERM:accesslist]]

A [[TERM:User]] MUST NOT exist as a permanent account: a [[TERM:User]] exists only while granted a [[TERM:Role]], present on
the [[TERM:Access List]] of an [[TERM:Event]], or joining via a matching access email pattern, BECAUSE privacy by design
(GDPR Art. 25) forbids persistent personal data beyond operational need.

##  RULE: Manager Retained for Export {{manager-retained}}

-   CATEGORY:   Constraint
-   SOURCE:     Business
-   GOVERNS:    [[TERM:role]], [[TERM:manager]], [[TERM:event]], [[TERM:anonymization]]
-   CONSTRAINS: [[REQUIREMENT:export-inputs]]

A [[TERM:Manager]] [[TERM:Role]] MUST be retained after an [[TERM:Event]] finishes until the [[TERM:Event]] is deleted
entirely, BECAUSE [[TERM:Manager]]s must still export the [[TERM:Event]] data left by the [[TERM:Anonymization]].
