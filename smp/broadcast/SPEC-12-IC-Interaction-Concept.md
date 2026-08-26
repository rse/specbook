---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:34
---

SPEC: Interaction Concept (IC)
==============================

-   PRINCIPLE: Frictionless Joining {{frictionless-join}};
    CATEGORY: Onboarding;
    The attendee is carried into the event with the least possible effort,
    with email and token pre-filled from the URL where available and
    automatic access when a valid token is embedded, BECAUSE large audiences
    must enter quickly without a support burden.

-   PRINCIPLE: Live Reactivity {{live-reactivity}};
    CATEGORY: Feedback;
    Every configuration change, provider switch, and moderation outcome is
    pushed to connected clients over WebSockets so the UI updates without a
    reload, BECAUSE a live event demands that all participants see a single,
    current state at all times.

-   PRINCIPLE: Moderation-Gated Visibility {{moderation-gated}};
    CATEGORY: Input;
    Attendee input is acknowledged immediately as submitted but becomes
    publicly visible only after moderation when enabled, with its state
    clearly indicated to the author, BECAUSE authors must trust their input
    arrived while organizers retain control.

-   PRINCIPLE: Kanban Moderation Flow {{kanban-flow}};
    CATEGORY: Workflow;
    Moderators work messages as cards moving left to right through rejected,
    approved, forwarded, and answered lanes, with filtering and manual
    ordering, BECAUSE a board makes high-volume triage and presenter
    hand-off visually manageable under time pressure.

-   PRINCIPLE: Privacy-Visible Identity {{privacy-identity}};
    CATEGORY: Privacy;
    Names are shown according to the event's anonymity setting while the
    email remains discoverable on hover, and AI-translated text is always
    marked distinct from the human original, BECAUSE participants must
    always know who said what and in which language.

-   PRINCIPLE: Resilient Stream Playback {{resilient-playback}};
    CATEGORY: Resilience;
    The video player follows server-driven resource switches transparently
    and reconnects on transient failures without asking the attendee to act,
    BECAUSE stream continuity must survive provider problems invisibly to
    the audience.

-   PRINCIPLE: Adaptive Appearance {{adaptive-appearance}};
    CATEGORY: Personalization;
    The attendee can switch event language and a light or dark theme at
    any time from the header, and the choice applies immediately across
    the whole interface, BECAUSE attendees join from varied languages and
    lighting and expect to tailor the view without leaving the event.

-   PRINCIPLE: Unread Awareness {{unread-awareness}};
    CATEGORY: Awareness;
    In the live message streams, incoming messages out of view are surfaced
    as floating "new messages" cues above and below the list that jump
    the attendee to them on demand, BECAUSE a fast-moving stream must let
    attendees catch up without manually hunting for what arrived.
