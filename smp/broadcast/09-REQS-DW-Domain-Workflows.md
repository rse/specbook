---
Created:  2026-08-30 10:00
Modified: 2026-09-05 00:30
---

REQS: Domain Workflows (DW)
===========================

WORKFLOW: Run Broadcast Event {{run-broadcast-event}}
-----------------------------

-   ACTORS:   [[ROLE:manager]], [[ROLE:presenter]], [[ROLE:moderator]], [[ROLE:attendee]]
-   TRIGGER:  The manager receives the attendee list of an upcoming event, exported by the Event Registration System.
-   OUTCOME:  The event took place, its personal data is anonymized, and its interaction results are exported.
-   JOURNEYS: [[JOURNEY:attend]], [[JOURNEY:operate]], [[JOURNEY:moderate]]
-   TERMS:    [[TERM:anonymization]]
-   RULES:    [[RULE:no-accounts]]

The manager prepares and populates the event, the operators rehearse it, the audience attends it live while the
moderators and the presenter handle the interaction, and the manager finishes and archives it afterwards, BECAUSE a
broadcast event is a collaboration of several roles across days, of which each sitting with the solution covers only a
part.

### ACTIVITY

-   Plan Event {{plan-event}}; ACTOR: [[ROLE:manager]]; INITIAL: true;
    The manager configures the event and its channel and imports the
    attendee list of the Event Registration System, which yields the
    individual access URLs.

-   Invite Attendees {{invite-attendees}}; ACTOR: [[ROLE:manager]];
    The manager hands the individual access URLs back to the Event
    Registration System, which sends the invitation emails (outside the
    solution).

-   Rehearse Event {{rehearse-event}}; ACTOR: [[ROLE:presenter]], [[ROLE:moderator]];
    The presenter and the moderators walk through the unpublished event
    together, checking the stream, the question flow, and the chat.

-   Start Event {{go-live}}; ACTOR: [[ROLE:manager]];
    The manager publishes and starts the event when the stream goes on
    air and keeps the streaming resource healthy.

-   Attend Event {{attend-event}}; ACTOR: [[ROLE:attendee]];
    The attendees join via their individual URLs, watch the stream, and
    raise questions and chat messages.

-   Moderate Interaction {{moderate-interaction}}; ACTOR: [[ROLE:moderator]];
    The moderators accept, reject, answer, and forward the incoming
    messages throughout the live event.

-   Present and Answer {{present-talk}}; ACTOR: [[ROLE:presenter]];
    The presenter delivers the talk and answers the forwarded questions
    on air.

-   Finish Event {{finish-event}}; ACTOR: [[ROLE:manager]];
    The manager finishes the event once the stream is off air, which
    closes the access and anonymizes the personal data.

-   Archive Results {{archive-results}}; ACTOR: [[ROLE:manager]]; FINAL: true;
    The manager exports the anonymized messages and statistics and hands
    them over to the organizer.

### HANDOFF

-   import; FROM: [[ACTIVITY:plan-event]]; TO: [[ACTIVITY:invite-attendees]];
    The generated individual access URLs are returned as a sheet the
    manager passes on to the Event Registration System.

-   notify; FROM: [[ACTIVITY:invite-attendees]]; TO: [[ACTIVITY:rehearse-event]];
    The presenter and the moderators receive their access URLs and the
    rehearsal date by email.

-   rework; FROM: [[ACTIVITY:rehearse-event]]; TO: [[ACTIVITY:plan-event]];
    CONDITION: The rehearsal revealed a defect in the event configuration.;
    The presenter reports the defect to the manager, who corrects the
    configuration before a further rehearsal.

-   approve; FROM: [[ACTIVITY:rehearse-event]]; TO: [[ACTIVITY:go-live]];
    CONDITION: The rehearsal passed.;
    The presenter confirms the readiness of the event to the manager.

-   admit; FROM: [[ACTIVITY:go-live]]; TO: [[ACTIVITY:attend-event]];
    The started event admits the invited attendees through their
    individual URLs.

-   staff; FROM: [[ACTIVITY:go-live]]; TO: [[ACTIVITY:moderate-interaction]];
    The started event opens the moderation views to the moderators.

-   cue; FROM: [[ACTIVITY:go-live]]; TO: [[ACTIVITY:present-talk]];
    The manager cues the presenter once the stream is on air.

-   forward; FROM: [[ACTIVITY:moderate-interaction]]; TO: [[ACTIVITY:present-talk]];
    RULES: [[RULE:forward-lock]];
    The moderator forwards an accepted question, which appears in the
    presenter's view.

-   disperse; FROM: [[ACTIVITY:attend-event]]; TO: [[ACTIVITY:finish-event]];
    The audience leaves when the stream ends, which the manager sees in
    the attendance statistics.

-   wrap; FROM: [[ACTIVITY:moderate-interaction]]; TO: [[ACTIVITY:finish-event]];
    The moderators report the interaction as settled to the manager.

-   sign-off; FROM: [[ACTIVITY:present-talk]]; TO: [[ACTIVITY:finish-event]];
    The presenter signs off and the stream goes off air.

-   hand-over; FROM: [[ACTIVITY:finish-event]]; TO: [[ACTIVITY:archive-results]];
    RULES: [[RULE:anonymize]], [[RULE:manager-retained]];
    The finished event keeps the anonymized data and the manager role for
    the export.
