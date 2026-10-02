-- ============================================================================
-- Go-live hardening, package A: identity and isolation
-- (DB-01/SEC-02, DB-08, DB-09, DB-10, DB-11, DB-12)
-- ============================================================================
--
-- 1. profiles: self-escalation guard (DB-01)
--    Before this, any user could PATCH their own profiles row and set
--    is_super_admin, admin_role, role or tenant_id. A BEFORE INSERT/UPDATE
--    trigger now rejects every client INSERT (profiles are only created by
--    handle_new_user and service_role, regardless of which INSERT policies
--    exist live) and every UPDATE from the API roles (anon, authenticated)
--    except an explicit column allowlist:
--      * self:            name, avatar_url, updated_at, last_login,
--                         role only as a downgrade (never the last admin)
--      * tenant admin on another user of the same tenant:
--                         name, avatar_url, updated_at, role (admin/editor/viewer),
--                         status (active/inactive/pending), last-admin protected
--    tenant_id, email, is_super_admin, admin_role, id, invited_by, ... can
--    only be changed by service_role (admin-api, invite-user, delete-account)
--    or by SECURITY DEFINER functions owned by postgres (handle_new_user).
--    Detection uses current_user: PostgREST runs client requests as
--    anon/authenticated; service_role and definer functions run as other roles.
--    Unknown/future columns are denied by default (allowlist, not denylist).
--
-- 2. profiles policies: WITH CHECK on both UPDATE policies, client INSERT
--    policy removed (nothing in src/ inserts profiles; handle_new_user and
--    invite-user bypass RLS).
--
-- 3. invitations: only tenant admins may create/update/delete invitations
--    (the older feature-pack policies let viewers invite new admins, which
--    handle_new_user then honoured).
--
-- 4. handle_new_user: restores the customer-registration and invitation paths
--    that 20260213_tenant_slug_format.sql dropped (customers got a full admin
--    tenant; invited users got their own tenant), keeping the 20260213 slug
--    logic for self-signup. The invitation path is bound to the invite flow:
--    it only applies when raw_user_meta_data.invitation_id (set by invite-user)
--    names a pending, unexpired invitation for exactly this email. A plain
--    signup whose email matches a foreign invitation gets its own tenant
--    (prevents invitation squatting). Role allowlist enforced.
--
-- 5. rh_customer_profiles / rh_customers: customer-portal users can only edit
--    harmless profile fields (DB-12). Before this a customer could change
--    rh_customer_profiles.customer_id/tenant_id and read another customer's
--    returns and tickets via get_customer_id().
--
-- 6. Storage (DB-08): compliance-reports and feedback-photos write/read are
--    tenant-folder scoped ({tenant_id}/...) and writes need admin/editor.
--
-- 7. Master data (DB-09): RLS on, public SELECT, writes only for platform
--    super admins (AdminMasterDataPage) and service_role (seed scripts).
--
-- 8. log_admin_action (DB-10): EXECUTE only for service_role, search_path pinned.
--
-- 9. search_path pinned on SECURITY DEFINER helpers (DB-11).
--
-- Idempotent: safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Helper: is the caller a platform super admin?
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (p.is_super_admin IS TRUE) OR p.admin_role = 'super_admin'
       FROM public.profiles p
      WHERE p.id = auth.uid()),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_super_admin() TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 1. profiles guard trigger (DB-01 / SEC-02)
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: current_user must reflect the API role.
-- Lookups below run under the caller's RLS, which allows reading the own
-- profile and same-tenant profiles - exactly what the checks need.
CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_changed       TEXT[];
  v_key           TEXT;
  v_caller_role   TEXT;
  v_caller_tenant UUID;
  v_caller_status TEXT;
  v_is_self       BOOLEAN;
  v_allowed       TEXT[];
  v_other_admins  INT;
  v_rank_old      INT;
  v_rank_new      INT;
BEGIN
  -- Trusted paths: service_role, postgres-owned SECURITY DEFINER functions,
  -- migrations, dashboard. Only the PostgREST API roles are restricted.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Profiles are only ever created by handle_new_user (definer) or
    -- service_role (invite-user, admin-api). Reject every client INSERT,
    -- independent of whatever INSERT policies may exist live (a leftover
    -- "WITH CHECK (auth.uid() = id)" policy would otherwise let a
    -- profile-less customer-portal user join any tenant as admin).
    RAISE EXCEPTION 'profiles: clients cannot create profiles'
      USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'profiles: not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY(
    SELECT n.key
      FROM jsonb_each(to_jsonb(NEW)) AS n
     WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
  ) INTO v_changed;

  IF v_changed IS NULL OR array_length(v_changed, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_self := (OLD.id = v_uid);

  IF v_is_self THEN
    v_allowed := ARRAY['name', 'avatar_url', 'updated_at', 'last_login', 'role'];
  ELSE
    SELECT p.role, p.tenant_id, COALESCE(p.status, 'active')
      INTO v_caller_role, v_caller_tenant, v_caller_status
      FROM public.profiles p
     WHERE p.id = v_uid;

    IF v_caller_role IS DISTINCT FROM 'admin'
       OR v_caller_status = 'inactive'
       OR v_caller_tenant IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'profiles: only an active admin of the same tenant can edit other users'
        USING ERRCODE = '42501';
    END IF;

    v_allowed := ARRAY['name', 'avatar_url', 'updated_at', 'role', 'status'];
  END IF;

  FOREACH v_key IN ARRAY v_changed LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RAISE EXCEPTION 'profiles: column "%" cannot be changed by this user', v_key
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- Role changes: allowlist + self only as downgrade.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role IS NULL OR NEW.role NOT IN ('admin', 'editor', 'viewer') THEN
      RAISE EXCEPTION 'profiles: invalid role "%"', NEW.role USING ERRCODE = '22023';
    END IF;

    IF v_is_self THEN
      v_rank_old := CASE OLD.role WHEN 'admin' THEN 3 WHEN 'editor' THEN 2 ELSE 1 END;
      v_rank_new := CASE NEW.role WHEN 'admin' THEN 3 WHEN 'editor' THEN 2 ELSE 1 END;
      IF v_rank_new >= v_rank_old THEN
        RAISE EXCEPTION 'profiles: users cannot raise their own role' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND (NEW.status IS NULL OR NEW.status NOT IN ('active', 'inactive', 'pending')) THEN
    RAISE EXCEPTION 'profiles: invalid status "%"', NEW.status USING ERRCODE = '22023';
  END IF;

  -- Last-admin protection (demotion or deactivation of an active admin).
  IF OLD.role = 'admin'
     AND COALESCE(OLD.status, 'active') <> 'inactive'
     AND (NEW.role IS DISTINCT FROM 'admin' OR COALESCE(NEW.status, 'active') = 'inactive') THEN
    SELECT count(*) INTO v_other_admins
      FROM public.profiles p
     WHERE p.tenant_id = OLD.tenant_id
       AND p.id <> OLD.id
       AND p.role = 'admin'
       AND COALESCE(p.status, 'active') <> 'inactive';
    IF v_other_admins = 0 THEN
      RAISE EXCEPTION 'profiles: cannot demote or deactivate the last admin of a tenant'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_guard_privileged_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS profiles_guard_privileged_columns ON public.profiles;
CREATE TRIGGER profiles_guard_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged_columns();


-- ----------------------------------------------------------------------------
-- 2. profiles policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update profiles in their tenant" ON public.profiles;
CREATE POLICY "Admins can update profiles in their tenant"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles me
       WHERE me.id = auth.uid() AND me.role = 'admin'
    )
  )
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Clients never insert profiles (handle_new_user / invite-user do, bypassing
-- RLS). The old policy let a tenant admin create a profile for any auth user.
DROP POLICY IF EXISTS "Admins can insert profiles in their tenant" ON public.profiles;


-- ----------------------------------------------------------------------------
-- 3. invitations: admin-only writes
-- ----------------------------------------------------------------------------
-- The admin-only policies from migration-users-storage.sql stay; the
-- permissive "any tenant member" write policies from migration-feature-pack
-- are removed. Re-create the admin policies defensively in case they are
-- missing live.
DROP POLICY IF EXISTS "invitations_tenant_insert" ON public.invitations;
DROP POLICY IF EXISTS "invitations_tenant_update" ON public.invitations;
DROP POLICY IF EXISTS "invitations_tenant_delete" ON public.invitations;

DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND COALESCE(role, 'viewer') IN ('admin', 'editor', 'viewer')
    AND EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
CREATE POLICY "Admins can update invitations"
  ON public.invitations FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'admin')
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND COALESCE(role, 'viewer') IN ('admin', 'editor', 'viewer')
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;
CREATE POLICY "Admins can delete invitations"
  ON public.invitations FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'admin')
  );


-- ----------------------------------------------------------------------------
-- 4. handle_new_user: customer + invitation + self-signup paths
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 5a. rh_customer_profiles guard (customer cannot re-point customer_id/tenant_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rh_customer_profiles_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  FOR v_key IN
    SELECT n.key
      FROM jsonb_each(to_jsonb(NEW)) AS n
     WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
  LOOP
    IF v_key NOT IN ('display_name', 'avatar_url', 'updated_at') THEN
      RAISE EXCEPTION 'rh_customer_profiles: column "%" cannot be changed by clients', v_key
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_customer_profiles_guard_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS rh_customer_profiles_guard_update ON public.rh_customer_profiles;
CREATE TRIGGER rh_customer_profiles_guard_update
  BEFORE UPDATE ON public.rh_customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.rh_customer_profiles_guard_update();


-- ----------------------------------------------------------------------------
-- 5b. rh_customers guard (DB-12): non-staff may only edit contact fields
-- ----------------------------------------------------------------------------
-- Staff (a profiles row in the record's tenant) keep full control under the
-- existing tenant RLS policies. Everyone else on the API roles - in practice
-- customer-portal users - may only change contact/profile fields.
CREATE OR REPLACE FUNCTION public.rh_customers_guard_customer_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = auth.uid() AND p.tenant_id = OLD.tenant_id
  ) THEN
    RETURN NEW;
  END IF;

  FOR v_key IN
    SELECT n.key
      FROM jsonb_each(to_jsonb(NEW)) AS n
     WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
  LOOP
    IF v_key NOT IN (
      'first_name', 'last_name', 'display_name', 'phone', 'company',
      'addresses', 'communication_preferences', 'updated_at'
    ) THEN
      RAISE EXCEPTION 'rh_customers: column "%" cannot be changed by customers', v_key
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_customers_guard_customer_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS rh_customers_guard_customer_update ON public.rh_customers;
CREATE TRIGGER rh_customers_guard_customer_update
  BEFORE UPDATE ON public.rh_customers
  FOR EACH ROW EXECUTE FUNCTION public.rh_customers_guard_customer_update();


-- ----------------------------------------------------------------------------
-- 6. Storage (DB-08): tenant-folder scoping
-- ----------------------------------------------------------------------------
-- compliance-reports (private): {tenant_id}/{report_id}.{pdf,csv}
DROP POLICY IF EXISTS "compliance_reports_storage_read" ON storage.objects;
CREATE POLICY "compliance_reports_storage_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-reports'
    AND (storage.foldername(name))[1] = (SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "compliance_reports_storage_write" ON storage.objects;
CREATE POLICY "compliance_reports_storage_write"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'compliance-reports'
    AND (storage.foldername(name))[1] = (SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor'))
  )
  WITH CHECK (
    bucket_id = 'compliance-reports'
    AND (storage.foldername(name))[1] = (SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor'))
  );

-- feedback-photos (public read stays): writes only into the own tenant folder
-- {tenant_id}/{review_id}/{file} by admin/editor.
DROP POLICY IF EXISTS "feedback_photos_write_auth" ON storage.objects;
CREATE POLICY "feedback_photos_write_auth"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'feedback-photos'
    AND (storage.foldername(name))[1] = (SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor'))
  )
  WITH CHECK (
    bucket_id = 'feedback-photos'
    AND (storage.foldername(name))[1] = (SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor'))
  );


-- ----------------------------------------------------------------------------
-- 7. Master data (DB-09): RLS on, public read, super-admin writes
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'countries', 'eu_regulations', 'national_regulations', 'pictograms',
    'recycling_codes', 'checklist_templates', 'news_items',
    'ear_categories', 'country_product_requirements'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'master data table public.% not found, skipped', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t || '_public_read', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_super_admin_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.is_platform_super_admin()) WITH CHECK (public.is_platform_super_admin())',
      t || '_super_admin_write', t
    );
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- 8. log_admin_action (DB-10): service_role only
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  fn REGPROCEDURE := to_regprocedure(
    'public.log_admin_action(uuid, text, text, text, text, text, jsonb, text, text, text)'
  );
BEGIN
  IF fn IS NULL THEN
    RAISE NOTICE 'log_admin_action not found, skipped';
    RETURN;
  END IF;
  EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
END $$;


-- ----------------------------------------------------------------------------
-- 9. Pin search_path on SECURITY DEFINER helpers (DB-11)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  fn  REGPROCEDURE;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('public.get_user_tenant_id()',          'public'),
      ('public.get_customer_tenant_id()',      'public'),
      ('public.get_customer_id()',             'public'),
      ('public.is_customer()',                 'public'),
      ('public.update_customer_last_login()',  'public, auth')
    ) AS v(sig, path)
  LOOP
    fn := to_regprocedure(rec.sig);
    IF fn IS NULL THEN
      RAISE NOTICE 'function % not found, skipped', rec.sig;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER FUNCTION %s SET search_path = %s', fn, rec.path);
  END LOOP;
END $$;
