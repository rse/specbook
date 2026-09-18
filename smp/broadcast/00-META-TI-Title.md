---
Created:  2026-06-19 00:15
Modified: 2026-06-22 18:56
---

#   META: Title (TI)

-   LOGO:            ![Broadcast](00-META-TI-Title-logo-{theme}.svg)
-   TITLE:           Broadcast
-   SUBTITLE:        Requirements, User Experience, and Architecture Specification
-   AUTHOR:          Dr. Ralf S. Engelschall
-   VERSION:         0.9.0
-   LANG:            en
-   CHARSET:         US-ASCII
-   THEME-STYLE:     Light
-   THEME-TONE:      #336699
-   PAPER-SIZE:      A4

**Broadcast** is a Web application which complements a broadcasted video
stream with several features to achieve an enterprise-grade "townhall" event
experience. It embeds the video stream with an external video player and
surrounds it with additional user interface controls for chat and stream
control. This allows the attendees to select between several stream variants,
mainly meant to carry different language translations of the audio content.

**Broadcast** offers a chat as a backchannel from the audience to the
presenters. It allows an attendee to send messages and see messages sent by
other attendees or a moderator. Sent messages may be reviewed by an artificial
or human operator before they are allowed to spread to the audience. Attendees
may like specific messages to signal their support. Additionally, a moderator is
able to select questions coming from the audience which are then forwarded to
the video production studio to be answered by the presenters with a small time
delay. It can also optionally embed an external application, for instance to
provide live-voting. Here the attendee's choice is transferred back to the video
production studio, aggregated there and presented to moderators and presenters
as the audience's opinion.

**Broadcast** optionally enforces a closed group policy by only allowing a
certain list of people (identified by their e-mail addresses) to join. It
seamlessly switches to an alternative video stream provider if requested by the
people overseeing the event production. This helps to overcome video quality or
scaling issues without interrupting the broadcasting of the program. It supports
an audience up to 10,000 attendees, specifically employing a fast join process
and swift delivery of chat messages.

**Broadcast** provides several statistics to assess the technical reception
of the event program by the audience (number of viewers, used client setup,
event-wide counts). None of this data can be linked to specific persons. It
complies with data protection rules by reliably deleting personal data after
the event. Chat content including likes may be saved for later review (e.g. for
assessing information needs, detecting unanswered questions) but also here no
link to specific persons is ever provided.

