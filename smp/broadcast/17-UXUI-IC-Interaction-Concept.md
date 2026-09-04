---
Created:  2026-06-18 10:18
Modified: 2026-08-29 11:45
---

UXUI: Interaction Concept (IC)
==============================

-   PRINCIPLE: Moderation-Gated Visibility {{moderation-gated}};
    CATEGORY: Expectation-Conformity;
    ACTORS: [[PERSONA:attendee]], [[PERSONA:moderator-chat]], [[PERSONA:moderator-qa]];
    MOTIVATED-BY: [[STEP:participate]];
    TRADE-OFF: The liveliness of an unmoderated stream in which every input is public the moment it is sent;
    Attendee input is acknowledged immediately as submitted but becomes
    publicly visible only after moderation when enabled, with its state
    clearly indicated to the author, BECAUSE authors must trust their input
    arrived while organizers retain control.

-   PRINCIPLE: Privacy-Visible Identity {{privacy-identity}};
    CATEGORY: Self-Descriptiveness;
    MOTIVATED-BY: [[STEP:arrival]];
    TRADE-OFF: Full anonymity of all participants, which would spare the anonymity setting and the hover reveal;
    Names are shown according to the event's anonymity setting while the
    email remains discoverable on hover, and AI-translated text is always
    marked distinct from the human original, BECAUSE participants must
    always know who said what and in which language.

-   PRINCIPLE: Frictionless Joining {{frictionless-join}};
    CATEGORY: Task-Suitability;
    ACTORS: [[PERSONA:attendee]];
    MOTIVATED-BY: [[STEP:arrival]], [[STEP:authenticate]];
    TRADE-OFF: An explicit registration with a permanent account, which would give organizers richer attendee profiles;
    The attendee is carried into the event with the least possible effort,
    with email and token pre-filled from the URL where available and
    automatic access when a valid token is embedded, BECAUSE large audiences
    must enter quickly without a support burden.

-   PRINCIPLE: Live Reactivity {{live-reactivity}};
    CATEGORY: Self-Descriptiveness;
    MOTIVATED-BY: [[STEP:participate]], [[STEP:support]];
    TRADE-OFF: Lower server load and simpler clients through polling or a manual reload;
    Every configuration change, provider switch, and moderation outcome is
    pushed to connected clients over WebSockets so the UI updates without a
    reload, BECAUSE a live event demands that all participants see a single,
    current state at all times.

-   PRINCIPLE: Validate Before Going Live {{validate-before-live}};
    CATEGORY: Error-Robustness;
    ACTORS: [[PERSONA:manager]];
    MOTIVATED-BY: [[STEP:configure]];
    TRADE-OFF: The freedom to save any partial or inconsistent configuration unchecked;
    Imported attendee lists and streaming settings are validated at entry
    and problems are reported in place before the event starts, BECAUSE
    a configuration mistake surfacing during the broadcast hits the whole
    audience at once.

-   PRINCIPLE: Never Leave the Stream {{never-leave-stream}};
    CATEGORY: Controllability;
    ACTORS: [[PERSONA:attendee]];
    MOTIVATED-BY: [[STEP:participate]];
    TRADE-OFF: A dedicated settings page with room for more options than the header can hold;
    Every adjustment available to the attendee, like language, theme, or
    the interaction tab, is made in place from the event screen, applies
    immediately, and can be reverted at any time, BECAUSE navigating away
    from a live stream means missing part of the event.

-   PRINCIPLE: Correct over Confirm {{correct-over-confirm}};
    CATEGORY: Error-Robustness;
    ACTORS: [[PERSONA:attendee]];
    MOTIVATED-BY: [[STEP:participate]];
    TRADE-OFF: A confirmation step before every submission, which would reduce mistaken posts at the cost of interrupting the flow;
    Input is sent without a confirmation step and corrected afterwards
    instead, as the attendee can edit and delete their own messages while a
    deleted message leaves a placeholder, BECAUSE a fast conversation
    tolerates a repaired mistake better than a delay before every message.

-   PRINCIPLE: Familiar Conventions {{familiar-conventions}};
    CATEGORY: Learnability;
    ACTORS: [[PERSONA:attendee]];
    TRADE-OFF: Novel interaction forms tailored to the event format, which would be more expressive but need explaining;
    Chat, questions, and likes look and behave like the consumer messengers
    the attendee already knows, so that the login message is the only
    instruction an attendee ever reads, BECAUSE a one-time audience has
    neither the time nor the motivation to learn a new tool.

-   PRINCIPLE: One-Tap Contribution {{one-tap-contribution}};
    CATEGORY: Engagement;
    ACTORS: [[PERSONA:attendee]];
    MOTIVATED-BY: [[STEP:participate]];
    TRADE-OFF: Richer contributions like threads, attachments, or formatting, which would raise the bar for taking part;
    A like is a single tap and a message is a single field plus send, with
    the emoji picker as the only enrichment, BECAUSE the more attendees
    contribute during the event, the livelier it feels for everyone
    watching.
