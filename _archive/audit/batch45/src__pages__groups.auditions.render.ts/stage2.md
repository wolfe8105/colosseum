# Stage 2 Outputs — groups.auditions.render.ts

## Agent 01

### renderAuditionsList

This function receives an array of `PendingAudition` objects and a `myRole` string (leader, member, or null), and returns an HTML string. If the auditions array is empty or nullish, it immediately returns a hardcoded empty-state div. Otherwise, it maps over each audition and constructs an HTML row for it.

For each audition, the function reads the candidate's display name and username, escapes them via `escapeHTML()`, and falls back to 'Unknown'. It looks up the audition's rule in the `RULE_LABELS` object, escaping the result or falling back to the uppercase raw rule if not found. It builds a topic section only if `a.topic` exists, and maps the audition's status to a display label (pending→PENDING, claimed→DEBATE SCHEDULED, in_progress→IN PROGRESS, or uppercase unknown statuses).

The function then determines what action buttons to render based on two conditions: whether `myRole` is not null (treating both leader and member as "isLeaderOrMember"). If the viewer is a leader or member, it constructs a deny button. The action logic branches: if the rule is 'allowed_by_leader' and myRole is 'leader', it shows approve + deny buttons; if the status is 'pending' and the rule is not 'allowed_by_leader', it shows an accept-audition button (plus deny if leader); otherwise it shows deny if leader or nothing if member. If the viewer is not a leader or member (i.e., the candidate viewing their own audition), a withdraw button appears. All IDs and strings in button attributes are escaped via `escapeHTML()`. Each audition row HTML is constructed as a template string containing the header, rule, optional topic, and optional actions. The function returns all rows joined with no separator as a single concatenated string. The function is not async.

## Agent 02

### renderAuditionsList

The function accepts an array of `PendingAudition` objects and a `myRole` string (which may be null, "leader", or "member"), then returns an HTML string. If the auditions array is falsy or empty, it immediately returns a single-line empty state div. Otherwise, it iterates through each audition object, transforming each into an HTML row. For each audition, it reads `candidate_display_name`, `candidate_username`, `topic`, `rule`, `status`, and `id` fields from the audition object, and reads the global `RULE_LABELS` object to look up rule descriptions. It calls `escapeHTML` on the candidate name, rule label, topic, and audition ID. It maps the audition's `status` field through a hardcoded lookup table (`statusMap`), falling back to `.toUpperCase()` if not found. The function then conditionally builds an HTML actions string based on both the `myRole` value and specific audition properties: when `myRole` is not null (leader or member), it creates deny, approve, or accept buttons depending on whether the rule is "allowed_by_leader" and whether the role is "leader"; when `myRole` is null (the candidate viewing their own audition), it generates a withdraw button. The candidate name display also branches on `isLeaderOrMember`: leaders and members see the candidate's name, while non-leaders see "Your audition". Each audition row is built as a template string containing the name, status, rule, topic (conditionally), and actions (conditionally), then all rows are joined into a single string with no separator. The function is synchronous and does not perform any I/O or state mutations beyond generating the return value.

## Agent 03

### renderAuditionsList

When this function is called, it reads the `auditions` array parameter and the `myRole` string parameter. If the auditions array is null or empty, the function returns an HTML string containing a single empty-state div with an icon and "No pending auditions" text.

For non-empty auditions arrays, the function iterates through each audition object. For each audition, it extracts the candidate's display name (falling back to username, then "Unknown") and escapes it; looks up the rule label from the RULE_LABELS object, escaping both the label and the original rule string; conditionally renders a topic div if the audition has a topic value; maps the status field through a statusMap object to convert pending/claimed/in_progress to display labels. The function determines whether the current viewer is a leader or member by checking if myRole is not null.

The action buttons rendered depend on myRole and audition properties. If the viewer is a leader or member: for allowed_by_leader rules and myRole=leader, both APPROVE and DENY buttons render; for pending status with non-allowed_by_leader rules, an ACCEPT AUDITION button renders with a DENY button if myRole=leader; otherwise only a DENY button renders if myRole=leader; if no conditions match, actions remain empty. If myRole is null (the candidate viewing their own row), a WITHDRAW button renders. All button IDs are escaped. The function concatenates each audition row HTML string with all internal values escaped via escapeHTML(), then joins all rows together into a single string and returns it. The function is synchronous.

## Agent 04

### renderAuditionsList

The function accepts an array of `PendingAudition` objects and a `myRole` string (which may be null), returning an HTML string. If the auditions array is falsy or empty, the function immediately returns a static empty state div with an icon and message. For non-empty arrays, the function determines whether the caller has a role (`isLeaderOrMember` is true when `myRole` is not null), then maps each audition object to an HTML row string.

For each audition, the function extracts and escapes the candidate name (preferring `candidate_display_name` over `candidate_username`, falling back to 'Unknown'), looks up the rule label in the `RULE_LABELS` map and escapes it (or uses the raw rule value uppercased if not found), conditionally renders a topic div if present, and maps the status field through a `statusMap` object (converting 'pending' to 'PENDING', 'claimed' to 'DEBATE SCHEDULED', 'in_progress' to 'IN PROGRESS', otherwise uppercasing the raw status). The function then constructs an actions div by branching on three conditions: (1) if `isLeaderOrMember` is true and the rule is 'allowed_by_leader' and myRole is 'leader', it renders both APPROVE and DENY buttons; (2) if `isLeaderOrMember` is true and the status is 'pending' and the rule is not 'allowed_by_leader', it renders an ACCEPT AUDITION button and a DENY button only if myRole is 'leader'; (3) if `isLeaderOrMember` is true in any other case, it renders only a DENY button if myRole is 'leader', otherwise an empty string; (4) if `isLeaderOrMember` is false (the candidate viewing their own row), it renders a WITHDRAW button. All button data attributes are escaped. The candidate name display also branches: if `isLeaderOrMember` is true, it displays the escaped name, otherwise it displays the literal string 'Your audition'. All audition row strings are joined without a separator and returned; the function is synchronous.

## Agent 05

### renderAuditionsList

The function reads the `auditions` array parameter and `myRole` parameter (a string or null). It reads the module-level `RULE_LABELS` object to map rule types to display labels. It returns a string of HTML.

When called with an empty or falsy auditions array, the function immediately returns an empty-state HTML div with a clipboard emoji and "No pending auditions" text.

Otherwise, the function maps over each audition object in the auditions array and constructs an HTML row for each. For each audition, it performs these operations in sequence: (1) reads the candidate's display name or username (or defaults to "Unknown") and applies HTML escaping; (2) looks up the audition's rule property in the RULE_LABELS map and applies HTML escaping (falling back to the uppercased raw rule value if not found); (3) conditionally includes a topic div only if the audition has a topic property; (4) maps the audition's status value through a hardcoded statusMap object or uppercases the raw status if not in the map; (5) determines the action buttons to display based on branching logic that depends on isLeaderOrMember (derived from myRole !== null), the rule type, the myRole value ("leader" vs other), and the current status.

The action button branching has four exclusive paths: if myRole is a leader and rule is "allowed_by_leader", it renders APPROVE and DENY buttons; else if status is "pending" and rule is not "allowed_by_leader", it renders ACCEPT AUDITION and conditionally a DENY button if the user is a leader; else it renders only a DENY button if the user is a leader, or no buttons if not a leader; else (when isLeaderOrMember is false), it renders a WITHDRAW button. All button IDs and action values are HTML-escaped. The function then constructs a complete HTML row element containing the candidate name (or "Your audition" if not a leader/member), status label, topic if present, and action buttons if present. After mapping all auditions, the function joins the HTML strings with no separator and returns the concatenated result. The function is synchronous.
