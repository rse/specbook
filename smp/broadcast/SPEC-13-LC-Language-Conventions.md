---
Created:  2026-06-18 10:18
Modified: 2026-06-18 10:18
---

#   SPEC: Language Conventions (LC)

##  CONVENTION: Role Names in Quotes <a id="SPEC-LC-role-quotes"></a>

-   CATEGORY: Terminology

Event role names are written capitalized and, in prose, treated as defined terms ("Manager", "Moderator", "Presenter",
"Attendee") rather than generic words
(e.g. "the Moderator forwards the question", not "the moderator forwards the question").

##  CONVENTION: Product Name Spelling <a id="SPEC-LC-product-name"></a>

-   CATEGORY: Capitalization

The product is always written "msg.Broadcast" with the lower-case "msg" prefix and capital "B"
(e.g. "msg.Broadcast streams the event", not "MSG Broadcast" or "msg broadcast").

##  CONVENTION: Bilingual Content <a id="SPEC-LC-bilingual"></a>

-   CATEGORY: Terminology

Attendee-facing event content is authored in German and English, the two supported event languages, and AI-translated text is
labeled as such distinctly from the human original
(e.g. show an "original language" marker on translated messages).

##  CONVENTION: Anonymous Placeholder <a id="SPEC-LC-anonymous"></a>

-   CATEGORY: Naming

When identity is hidden, the displayed sender name is exactly "Anonymous", and moderator-authored messages default to the
sender name "Moderator"
(e.g. an anonymized chat shows "Anonymous", not "anonymous user" or "N/A").

##  CONVENTION: Entity Naming in Specs <a id="SPEC-LC-entity-naming"></a>

-   CATEGORY: Naming

Data-model entities are referred to by their Pascal-cased names and attributes by their camel-cased identifiers, set in code
font in specifications
(e.g. `Event.accessList`, `Message.senderName`).

##  CONVENTION: Token Display Format <a id="SPEC-LC-token-format"></a>

-   CATEGORY: Formatting

Authorization tokens are always presented in the grouped six-digit form "NNN-NNN" with a hyphen separator
(e.g. "123-456", not "123456").

##  CONVENTION: Neutral Operational Tone <a id="SPEC-LC-tone"></a>

-   CATEGORY: Tone

User-facing system messages use a calm, neutral, and concise tone that informs without alarming, especially around access
denial and connection changes
(e.g. "You are not authorized for this event." rather than "Access forbidden!").
