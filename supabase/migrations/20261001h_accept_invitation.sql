-- ============================================================================
-- Go-live hardening, package A (follow-up): accept-invitation flow (SEC-07)
-- ============================================================================
--
-- Before this, a person who already had a Trackbliss account could not join a
-- second tenant: invite-user (correctly) never moves an existing profile, and
-- handle_new_user only runs for brand-new auth users. This migration adds the
-- explicit, consented join step for logged-in users:
--
--   list_my_pending_invitations()  -> jsonb
--     Pending, unexpired invitations addressed to the caller's own, CONFIRMED
--     auth email (case-insensitive), plus an assessment of what leaving the
--     current tenant would mean (sole admin? data? paid subscription?).
--
--   accept_invitation(p_invitation_id uuid, p_confirm_leave boolean) -> jsonb
--     Moves the caller's profile into the inviting tenant with the role from
--     the invitation (allowlist admin/editor/viewer). Rules:
--       * auth email must be confirmed and equal the invitation email
--         (case-insensitive). Unknown id and foreign email give the SAME
--         answer ('not_found'), so ids cannot be probed.
--       * invitation must be pending and unexpired.
--       * caller needs a staff profile (customer-portal accounts cannot use it).
--       * leaving the current tenant:
--           - member / one of several admins       -> allowed
--           - sole admin, other members remain     -> 'promote_admin_first'
--           - sole admin, paid subscription/module -> 'active_subscription'
--           - sole admin + only member + data      -> needs p_confirm_leave
--                                                     ('confirmation_required')
--           - sole admin + only member + no data   -> allowed, the empty tenant
--                                                     is deleted (best effort)
--       * the joining tenant must have a free seat (plan limit free=1, pro=5,
--         enterprise=25 staff profiles), else 'seat_limit'. Invitations can be
--         inserted directly via PostgREST, so the invite-user check alone is
--         not enough; handle_new_user Path 2 is re-defined (section 3) with
--         the same check.
--       * the invitation is marked accepted; activity_log rows are written in
--         the joined and (if it still exists) the left tenant.
--
-- The profiles guard from 20261001a lets postgres-owned SECURITY DEFINER
-- functions through (current_user is not anon/authenticated). In addition the
-- function sets the transaction-local GUC trackbliss.profile_change =
-- 'accept_invitation' around the UPDATE, so a stricter guard can whitelist
-- exactly this path without trusting every definer function.
--
-- Applied AFTER 20261001a..g. Idempotent: safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Internal helper: what does leaving the caller's current tenant mean?
-- ----------------------------------------------------------------------------
-- Not callable by clients. Generic data check: every public base table with a
-- tenant_id column counts as "data", except bookkeeping rows that exist for
-- every tenant (memberships, invitations, audit, free billing scaffolding).
-- Conservative on purpose: unknown tables count as data, so an empty-tenant
-- cleanup only ever happens when there is truly nothing to lose.
CREATE OR REPLACE FUNCTION public._invitation_leave_assessment(p_uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant        UUID;
  v_role          TEXT;
  v_status        TEXT;
  v_tenant_name   TEXT;
  v_other_members INT := 0;
  v_other_admins  INT := 0;
  v_data_tables   TEXT[] := ARRAY[]::TEXT[];
  v_paid          BOOLEAN := FALSE;
  v_exists        BOOLEAN;
  v_tbl           TEXT;
  v_sole_admin    BOOLEAN;
  v_outcome       TEXT;
BEGIN
  SELECT p.tenant_id, p.role, COALESCE(p.status, 'active')
    INTO v_tenant, v_role, v_status
    FROM public.profiles p
   WHERE p.id = p_uid;

  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('has_profile', FALSE);
  END IF;

  SELECT t.name INTO v_tenant_name FROM public.tenants t WHERE t.id = v_tenant;

  SELECT count(*) INTO v_other_members
    FROM public.profiles p
   WHERE p.tenant_id = v_tenant AND p.id <> p_uid;

  SELECT count(*) INTO v_other_admins
    FROM public.profiles p
   WHERE p.tenant_id = v_tenant AND p.id <> p_uid
     AND p.role = 'admin' AND COALESCE(p.status, 'active') <> 'inactive';

  v_sole_admin := (v_role = 'admin' AND v_other_admins = 0);

  IF v_sole_admin THEN
    FOR v_tbl IN
      SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
       WHERE c.table_schema = 'public'
         AND c.column_name = 'tenant_id'
         AND t.table_type = 'BASE TABLE'
         AND c.table_name NOT IN (
           'profiles', 'invitations', 'activity_log',
           'billing_credits', 'billing_credit_transactions', 'billing_usage_logs',
           'billing_subscriptions', 'billing_module_subscriptions'
         )
       ORDER BY c.table_name
    LOOP
      BEGIN
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE tenant_id = $1)', v_tbl)
          INTO v_exists USING v_tenant;
      EXCEPTION WHEN OTHERS THEN
        v_exists := TRUE; -- unreadable/odd table: assume data (conservative)
      END;
      IF v_exists THEN
        v_data_tables := array_append(v_data_tables, v_tbl);
      END IF;
    END LOOP;

    -- Paid plan or paid module in good standing: leaving would strand billing.
    BEGIN
      EXECUTE $q$SELECT EXISTS (
                 SELECT 1 FROM public.billing_subscriptions
                  WHERE tenant_id = $1 AND COALESCE(plan, 'free') <> 'free'
                    AND status IN ('active', 'trialing', 'past_due'))$q$
        INTO v_exists USING v_tenant;
      v_paid := v_paid OR COALESCE(v_exists, FALSE);
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
    END;
    BEGIN
      EXECUTE $q$SELECT EXISTS (
                 SELECT 1 FROM public.billing_module_subscriptions
                  WHERE tenant_id = $1 AND status IN ('active', 'trialing', 'past_due'))$q$
        INTO v_exists USING v_tenant;
      v_paid := v_paid OR COALESCE(v_exists, FALSE);
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
    END;
  END IF;

  IF NOT v_sole_admin THEN
    v_outcome := 'leave';
  ELSIF v_other_members > 0 THEN
    v_outcome := 'promote_admin_first';
  ELSIF v_paid THEN
    v_outcome := 'active_subscription';
  ELSIF array_length(v_data_tables, 1) IS NOT NULL THEN
    v_outcome := 'confirm_required';
  ELSE
    v_outcome := 'delete_empty_tenant';
  END IF;

  RETURN jsonb_build_object(
    'has_profile',        TRUE,
    'tenant_id',          v_tenant,
    'tenant_name',        v_tenant_name,
    'role',               v_role,
    'is_sole_admin',      v_sole_admin,
    'other_members',      v_other_members,
    'paid_subscription',  v_paid,
    'data_tables',        to_jsonb(v_data_tables),
    'outcome',            v_outcome
  );
END;
$$;

REVOKE ALL ON FUNCTION public._invitation_leave_assessment(UUID) FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 0b. Internal helper: seat status of a tenant (plan maxAdminUsers)
-- ----------------------------------------------------------------------------
-- The invite-user Edge Function checks seats before mailing, but admins can
-- INSERT invitation rows directly via PostgREST (RLS "Admins can create
-- invitations"), skipping that check. Every DB-side join path therefore checks
-- seats itself: accept_invitation and handle_new_user Path 2 (both below).
-- Limits mirror PLAN_CONFIGS.maxAdminUsers / INVITE_SEATS_* defaults:
-- free = 1, pro = 5, enterprise = 25. Plan = best non-free plan with status
-- active/trialing/past_due, else 'free' (also when billing tables are missing:
-- fail towards the most restrictive limit). Seats used = staff profiles.
CREATE OR REPLACE FUNCTION public._tenant_seat_status(p_tenant UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan  TEXT := 'free';
  v_limit INT;
  v_used  INT;
BEGIN
  BEGIN
    EXECUTE $q$SELECT CASE
                 WHEN bool_or(plan = 'enterprise') THEN 'enterprise'
                 WHEN bool_or(plan = 'pro') THEN 'pro'
                 ELSE 'free' END
                 FROM public.billing_subscriptions
                WHERE tenant_id = $1
                  AND status IN ('active', 'trialing', 'past_due')$q$
      INTO v_plan USING p_tenant;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_plan := 'free';
  END;
  v_plan  := COALESCE(v_plan, 'free');
  v_limit := CASE v_plan WHEN 'enterprise' THEN 25 WHEN 'pro' THEN 5 ELSE 1 END;

  SELECT count(*)::int INTO v_used FROM public.profiles p WHERE p.tenant_id = p_tenant;

  RETURN jsonb_build_object(
    'plan',  v_plan,
    'limit', v_limit,
    'used',  v_used,
    'full',  (v_used + 1 > v_limit)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._tenant_seat_status(UUID) FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 1. list_my_pending_invitations()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_pending_invitations()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_email     TEXT;
  v_confirmed BOOLEAN;
  v_current   UUID;
  v_items     JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT u.email, (u.email_confirmed_at IS NOT NULL)
    INTO v_email, v_confirmed
    FROM auth.users u
   WHERE u.id = v_uid;

  SELECT p.tenant_id INTO v_current FROM public.profiles p WHERE p.id = v_uid;

  -- No confirmed email or no staff profile: nothing to offer.
  IF v_email IS NULL OR v_confirmed IS NOT TRUE OR v_current IS NULL THEN
    RETURN jsonb_build_object('invitations', '[]'::jsonb, 'leave', NULL);
  END IF;

  SELECT COALESCE(jsonb_agg(x.obj ORDER BY x.created_at DESC), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT i.created_at,
             jsonb_build_object(
               'id',              i.id,
               'tenant_id',       i.tenant_id,
               'tenant_name',     t.name,
               'role',            CASE WHEN i.role IN ('admin', 'editor', 'viewer') THEN i.role ELSE 'viewer' END,
               'invited_by_name', NULLIF(btrim(COALESCE(ip.name, '')), ''),
               'created_at',      i.created_at,
               'expires_at',      i.expires_at
             ) AS obj
        FROM public.invitations i
        JOIN public.tenants t ON t.id = i.tenant_id
        LEFT JOIN public.profiles ip ON ip.id = i.invited_by
       WHERE lower(i.email) = lower(v_email)
         AND i.status = 'pending'
         AND (i.expires_at IS NULL OR i.expires_at > now())
         AND i.tenant_id <> v_current
       ORDER BY i.created_at DESC
       LIMIT 20
    ) x;

  IF jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('invitations', v_items, 'leave', NULL);
  END IF;

  RETURN jsonb_build_object(
    'invitations', v_items,
    'leave',       public._invitation_leave_assessment(v_uid)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_pending_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_pending_invitations() TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. accept_invitation(p_invitation_id, p_confirm_leave)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id UUID,
  p_confirm_leave BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_email       TEXT;
  v_confirmed   BOOLEAN;
  v_inv         RECORD;
  v_old_tenant  UUID;
  v_old_role    TEXT;
  v_role        TEXT;
  v_leave       JSONB;
  v_outcome     TEXT;
  v_deleted     BOOLEAN := FALSE;
  v_new_name    TEXT;
  v_seats       JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_invitation_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'not_found');
  END IF;

  SELECT u.email, (u.email_confirmed_at IS NOT NULL)
    INTO v_email, v_confirmed
    FROM auth.users u
   WHERE u.id = v_uid;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'not_found');
  END IF;

  SELECT i.id, i.tenant_id, i.email, i.role, i.status, i.expires_at, i.invited_by
    INTO v_inv
    FROM public.invitations i
   WHERE i.id = p_invitation_id
     FOR UPDATE;

  -- Unknown id and foreign email answer identically (no id/email oracle).
  IF NOT FOUND OR lower(COALESCE(v_inv.email, '')) <> lower(v_email) THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'not_found');
  END IF;

  IF v_confirmed IS NOT TRUE THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'email_not_confirmed');
  END IF;

  IF v_inv.status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'not_pending');
  END IF;

  IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at <= now() THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'expired');
  END IF;

  v_role := CASE WHEN v_inv.role IN ('admin', 'editor', 'viewer') THEN v_inv.role ELSE 'viewer' END;

  SELECT p.tenant_id, p.role INTO v_old_tenant, v_old_role
    FROM public.profiles p
   WHERE p.id = v_uid
     FOR UPDATE;

  IF NOT FOUND OR v_old_tenant IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'no_profile');
  END IF;

  SELECT t.name INTO v_new_name FROM public.tenants t WHERE t.id = v_inv.tenant_id;

  -- Already a member of the inviting tenant: close the invitation, keep role.
  IF v_old_tenant = v_inv.tenant_id THEN
    BEGIN
      UPDATE public.invitations SET status = 'accepted' WHERE id = v_inv.id;
    EXCEPTION WHEN unique_violation THEN
      DELETE FROM public.invitations WHERE id = v_inv.id;
    END;
    RETURN jsonb_build_object('status', 'already_member', 'tenant_id', v_inv.tenant_id,
                              'tenant_name', v_new_name, 'role', v_old_role);
  END IF;

  -- Seat limit of the joining tenant (invitations can be inserted directly via
  -- PostgREST, bypassing invite-user's check). Lock the tenant row so two
  -- concurrent accepts cannot both take the last seat.
  PERFORM 1 FROM public.tenants t WHERE t.id = v_inv.tenant_id FOR UPDATE;
  v_seats := public._tenant_seat_status(v_inv.tenant_id);
  IF (v_seats->>'full')::boolean THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'seat_limit',
                              'limit', (v_seats->>'limit')::int);
  END IF;

  v_leave := public._invitation_leave_assessment(v_uid);
  v_outcome := v_leave->>'outcome';

  IF v_outcome IN ('promote_admin_first', 'active_subscription') THEN
    RETURN jsonb_build_object('status', 'error', 'error', v_outcome, 'leave', v_leave);
  END IF;

  IF v_outcome = 'confirm_required' AND COALESCE(p_confirm_leave, FALSE) IS NOT TRUE THEN
    RETURN jsonb_build_object('status', 'confirmation_required', 'leave', v_leave);
  END IF;

  -- Sanctioned profile move (see header). Transaction-local, reset right after.
  PERFORM set_config('trackbliss.profile_change', 'accept_invitation', TRUE);
  UPDATE public.profiles
     SET tenant_id  = v_inv.tenant_id,
         role       = v_role,
         status     = 'active',
         updated_at = now()
   WHERE id = v_uid;
  PERFORM set_config('trackbliss.profile_change', '', TRUE);

  BEGIN
    UPDATE public.invitations SET status = 'accepted' WHERE id = v_inv.id;
  EXCEPTION WHEN unique_violation THEN
    -- Legacy UNIQUE(tenant_id, email, status): an older accepted row exists.
    DELETE FROM public.invitations WHERE id = v_inv.id;
  END;

  -- Empty tenant left behind by its only member: remove it (best effort; a
  -- restrictive FK or concurrent insert simply keeps the tenant).
  IF v_outcome = 'delete_empty_tenant' THEN
    BEGIN
      DELETE FROM public.tenants t
       WHERE t.id = v_old_tenant
         AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.tenant_id = v_old_tenant);
      v_deleted := FOUND;
    EXCEPTION WHEN OTHERS THEN
      v_deleted := FALSE;
      RAISE WARNING 'accept_invitation: empty tenant % kept: %', v_old_tenant, SQLERRM;
    END;
  END IF;

  -- Audit trail (never blocks the accept on schema drift).
  BEGIN
    INSERT INTO public.activity_log (tenant_id, user_id, action, entity_type, entity_id, details)
    VALUES (v_inv.tenant_id, v_uid, 'invitation_accepted', 'invitation', v_inv.id,
            jsonb_build_object('role', v_role, 'email', v_email, 'from_tenant_id', v_old_tenant,
                               'invited_by', v_inv.invited_by));
    IF NOT v_deleted THEN
      INSERT INTO public.activity_log (tenant_id, user_id, action, entity_type, entity_id, details)
      VALUES (v_old_tenant, v_uid, 'member_left_for_invitation', 'profile', v_uid,
              jsonb_build_object('email', v_email, 'previous_role', v_old_role,
                                 'to_tenant_id', v_inv.tenant_id,
                                 'confirmed_leave', COALESCE(p_confirm_leave, FALSE),
                                 'outcome', v_outcome));
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    RAISE WARNING 'accept_invitation: activity_log unavailable: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'status',              'accepted',
    'tenant_id',           v_inv.tenant_id,
    'tenant_name',         v_new_name,
    'role',                v_role,
    'left_tenant_id',      v_old_tenant,
    'left_tenant_deleted', v_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID, BOOLEAN) TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. handle_new_user(): Path 2 (invite signup) now enforces the seat limit
-- ----------------------------------------------------------------------------
-- Verbatim copy of the 20261001a version; the ONLY change is the seat-limit
-- block in Path 2 (see _tenant_seat_status). Paths 1 and 3 are unchanged. The
-- existing on_auth_user_created trigger keeps pointing at this function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_type           TEXT;
  meta_tenant_id      UUID;
  meta_first_name     TEXT;
  meta_last_name      TEXT;
  existing_customer_id UUID;
  new_customer_id     UUID;
  inv_tenant_id       UUID;
  inv_role            TEXT;
  inv_name            TEXT;
  meta_invitation_txt TEXT;
  meta_invitation_id  UUID;
  new_tenant_id       UUID;
  tenant_name         TEXT;
  base_slug           TEXT;
  final_slug          TEXT;
  slug_counter        INT := 0;
BEGIN
  user_type := NEW.raw_user_meta_data->>'user_type';

  -- Path 1: customer-portal registration (no admin profile, no tenant).
  IF user_type = 'customer' THEN
    IF COALESCE(NEW.raw_user_meta_data->>'tenant_id', '') = '' THEN
      RAISE EXCEPTION 'tenant_id is required for customer registration';
    END IF;

    meta_tenant_id  := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    meta_first_name := NEW.raw_user_meta_data->>'first_name';
    meta_last_name  := NEW.raw_user_meta_data->>'last_name';

    SELECT id INTO existing_customer_id
      FROM rh_customers
     WHERE lower(email) = lower(NEW.email) AND tenant_id = meta_tenant_id
     LIMIT 1;

    IF existing_customer_id IS NOT NULL THEN
      new_customer_id := existing_customer_id;
      UPDATE rh_customers
         SET first_name = COALESCE(first_name, meta_first_name),
             last_name  = COALESCE(last_name, meta_last_name),
             updated_at = NOW()
       WHERE id = existing_customer_id;
    ELSE
      INSERT INTO rh_customers (tenant_id, email, first_name, last_name)
      VALUES (meta_tenant_id, NEW.email, meta_first_name, meta_last_name)
      RETURNING id INTO new_customer_id;
    END IF;

    INSERT INTO rh_customer_profiles (id, customer_id, tenant_id, display_name, email_verified)
    VALUES (
      NEW.id,
      new_customer_id,
      meta_tenant_id,
      TRIM(COALESCE(meta_first_name, '') || ' ' || COALESCE(meta_last_name, '')),
      COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE)
    );

    RETURN NEW;
  END IF;

  -- Path 2: invite flow only. invite-user passes data.invitation_id to
  -- inviteUserByEmail; the join is bound to that exact invitation AND the
  -- invited email. A plain signup (password, magic link, OAuth) whose email
  -- merely matches some tenant's pending invitation does NOT join it
  -- (invitation squatting) and falls through to Path 3 (own tenant).
  meta_invitation_txt := NEW.raw_user_meta_data->>'invitation_id';
  IF meta_invitation_txt ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    meta_invitation_id := meta_invitation_txt::uuid;
    SELECT i.tenant_id, i.role, i.name
      INTO inv_tenant_id, inv_role, inv_name
      FROM invitations i
     WHERE i.id = meta_invitation_id
       AND lower(i.email) = lower(NEW.email)
       AND i.status = 'pending'
       AND (i.expires_at IS NULL OR i.expires_at > NOW());
  END IF;

  -- Seat limit (added in 20261001h): an invitation inserted directly via
  -- PostgREST skips invite-user's seat check. Over the limit, the new user
  -- does NOT join; they fall through to Path 3 (own tenant) and the invitation
  -- stays pending (accept_invitation re-checks seats later).
  IF inv_tenant_id IS NOT NULL THEN
    PERFORM 1 FROM tenants t WHERE t.id = inv_tenant_id FOR UPDATE;
    IF (public._tenant_seat_status(inv_tenant_id)->>'full')::boolean THEN
      RAISE WARNING 'handle_new_user: seat limit reached for tenant %, invitation % not applied',
        inv_tenant_id, meta_invitation_id;
      inv_tenant_id := NULL;
    END IF;
  END IF;

  IF inv_tenant_id IS NOT NULL THEN
    IF inv_role IS NULL OR inv_role NOT IN ('admin', 'editor', 'viewer') THEN
      inv_role := 'viewer';
    END IF;

    INSERT INTO profiles (id, tenant_id, email, name, role)
    VALUES (
      NEW.id,
      inv_tenant_id,
      NEW.email,
      COALESCE(inv_name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
      inv_role
    )
    ON CONFLICT (id) DO UPDATE SET
      tenant_id = EXCLUDED.tenant_id,
      email     = EXCLUDED.email,
      name      = COALESCE(EXCLUDED.name, profiles.name),
      role      = EXCLUDED.role;

    UPDATE invitations
       SET status = 'accepted'
     WHERE id = meta_invitation_id
       AND status = 'pending';

    RETURN NEW;
  END IF;

  -- Path 3: self-signup -> new tenant (slug logic from 20260213).
  tenant_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  -- LOWER before stripping, otherwise upper-case letters were dropped ("Acme" -> "cme").
  base_slug := REGEXP_REPLACE(REPLACE(LOWER(tenant_name), ' ', '_'), '[^a-z0-9_]', '', 'g');
  IF base_slug = '' THEN
    base_slug := 'tenant';
  END IF;
  final_slug := base_slug;

  LOOP
    BEGIN
      INSERT INTO tenants (name, slug)
      VALUES (tenant_name, final_slug)
      RETURNING id INTO new_tenant_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      slug_counter := slug_counter + 1;
      final_slug := base_slug || '_' || slug_counter;
    END;
  END LOOP;

  INSERT INTO profiles (id, tenant_id, email, name, role)
  VALUES (
    NEW.id,
    new_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    'admin'
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
