---
Created:  2026-11-01 14:00
Modified: 2026-11-01 14:00
---

#   PM: Project Charter (PC)

-   APPROACH: Hybrid
-   BUDGET:   240000 EUR
-   RESERVE:  22500 EUR

##  OBJECTIVE

-   Townhall Backchannel {{obj-backchannel}}; PRIORITY: High;
    SUCCESS: The first quarterly townhall event after the go-live runs its chat, its live votings,
    and its stream selection in Broadcast alone, without a fallback to the previous tool;
    The attendees of the townhall events of the customer ask questions, vote, and choose their
    stream through one application beside the video stream, BECAUSE the current mix of a video
    portal, a chat tool, and a survey tool loses the questions and the votes of the attendees.

-   Enterprise Scale {{obj-scale}}; PRIORITY: High;
    SUCCESS: The load test before the go-live sustains 5000 concurrent attendees with a chat
    message latency below two seconds;
    The solution carries the entire workforce of the customer in one event, BECAUSE a townhall
    event which excludes a part of the workforce misses its purpose.

-   Independent Operation {{obj-operation}}; PRIORITY: Medium;
    SUCCESS: The second townhall event after the go-live is set up, moderated, and monitored by
    the operators of the customer without any support of the contractor;
    The customer operates the events on its own infrastructure with its own operators, BECAUSE
    the events go on after the project while the contractor leaves.

-   Predictable Delivery {{obj-predictable}}; PRIORITY: Medium;
    SUCCESS: The go-live happens by week 16 of the project within the fixed price, with every
    scope change decided by the steering committee beforehand;
    The customer receives the agreed solution at the agreed date for the agreed price, BECAUSE
    the date of the next townhall event and its budget are fixed before the project starts.

##  CONSTRAINT

-   Next Townhall Date {{con-time}}; KIND: Time;
    The go-live precedes the next quarterly townhall event of the customer on 2026-12-14,
    sixteen weeks after the kick-off, which cannot move.

-   Fixed Price {{con-budget}}; KIND: Budget;
    The contract fixes the price of the delivery, so an additional effort is absorbed by the
    contractor unless the steering committee changes the scope.

-   Self-Hosted Infrastructure {{con-scope}}; KIND: Scope;
    The solution runs on infrastructure rented by the customer, not on a public cloud platform,
    as the corporate policy of the customer demands.

-   Corporate Browser Baseline {{con-quality}}; KIND: Quality;
    The web client runs in the managed browser of the corporate desktops of the customer in its
    current release, as the attendees cannot install software.

-   Part-Time Product Owner {{con-resource}}; KIND: Resource;
    The product owner of the customer is available for half of the working time only, as the
    corporate communications department keeps the running events going.

-   Corporate Database Standard {{con-technology}}; KIND: Technology;
    The solution stores its data in PostgreSQL, the one relational database the operations
    department of the customer runs and backs up.

-   EU Data Residency {{con-legal}}; KIND: Legal;
    The attendee data, the chat messages, and the votes are stored and processed inside the
    European Union only, as the works council agreement of the customer demands.

##  ASSUMPTION

-   Stream Provider Stays {{asm-provider}}; STATUS: Open;
    The customer keeps its current video stream provider until the go-live, on which the player
    integration and the failover drill of the hosting environments rest.

-   Product Owner Availability {{asm-owner}}; STATUS: Confirmed;
    The product owner of the customer is available for half of the working time during the
    inception phase, on which the three-week requirements analysis rests.

-   Hosting Lead Time {{asm-hosting}}; STATUS: Open;
    The hosting provider delivers the ordered private network and database subnet within two
    weeks, on which the provisioning task of the transition phase rests.

