ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);

UPDATE public.users u
SET full_name = p.full_name
FROM public.user_profiles p
WHERE p.user_id = u.id
  AND p.full_name IS NOT NULL
  AND u.full_name IS NULL;

ALTER TABLE public.users
  ALTER COLUMN firebase_uid SET NOT NULL,
  ALTER COLUMN phone_number SET NOT NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN user_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number
  ON public.users (phone_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_id
  ON public.user_profiles (user_id);
