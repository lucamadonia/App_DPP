import { CNAME_TARGET } from '@/lib/dns-providers';

export interface DNSVerificationResult {
  status: 'verified' | 'pending' | 'failed';
  cnameFound: boolean;
  cnameValue?: string;
  error?: string;
}

interface GoogleDNSResponse {
  Status: number;
  Answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
}

/**
 * Verifies DNS CNAME record via Google DNS-over-HTTPS API.
 * Returns verification status based on whether the CNAME points to our target.
 */
export async function verifyDomainCNAME(domain: string): Promise<DNSVerificationResult> {
  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`,
      {
        headers: { Accept: 'application/dns-json' },
      }
    );

    if (!response.ok) {
      return {
        status: 'failed',
        cnameFound: false,
        error: `DNS lookup failed: HTTP ${response.status}`,
      };
    }

    const data: GoogleDNSResponse = await response.json();

    // Status 0 = NOERROR (success)
    if (data.Status !== 0) {
      return {
        status: 'pending',
        cnameFound: false,
        error: 'No DNS records found. The record may not have propagated yet.',
      };
    }

    // Look for CNAME records (type 5)
    const cnameRecords = data.Answer?.filter(a => a.type === 5) || [];

    if (cnameRecords.length === 0) {
      return {
        status: 'pending',
        cnameFound: false,
        error: 'No CNAME record found. Please check your DNS configuration.',
      };
    }

    // Check if any CNAME points to our target
    const normalizedTarget = CNAME_TARGET.replace(/\.$/, '');
    const matchingRecord = cnameRecords.find(r => {
      const recordValue = r.data.replace(/\.$/, '').toLowerCase();
      return recordValue === normalizedTarget.toLowerCase();
    });

    if (matchingRecord) {
      return {
        status: 'verified',
        cnameFound: true,
        cnameValue: matchingRecord.data.replace(/\.$/, ''),
      };
    }

    // CNAME exists but points somewhere else
    return {
      status: 'failed',
      cnameFound: true,
      cnameValue: cnameRecords[0].data.replace(/\.$/, ''),
      error: `CNAME record found but points to "${cnameRecords[0].data.replace(/\.$/, '')}" instead of "${CNAME_TARGET}".`,
    };
  } catch (err) {
    return {
      status: 'failed',
      cnameFound: false,
      error: err instanceof Error ? err.message : 'Unknown error during DNS verification',
    };
  }
}
