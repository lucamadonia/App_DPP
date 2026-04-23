-- Fix: shopify_webhook_events uses received_at, not created_at.
CREATE OR REPLACE FUNCTION compute_tenant_health(p_tenant_id UUID)
  RETURNS INTEGER AS $$
DECLARE
  v_score INT := 100;
  v_factors JSONB := '{}'::jsonb;
  v_last_login TIMESTAMPTZ;
  v_payment_status TEXT;
  v_failed_webhooks INT := 0;
  v_open_tickets INT := 0;
  v_days_since_login INT;
  v_tenant_status TEXT;
BEGIN
  SELECT status INTO v_tenant_status FROM tenants WHERE id = p_tenant_id;
  IF v_tenant_status IN ('suspended', 'deleted', 'trial_expired') THEN
    UPDATE tenants SET
      health_score = 0,
      health_factors = jsonb_build_object('tenantStatus', v_tenant_status),
      health_updated_at = NOW()
    WHERE id = p_tenant_id;
    RETURN 0;
  END IF;

  SELECT MAX(last_login) INTO v_last_login FROM profiles WHERE tenant_id = p_tenant_id;
  IF v_last_login IS NULL THEN
    v_score := v_score - 30;
    v_factors := v_factors || jsonb_build_object('noLogin', true);
  ELSE
    v_days_since_login := EXTRACT(EPOCH FROM (NOW() - v_last_login)) / 86400;
    v_factors := v_factors || jsonb_build_object('daysSinceLogin', v_days_since_login);
    IF v_days_since_login > 30 THEN v_score := v_score - 20;
    ELSIF v_days_since_login > 14 THEN v_score := v_score - 10;
    END IF;
  END IF;

  SELECT status INTO v_payment_status FROM billing_subscriptions WHERE tenant_id = p_tenant_id;
  IF v_payment_status IS NOT NULL THEN
    v_factors := v_factors || jsonb_build_object('paymentStatus', v_payment_status);
    IF v_payment_status = 'past_due' THEN v_score := v_score - 30;
    ELSIF v_payment_status = 'canceled' THEN v_score := v_score - 40;
    ELSIF v_payment_status = 'incomplete' THEN v_score := v_score - 20;
    END IF;
  END IF;

  BEGIN
    SELECT COUNT(*) INTO v_failed_webhooks FROM shopify_webhook_events
      WHERE tenant_id = p_tenant_id AND status = 'failed'
        AND received_at > NOW() - INTERVAL '7 days';
    v_factors := v_factors || jsonb_build_object('failedWebhooks7d', v_failed_webhooks);
    IF v_failed_webhooks > 10 THEN v_score := v_score - 20;
    ELSIF v_failed_webhooks > 3 THEN v_score := v_score - 10;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_factors := v_factors || jsonb_build_object('shopifyWebhooks', 'unavailable');
  END;

  BEGIN
    SELECT COUNT(*) INTO v_open_tickets FROM rh_tickets
      WHERE tenant_id = p_tenant_id AND status IN ('open', 'pending');
    v_factors := v_factors || jsonb_build_object('openTickets', v_open_tickets);
    IF v_open_tickets > 5 THEN v_score := v_score - 10;
    ELSIF v_open_tickets > 2 THEN v_score := v_score - 5;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_factors := v_factors || jsonb_build_object('tickets', 'unavailable');
  END;

  v_score := GREATEST(0, LEAST(100, v_score));

  UPDATE tenants SET
    health_score = v_score,
    health_factors = v_factors,
    health_updated_at = NOW()
  WHERE id = p_tenant_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;
