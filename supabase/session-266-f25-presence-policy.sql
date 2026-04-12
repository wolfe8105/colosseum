-- ============================================================
-- F-25: Rival Online Alerts — Realtime Presence Policy
-- Session 266 | Project: faomczmipsccwbhpivmp
--
-- The existing authenticated_receive_broadcast policy covers extension='broadcast'.
-- Presence channels use extension='presence' — need separate SELECT + INSERT.
-- Scoped to the 'global-online' channel only.
-- ============================================================

-- SELECT: receive presence state updates (join/leave events)
DROP POLICY IF EXISTS "authenticated_presence_select" ON "realtime"."messages";
CREATE POLICY "authenticated_presence_select"
  ON "realtime"."messages"
  FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension = 'presence'
    AND realtime.topic() = 'global-online'
  );

-- INSERT: clients track their own presence via presenceChannel.track()
DROP POLICY IF EXISTS "authenticated_presence_insert" ON "realtime"."messages";
CREATE POLICY "authenticated_presence_insert"
  ON "realtime"."messages"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.messages.extension = 'presence'
    AND realtime.topic() = 'global-online'
  );
