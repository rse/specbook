---
Created:  2026-06-18 10:18
Modified: 2026-08-29 12:00
---

SPEC: Language Conventions (LC)
===============================

-   CONVENTION: Plain Organizer Voice {{voice}};
    CATEGORY: Voice;
    PRINCIPLES: [[PRINCIPLE:familiar-conventions]];
    EXAMPLE: "The event starts at 10:00.", not "Get ready, the show is about to begin!";
    The solution speaks with the plain, factual voice of the event
    organizer, never with a playful or marketing persona of its own,
    BECAUSE attendees join for the event, not for the tool, and the tool
    must not compete with the presenter for attention.

-   CONVENTION: Neutral Operational Tone {{tone}};
    CATEGORY: Tone;
    ACTORS: [[PERSONA:attendee]];
    PRINCIPLES: [[PRINCIPLE:correct-over-confirm]], [[PRINCIPLE:familiar-conventions]];
    EXAMPLE: "You are not authorized for this event.", not "Access forbidden!";
    User-facing system messages use a calm, neutral, and concise tone that
    informs without alarming, especially around access denial and connection
    changes, BECAUSE a one-time audience has no way to recover from a
    message that sounds like an accusation.

-   CONVENTION: Second-Person Address {{second-person}};
    CATEGORY: Grammar;
    EXAMPLE: "Your message was sent.", not "The user's message has been sent.";
    The solution addresses the user as "you" and never refers to itself as
    "I" or "we", BECAUSE direct address is the shortest wording and avoids
    the false impression of a person behind the interface.

-   CONVENTION: Product Name Spelling {{product-name}};
    CATEGORY: Capitalization;
    EXAMPLE: "Broadcast", not "broadcast" or "BROADCAST";
    The product is always written "Broadcast", BECAUSE a single spelling
    keeps the product recognizable and distinct from the generic verb.

-   CONVENTION: Anonymous Placeholder {{anonymous}};
    CATEGORY: Vocabulary;
    ACTORS: [[PERSONA:attendee]];
    PRINCIPLES: [[PRINCIPLE:privacy-identity]];
    TERMS: [[TERM:anonymization]], [[TERM:moderator]];
    EXAMPLE: "Anonymous", not "anonymous user" or "N/A";
    When identity is hidden, the displayed sender name is exactly
    "Anonymous", and moderator-authored messages default to the sender name
    "Moderator", BECAUSE a fixed placeholder reads as a deliberate choice
    while an ad-hoc wording reads as missing data.

-   CONVENTION: Token Display Format {{token-format}};
    CATEGORY: Formatting;
    TERMS: [[TERM:authtoken]];
    EXAMPLE: "123-456", not "123456";
    Authorization tokens are always presented in the grouped six-digit form
    "NNN-NNN" with a hyphen separator, in emails and on screen alike,
    BECAUSE the grouping makes a token easy to read aloud and to type from
    a second device.
