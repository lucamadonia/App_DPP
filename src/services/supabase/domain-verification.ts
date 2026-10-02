import { invokeEdgeFunction } from '@/lib/edge-function';

export interface DNSVerificationResult {
  status: 'verified' | 'pending' | 'failed';
  cnameFound: boolean;
  cnameValue?: string;
  error?: string;
}

interface VerifyDomainResponse {
  success: boolean;
  result?: DNSVerificationResult;
  error?: string;
}

/**
 * Verifies the DNS CNAME record of a custom domain.
 *
 * The lookup runs server-side in the `manage-vercel-domain` Edge Function
 * (action "verify"): the browser CSP does not need a DNS-over-HTTPS origin,
 * and the result comes from the server instead of the client.
 */
export async function verifyDomainCNAME(domain: string): Promise<DNSVerificationResult> {
  try {
    const { data, error } = await invokeEdgeFunction<VerifyDomainResponse>(
      'manage-vercel-domain',
      { action: 'verify', domain },
    );

    if (error) {
      return { status: 'failed', cnameFound: false, error: error.message };
    }

    if (!data?.success || !data.result) {
      return {
        status: 'failed',
        cnameFound: false,
        error: data?.error || 'DNS verification failed',
      };
    }

    return data.result;
  } catch (err) {
    return {
      status: 'failed',
      cnameFound: false,
      error: err instanceof Error ? err.message : 'Unknown error during DNS verification',
    };
  }
}
