export interface DNSProvider {
  id: string;
  name: string;
  logo: string; // emoji or icon identifier
  steps: string[]; // i18n keys for step-by-step instructions
  hostFieldName: string; // What they call the "Host" field
  targetFieldName: string; // What they call the "Value/Target" field
}

export const DNS_PROVIDERS: DNSProvider[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    logo: '☁️',
    hostFieldName: 'Name',
    targetFieldName: 'Target',
    steps: [
      'Log in to your Cloudflare dashboard',
      'Select your domain from the list',
      'Go to DNS → Records',
      'Click "Add record"',
      'Select Type: CNAME',
      'Enter the subdomain in the Name field',
      'Enter the target value in the Target field',
      'Set Proxy status to "DNS only" (grey cloud)',
      'Click "Save"',
    ],
  },
  {
    id: 'godaddy',
    name: 'GoDaddy',
    logo: '🌐',
    hostFieldName: 'Host',
    targetFieldName: 'Points to',
    steps: [
      'Log in to your GoDaddy account',
      'Go to My Products → Domains',
      'Click "DNS" next to your domain',
      'Click "Add" under DNS Records',
      'Select Type: CNAME',
      'Enter the subdomain in the Host field',
      'Enter the target value in the Points to field',
      'Set TTL to 1 Hour',
      'Click "Save"',
    ],
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    logo: '🏷️',
    hostFieldName: 'Host',
    targetFieldName: 'Value',
    steps: [
      'Log in to your Namecheap account',
      'Go to Domain List → Manage',
      'Click "Advanced DNS" tab',
      'Click "Add New Record"',
      'Select Type: CNAME Record',
      'Enter the subdomain in the Host field',
      'Enter the target value in the Value field',
      'Set TTL to Automatic',
      'Click the checkmark to save',
    ],
  },
  {
    id: 'hetzner',
    name: 'Hetzner',
    logo: '🔴',
    hostFieldName: 'Name',
    targetFieldName: 'Value',
    steps: [
      'Log in to the Hetzner DNS Console',
      'Select your DNS zone',
      'Click "Add Record"',
      'Select Type: CNAME',
      'Enter the subdomain in the Name field',
      'Enter the target value in the Value field',
      'Set TTL to 3600',
      'Click "Add Record"',
    ],
  },
  {
    id: 'ionos',
    name: 'IONOS',
    logo: '🔵',
    hostFieldName: 'Hostname',
    targetFieldName: 'Points to',
    steps: [
      'Log in to your IONOS account',
      'Go to Domains & SSL → your domain',
      'Click "DNS" in the submenu',
      'Click "Add Record"',
      'Select Type: CNAME',
      'Enter the subdomain in the Hostname field',
      'Enter the target value in the Points to field',
      'Click "Save"',
    ],
  },
  {
    id: 'strato',
    name: 'Strato',
    logo: '🟦',
    hostFieldName: 'Subdomain',
    targetFieldName: 'Target',
    steps: [
      'Log in to your Strato customer area',
      'Go to Domains → Domain management',
      'Click on "DNS settings" for your domain',
      'Scroll to "CNAME Records"',
      'Enter the subdomain prefix',
      'Enter the target value',
      'Click "Save settings"',
    ],
  },
  {
    id: 'aws',
    name: 'AWS Route 53',
    logo: '🟠',
    hostFieldName: 'Record name',
    targetFieldName: 'Value',
    steps: [
      'Log in to the AWS Management Console',
      'Go to Route 53 → Hosted zones',
      'Select your domain\'s hosted zone',
      'Click "Create record"',
      'Enter the subdomain in the Record name field',
      'Select Record type: CNAME',
      'Enter the target value in the Value field',
      'Set TTL to 300',
      'Click "Create records"',
    ],
  },
];

export const CNAME_TARGET = 'cname.vercel-dns.com';
export const RECOMMENDED_TTL = '3600';

export function getProviderById(id: string): DNSProvider | undefined {
  return DNS_PROVIDERS.find(p => p.id === id);
}

export function getSubdomainFromDomain(domain: string): string {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  return parts[0];
}
