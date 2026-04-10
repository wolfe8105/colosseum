---
feature_id: F-15
feature_name: "Kick/ban/promote"
status: shipped
shipped_session: 181
last_verified_session: 258

files_touched:
  - session-223-group-rpc-fixes.sql
  - src/pages/groups.ts
  - supabase-deployed-functions-export.sql

rpcs:
  - ban_group_member
  - kick_group_member
  - promote_group_member
  - unban_group_member

tables:
  - group_bans
  - group_members
  - groups

external_services: []

depends_on:
  - F-14   # Role hierarchy — rank comparison gates every management action

depended_on_by: []

landmines:
  - LM-141  # RLS policy on group_members self-references group_members — roster refresh after action goes through SECURITY DEFINER

punch_list_row: 98

generated_by: claude-code
---

# F-15 — Kick/Ban/Promote — Interaction Map

## Summary

Kick/Ban/Promote adds the Member Actions Modal to the groups page, allowing higher-ranked members to manage lower-ranked ones. The modal is injected once at init by `_injectMemberActionsModal()` at `groups.ts:470` and reused for every MANAGE button click. It contains three sections: a role-change dropdown with SET ROLE button (promote/demote), a KICK MEMBER button, and a BAN MEMBER button with an optional reason textarea. All three actions call separate RPCs (`promote_group_member`, `kick_group_member`, `ban_group_member`) that enforce the F-14 rank hierarchy server-side via `group_role_rank()`. Leadership transfer is a special case of promote: when the target role is "leader", the SQL atomically demotes the caller to member, promotes the target, and updates `groups.owner_id`. Feature shipped alongside F-14 in Session 181. The unban path exists server-side (`unban_group_member` at `supabase-deployed-functions-export.sql:10399`) but has no client UI.

## User actions in this feature

1. **Open the MANAGE modal** — tap MANAGE on a member card, modal populates with target info
2. **Change a member's role** — select new role from dropdown, tap SET ROLE
3. **Kick a member** — tap KICK MEMBER, confirm via browser dialog
4. **Ban a member** — optionally enter reason, tap BAN MEMBER

---

## 1. Open the MANAGE modal

The MANAGE button is rendered by F-14's `loadGroupMembers()` at `groups.ts:416` for each member the caller outranks. The click handler at `groups.ts:446-456` reads data attributes from the button and calls `openMemberActionsModal()` at `groups.ts:610`. This function populates the modal with the target's name and current role, builds the promote dropdown based on `assignableRoles(callerRole)` at `groups.ts:622`, and shows or hides the promote section based on whether the caller has assignable roles.

```mermaid
sequenceDiagram
    actor User
    participant ManageBtn as MANAGE button<br/>groups.ts:416
    participant Listener as click listener<br/>groups.ts:446
    participant ModalFn as openMemberActionsModal()<br/>groups.ts:610
    participant PromoteSel as role dropdown<br/>groups.ts:506
    participant Modal as member-actions-modal<br/>groups.ts:470

    Note over ManageBtn: VISIBLE only when caller<br/>strictly outranks target<br/>(gated by F-14 canAct check)
    User->>ManageBtn: tap MANAGE
    ManageBtn->>Listener: click event (stopPropagation)
    Listener->>ModalFn: openMemberActionsModal(member)
    ModalFn->>ModalFn: set _mamMember = target<br/>populate name and role label
    ModalFn->>ModalFn: roles = assignableRoles(callerRole)

    alt caller has assignable roles AND is not elder
        ModalFn->>PromoteSel: populate dropdown<br/>(filter out targets current role)
        Note over PromoteSel: Options depend on caller role:<br/>leader sees all 4 roles<br/>co_leader sees elder and member
        ModalFn->>Modal: show with promote section visible
    else caller is elder or has no assignable roles
        ModalFn->>Modal: show with promote section hidden<br/>(kick and ban only)
    end
    Modal->>User: full-screen overlay with<br/>management actions
```

**Notes:**
- The modal is injected exactly once at app init by `_injectMemberActionsModal()` at `groups.ts:470`, called from the `ready.then()` block at `groups.ts:101`. It is reused for every MANAGE click, not re-created.
- `_mamMember` at `groups.ts:608` stores the currently managed member as module-level state. It is set on open and cleared to null on close at `groups.ts:639`.
- The `stopPropagation()` call at `groups.ts:448` prevents the row click handler (which navigates to `/u/username`) from firing when the MANAGE button is clicked.
- The promote dropdown at `groups.ts:625` filters out the target's current role from the options. If all roles are filtered (i.e., only the current role was assignable), it falls back to showing all assignable roles.
- Elders have no assignable roles per `assignableRoles()` at `groups.ts:83` — they can kick and ban but cannot promote or demote. The promote section is hidden for them at `groups.ts:623`.
- The leader transfer option is labeled "(transfer leadership)" in the dropdown at `groups.ts:627`.

---

## 2. Change a member's role

The SET ROLE button at `groups.ts:517` calls `_executePromote()` at `groups.ts:654` on click (wired at `groups.ts:602`). This reads the selected role from the dropdown, calls `safeRpc('promote_group_member', { p_group_id, p_user_id, p_new_role })`, and on success closes the modal and refreshes the member list. Leadership transfer is a special case: when `newRole === 'leader'`, the entire group detail is reloaded to update `callerRole` (since the caller is now demoted to member).

```mermaid
sequenceDiagram
    actor User
    participant SetBtn as SET ROLE button<br/>groups.ts:517
    participant ExecFn as _executePromote()<br/>groups.ts:654
    participant RPC as safeRpc(promote_group_member)<br/>groups.ts:662
    participant SQL as promote_group_member()<br/>supabase-deployed-functions-export.sql:7965
    participant RankFn as group_role_rank()<br/>supabase-deployed-functions-export.sql:6166
    participant MembersT as group_members table
    participant GroupsT as groups table
    participant Modal as closeMemberActionsModal()<br/>groups.ts:637
    participant Reload as loadGroupMembers()<br/>groups.ts:387

    Note over SetBtn: ALWAYS ENABLED<br/>when promote section is visible<br/>(no client-side disabled-state)
    User->>SetBtn: tap SET ROLE
    SetBtn->>ExecFn: _executePromote()
    ExecFn->>ExecFn: read dropdown value,<br/>disable button, text = ...
    ExecFn->>RPC: promote_group_member(group_id,<br/>user_id, new_role)
    RPC->>SQL: calls promote_group_member()
    SQL->>SQL: validate role in<br/>(leader, co_leader, elder, member)
    SQL->>SQL: verify caller is not target
    SQL->>MembersT: get caller role and target role
    SQL->>RankFn: compute caller_rank,<br/>target_rank, new_rank

    alt new_role is leader (transfer)
        SQL->>SQL: verify caller is leader
        SQL->>MembersT: UPDATE caller role = member
        SQL->>MembersT: UPDATE target role = leader
        SQL->>GroupsT: UPDATE owner_id = target
        SQL-->>RPC: success, transferred: true
        RPC-->>ExecFn: result
        ExecFn->>Modal: close modal
        ExecFn->>ExecFn: openGroup(groupId)<br/>to refresh callerRole
    else normal role change
        SQL->>SQL: verify caller_rank strictly<br/>greater than target_rank<br/>AND strictly greater than new_rank
        SQL->>MembersT: UPDATE target role = new_role
        SQL-->>RPC: success, new_role
        RPC-->>ExecFn: result
        ExecFn->>Modal: close modal
        ExecFn->>Reload: loadGroupMembers(groupId)
    end
    ExecFn->>User: toast: Role updated to [role]
```

**Notes:**
- The leadership transfer path at `supabase-deployed-functions-export.sql:8012-8027` is atomic: demote caller, promote target, update `groups.owner_id` all happen in one transaction.
- After a leadership transfer, the client calls `openGroup(currentGroupId)` at `groups.ts:674` instead of just `loadGroupMembers()`, because `callerRole` must be refreshed from the server (the caller is now a member, not leader).
- The SQL validates that the caller cannot change their own role (`supabase-deployed-functions-export.sql:7987-7989`).
- For non-transfer changes, the SQL enforces two rank checks: caller must strictly outrank the target (`supabase-deployed-functions-export.sql:8031-8033`) AND caller must strictly outrank the new role (`supabase-deployed-functions-export.sql:8035-8037`). This prevents a co_leader from promoting someone to co_leader (their own level).
- Error handling at `groups.ts:667-669` displays the error message in the modal's error area via `_setMamError()`, not as a toast. The button is re-enabled via the `finally` block at `groups.ts:681`.

---

## 3. Kick a member

The KICK MEMBER button at `groups.ts:535` calls `_executeKick()` at `groups.ts:685` on click. This shows a browser `confirm()` dialog at `groups.ts:688`, and on confirmation calls `safeRpc('kick_group_member', { p_group_id, p_user_id })`. The SQL deletes the member's `group_members` row and decrements `groups.member_count`.

```mermaid
sequenceDiagram
    actor User
    participant KickBtn as KICK MEMBER button<br/>groups.ts:535
    participant ExecFn as _executeKick()<br/>groups.ts:685
    participant Confirm as browser confirm() dialog<br/>groups.ts:688
    participant RPC as safeRpc(kick_group_member)<br/>groups.ts:692
    participant SQL as kick_group_member()<br/>supabase-deployed-functions-export.sql:7176
    participant RankFn as group_role_rank()<br/>supabase-deployed-functions-export.sql:6166
    participant MembersT as group_members table
    participant GroupsT as groups table
    participant Modal as closeMemberActionsModal()<br/>groups.ts:637
    participant Reload as loadGroupMembers()<br/>groups.ts:387

    Note over KickBtn: ALWAYS ENABLED<br/>in the modal (no client-side<br/>disabled-state logic)
    User->>KickBtn: tap KICK MEMBER
    KickBtn->>ExecFn: _executeKick()
    ExecFn->>Confirm: Kick [name] from the group?

    alt user cancels
        Confirm-->>ExecFn: false
        ExecFn-->>User: no action, modal stays open
    else user confirms
        Confirm-->>ExecFn: true
        ExecFn->>ExecFn: disable button, text = ...
        ExecFn->>RPC: kick_group_member(group_id, user_id)
        RPC->>SQL: calls kick_group_member()
        SQL->>SQL: verify not self-kick<br/>(use leave_group instead)
        SQL->>MembersT: get caller and target roles
        SQL->>RankFn: verify caller rank strictly<br/>greater than target rank
        SQL->>MembersT: DELETE target row
        SQL->>GroupsT: member_count -= 1
        SQL-->>RPC: success
        RPC-->>ExecFn: result
        ExecFn->>Modal: close modal
        ExecFn->>User: toast: [name] kicked
        ExecFn->>Reload: loadGroupMembers(groupId)
    end
```

**Notes:**
- The `confirm()` dialog at `groups.ts:688` is a browser-native confirmation. It is the only client-side guard before the kick RPC fires.
- The SQL explicitly blocks self-kicks at `supabase-deployed-functions-export.sql:7191-7192` with the message "Use leave_group to leave a group."
- The SQL uses `GREATEST(0, member_count - 1)` at `supabase-deployed-functions-export.sql:7219` to prevent the count from going negative.
- Kicked members can rejoin the group — kick does not create a ban record. Only the ban action creates a `group_bans` entry.
- Error display uses `_setMamError()` at `groups.ts:696` (modal inline error), not a toast. Success uses a toast at `groups.ts:700`.

---

## 4. Ban a member

The BAN MEMBER button at `groups.ts:566` calls `_executeBan()` at `groups.ts:709` on click. Unlike kick, ban does NOT show a confirmation dialog — it fires immediately. The SQL removes the member from `group_members` (if present), decrements `groups.member_count`, and inserts a row into `group_bans` with an optional reason. The ban can also be pre-emptive: leaders and co_leaders can ban non-members to block them from joining.

```mermaid
sequenceDiagram
    actor User
    participant BanReason as ban reason textarea<br/>groups.ts:551
    participant BanBtn as BAN MEMBER button<br/>groups.ts:566
    participant ExecFn as _executeBan()<br/>groups.ts:709
    participant RPC as safeRpc(ban_group_member)<br/>groups.ts:716
    participant SQL as ban_group_member()<br/>supabase-deployed-functions-export.sql:461
    participant RankFn as group_role_rank()<br/>supabase-deployed-functions-export.sql:6166
    participant MembersT as group_members table
    participant GroupsT as groups table
    participant BansT as group_bans table
    participant Modal as closeMemberActionsModal()<br/>groups.ts:637
    participant Reload as loadGroupMembers()<br/>groups.ts:387

    Note over BanBtn: ALWAYS ENABLED<br/>in the modal (no client-side<br/>disabled-state logic)
    Note over BanReason: OPTIONAL text input<br/>maxlength 280 chars
    User->>BanReason: optionally enter reason
    User->>BanBtn: tap BAN MEMBER
    BanBtn->>ExecFn: _executeBan()
    ExecFn->>ExecFn: read reason (trim, or null),<br/>disable button, text = ...
    ExecFn->>RPC: ban_group_member(group_id,<br/>user_id, reason)
    RPC->>SQL: calls ban_group_member()
    SQL->>SQL: verify not self-ban
    SQL->>MembersT: get caller and target roles

    alt target is a current member
        SQL->>RankFn: verify caller rank strictly<br/>greater than target rank
        SQL->>MembersT: DELETE target row
        SQL->>GroupsT: member_count -= 1
    else target is not a member (pre-emptive ban)
        SQL->>RankFn: verify caller rank at or over 3<br/>(co_leader or leader only)
    end

    SQL->>BansT: INSERT ban record<br/>ON CONFLICT DO NOTHING
    SQL-->>RPC: success
    RPC-->>ExecFn: result
    ExecFn->>Modal: close modal
    ExecFn->>User: toast: [name] banned
    ExecFn->>Reload: loadGroupMembers(groupId)
```

**Notes:**
- Ban does NOT have a confirmation dialog, unlike kick. This is an inconsistency — ban is a more severe action (blocked from rejoining) but requires fewer clicks.
- The ban reason textarea at `groups.ts:551` is optional (`p_reason text DEFAULT NULL` in the SQL at `supabase-deployed-functions-export.sql:461`). Empty strings are trimmed to null at `groups.ts:711`.
- `ON CONFLICT (group_id, user_id) DO NOTHING` at `supabase-deployed-functions-export.sql:513` means banning an already-banned user silently succeeds. The client shows a success toast even if the ban already existed.
- The pre-emptive ban path (target is not a member) requires rank at or over 3, which means co_leader (rank 3) or leader (rank 4) per `group_role_rank()`. Elders (rank 2) cannot pre-emptively ban.
- The `unban_group_member` RPC exists at `supabase-deployed-functions-export.sql:10399` but has no client UI. Unbanning requires direct SQL or a future admin panel.
- Error display uses `_setMamError()` at `groups.ts:722` (modal inline error). Success uses a toast at `groups.ts:725`.

---

## Cross-references

- [F-14 Role Hierarchy](./F-14-role-hierarchy.md) — parent feature. F-15 depends entirely on F-14's four-role rank system. The MANAGE button rendered in F-14's diagram 2 is the entry point to F-15's modal.

## Known quirks

- **No confirmation dialog for ban.** Kick shows a `confirm()` dialog at `groups.ts:688`, but ban fires immediately on button click. Ban is the more severe action (prevents rejoining) yet requires fewer clicks to execute.
- **Unban exists server-side but has no client UI.** `unban_group_member` at `supabase-deployed-functions-export.sql:10399` is a functional RPC (auth + rank check + delete from `group_bans`) but nothing in the client calls it. A banned user cannot be unbanned without direct SQL access.
- **`_executeBan` and `_executeKick` swallow generic errors.** Both catch blocks at `groups.ts:728` and `groups.ts:704` call `_setMamError('Something went wrong')`, discarding the actual error object. The original exception message is lost.
- **Leadership transfer refreshes the whole group, but kick/ban only refresh the member list.** After a leadership transfer at `groups.ts:674`, `openGroup(currentGroupId)` re-fetches everything (details, hot takes, challenges, members). After kick/ban, only `loadGroupMembers()` is called at `groups.ts:701`/`groups.ts:726`. This means the header member count (`detail-members`) is not updated after kick/ban — only the member list re-renders. The count updates only after a full page refresh or re-opening the group.
- **Session 223 security fixes.** `session-223-group-rpc-fixes.sql` patched three critical group RPCs: `resolve_group_challenge` (was unauthenticated), `update_group_elo` (dropped entirely — any user could manipulate any group Elo), and `join_group` (was missing `is_public` check). These are adjacent to F-15 but affect the broader groups system.
