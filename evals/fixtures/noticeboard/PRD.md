# Scheduled public notices

The public noticeboard must show only published notices whose optional publication
window includes the current server time. A missing/null startsAt or endsAt is
unbounded. Start is inclusive; end is exclusive. Dates supplied by content systems
are ISO timestamps with a timezone. Invalid timestamps, or windows ending at/before
their start, must not expose that notice.

Apply this behavior to direct API requests as well as the existing web board. The
returned total must describe the same visible notices, preserving their existing
order. Keep unscheduled published notices working. A caller cannot override server
time through a request parameter. Preserve existing routes and response fields.

Use the supplied service and viewer projects. Do not add a scheduler, database,
authentication system or deployment platform. Verify boundaries and the actual web
experience when browser access is available. Deliver start/use/stop instructions,
real test results and explicit gaps. No production access is provided.
