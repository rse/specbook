---
Created:  2026-08-23 00:15
Modified: 2026-08-30 00:17
---

META: Title
===========

-   TITLE:    Sample
-   SUBTITLE: Sample Specification

SPEC: Data Model (DM)
=====================

ENTITY: Unit
------------

An organizational unit of the enterprise, BECAUSE the organization is
structured into nested units which group the people working in them.

-   ATTRIBUTE: id; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the unit, BECAUSE every unit needs a stable
    handle independent of its name.

-   ATTRIBUTE: name (*); TYPE: `unique string`;
    Full name of the unit, BECAUSE the unit is addressed by a
    human-readable label.

-   ATTRIBUTE: abbreviation; TYPE: `string`;
    Short form of the unit name, BECAUSE compact renderings like org
    charts have no room for the full name.

-   ATTRIBUTE: mission; TYPE: `text?`;
    Free-form description of the purpose of the unit, BECAUSE the
    responsibility of a unit is not obvious from its name alone.

-   RELATION: parentUnit; TARGET: [[ENTITY:Unit]]; ARITY: `0..1`;
    The unit this unit is nested in, BECAUSE the units form a hierarchy
    whose top-most unit has no parent.

-   RELATION: members; TARGET: [[ENTITY:Person]]; ARITY: `0..n`;
    The people assigned to this unit, BECAUSE a unit is staffed by an
    arbitrary number of people.

-   RELATION: director; TARGET: [[ENTITY:Person]]; ARITY: `0..1`;
    The person heading this unit, BECAUSE a unit has at most one
    accountable lead.

ENTITY: Person
--------------

An individual person working in the organization, BECAUSE the
organization is staffed by people who are assigned to its units.

-   ATTRIBUTE: id; TYPE: `key uuid`; DEFAULT: `uuid()`;
    Unique identifier of the person, BECAUSE names are neither stable
    nor unique across the organization.

-   ATTRIBUTE: name (*); TYPE: `string`;
    Full name of the person, BECAUSE people are addressed by their
    human-readable name.

-   ATTRIBUTE: initials; TYPE: `string`;
    Short form of the person name, BECAUSE compact renderings like org
    charts have no room for the full name.

-   ATTRIBUTE: role; TYPE: `string`;
    Job role of the person, BECAUSE the responsibility of a person has
    to be visible beside their unit assignment.

-   ATTRIBUTE: joined; TYPE: `date`;
    Date the person joined the organization, BECAUSE seniority is
    derived from the length of membership.

-   RELATION: belongsTo; TARGET: [[ENTITY:Unit]]; ARITY: `0..1`;
    The unit this person is assigned to, BECAUSE a person works in at
    most one unit at a time.

-   RELATION: supervisor; TARGET: [[ENTITY:Person]]; ARITY: `0..1`;
    The person this person reports to, BECAUSE the reporting lines form
    a hierarchy whose top-most person has no supervisor.

