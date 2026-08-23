---
Created:  2026-06-19 00:15
Modified: 2026-08-23 13:03
---

META: Title
===========

-   TITLE:           Sample
-   SUBTITLE:        Sample Specification

SPEC: Data Model (DM)
=====================

##  ENTITY: Unit

An organizational unit of the enterprise,
BECAUSE the organization is structured into nested units which group the people working in them.

-   ATTRIBUTE: id; TYPE: `unique uuid`; DEFAULT: `uuid()`;
    Unique identifier of the unit,
    BECAUSE every unit needs a stable handle independent of its name.

-   ATTRIBUTE: name; TYPE: `string`;
    Full name of the unit such as "Research and Development",
    BECAUSE the unit is addressed by a human-readable label.

-   ATTRIBUTE: abbreviation; TYPE: `string`;
    Short form of the unit name such as "R&D",
    BECAUSE compact renderings like org charts have no room for the full name.

-   RELATION: parentUnit; TYPE: [[ENTITY:Unit]]; ARITY: `0..1`;
    The unit this unit is nested in,
    BECAUSE the units form a hierarchy whose top-most unit has no parent.

-   RELATION: members; TYPE: [[ENTITY:Person]]; ARITY: `0..N`;
    The people assigned to this unit,
    BECAUSE a unit is staffed by an arbitrary number of people.

-   RELATION: director; TYPE: [[ENTITY:Person]]; ARITY: `0..1`;
    The person heading this unit,
    BECAUSE a unit has at most one accountable lead.

##  ENTITY: Person

An individual person working in the organization,
BECAUSE the organization is staffed by people who are assigned to its units.

-   ATTRIBUTE: id; TYPE: `unique uuid`; DEFAULT: `uuid()`;
    Unique identifier of the person,
    BECAUSE names are neither stable nor unique across the organization.

-   ATTRIBUTE: name; TYPE: `string`;
    Full name of the person such as "Jane Doe",
    BECAUSE people are addressed by their human-readable name.

-   ATTRIBUTE: initials; TYPE: `string`;
    Short form of the person name such as "JD",
    BECAUSE compact renderings like org charts have no room for the full name.

-   ATTRIBUTE: role; TYPE: `string`;
    Job role of the person such as "Software Engineer",
    BECAUSE the responsibility of a person has to be visible beside their unit assignment.

-   RELATION: belongsTo; TYPE: [[ENTITY:Unit]]; ARITY: `0..1`;
    The unit this person is assigned to,
    BECAUSE a person works in at most one unit at a time.

-   RELATION: supervisor; TYPE: [[ENTITY:Person]]; ARITY: `0..1`;
    The person this person reports to,
    BECAUSE the reporting lines form a hierarchy whose top-most person has no supervisor.

