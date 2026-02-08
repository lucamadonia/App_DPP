-- Update handle_new_user() to generate cleaner tenant slugs:
-- lowercase, spaces → underscores, no random hash suffix, collision handling via _2/_3/etc.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    tenant_name TEXT;
    base_slug TEXT;
    final_slug TEXT;
    slug_counter INT := 0;
BEGIN
    tenant_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    -- Generate slug: lowercase, spaces → underscores, strip non-alphanumeric
    base_slug := LOWER(REGEXP_REPLACE(REPLACE(tenant_name, ' ', '_'), '[^a-z0-9_]', '', 'g'));
    IF base_slug = '' THEN
        base_slug := 'tenant';
    END IF;
    final_slug := base_slug;

    -- Handle uniqueness: append _2, _3, etc. on collision
    LOOP
        BEGIN
            INSERT INTO tenants (name, slug)
            VALUES (tenant_name, final_slug)
            RETURNING id INTO new_tenant_id;
            EXIT; -- success
        EXCEPTION WHEN unique_violation THEN
            slug_counter := slug_counter + 1;
            final_slug := base_slug || '_' || slug_counter;
        END;
    END LOOP;

    -- Create profile for the user
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
