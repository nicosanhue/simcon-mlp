CREATE TABLE public.vig_ia_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text NOT NULL,
  message_id text NOT NULL,
  message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_key, message_id)
);
GRANT ALL ON public.vig_ia_messages TO service_role;
ALTER TABLE public.vig_ia_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX vig_ia_messages_profile_idx ON public.vig_ia_messages (profile_key, created_at);