-- Restrict realtime.messages so only org members can subscribe to approval channels
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated org members can subscribe to approval channels" ON realtime.messages;

CREATE POLICY "Authenticated org members can subscribe to approval channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Topic convention: "approval_requests:<organization_id>"
  CASE
    WHEN realtime.topic() LIKE 'approval_requests:%'
      THEN public.is_org_member(
        auth.uid(),
        (substring(realtime.topic() from 'approval_requests:(.*)'))::uuid
      )
    ELSE false
  END
);
