import { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileText,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const complianceItems = [
  {
    id: '1',
    product: 'Eco Sneaker Pro',
    requirement: 'CE-Kennzeichnung',
    status: 'compliant',
    dueDate: null,
    lastChecked: '2026-01-15',
  },
  {
    id: '2',
    product: 'Eco Sneaker Pro',
    requirement: 'REACH Verordnung',
    status: 'compliant',
    dueDate: null,
    lastChecked: '2026-01-15',
  },
  {
    id: '3',
    product: 'Eco Sneaker Pro',
    requirement: 'Produktsicherheitsgesetz',
    status: 'compliant',
    dueDate: null,
    lastChecked: '2026-01-10',
  },
  {
    id: '4',
    product: 'Solar Powerbank 20000',
    requirement: 'CE-Kennzeichnung',
    status: 'compliant',
    dueDate: null,
    lastChecked: '2026-01-20',
  },
  {
    id: '5',
    product: 'Solar Powerbank 20000',
    requirement: 'Batteriegesetz',
    status: 'pending',
    dueDate: '2026-02-15',
    lastChecked: null,
  },
  {
    id: '6',
    product: 'Bio Cotton T-Shirt',
    requirement: 'Textilkennzeichnungsgesetz',
    status: 'non-compliant',
    dueDate: '2026-01-30',
    lastChecked: '2026-01-25',
  },
];

const auditLog = [
  {
    id: '1',
    action: 'Dokument hochgeladen',
    user: 'admin@company.de',
    product: 'Eco Sneaker Pro',
    timestamp: '2026-01-27 14:32:15',
    details: 'CE_Konformitaetserklarung.pdf',
  },
  {
    id: '2',
    action: 'Status geändert',
    user: 'admin@company.de',
    product: 'Solar Powerbank 20000',
    timestamp: '2026-01-27 11:15:00',
    details: 'Von "Entwurf" zu "Veröffentlicht"',
  },
  {
    id: '3',
    action: 'Produkt erstellt',
    user: 'maria@company.de',
    product: 'Bio Cotton T-Shirt',
    timestamp: '2026-01-24 09:45:30',
    details: 'Neues Produkt angelegt',
  },
  {
    id: '4',
    action: 'Zertifikat aktualisiert',
    user: 'admin@company.de',
    product: 'Eco Sneaker Pro',
    timestamp: '2026-01-20 16:20:00',
    details: 'OEKO-TEX Zertifikat erneuert',
  },
];

const statusConfig = {
  compliant: {
    label: 'Konform',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success',
  },
  pending: {
    label: 'Ausstehend',
    icon: Clock,
    className: 'bg-warning/10 text-warning',
  },
  'non-compliant': {
    label: 'Nicht konform',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive',
  },
};

export function CompliancePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const stats = {
    total: complianceItems.length,
    compliant: complianceItems.filter((i) => i.status === 'compliant').length,
    pending: complianceItems.filter((i) => i.status === 'pending').length,
    nonCompliant: complianceItems.filter((i) => i.status === 'non-compliant').length,
  };

  const complianceRate = Math.round((stats.compliant / stats.total) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance & Audit</h1>
          <p className="text-muted-foreground">
            Prüfprotokolle und Konformitätsübersicht
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Report exportieren
          </Button>
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            EU-Registry Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Konformitätsrate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">{complianceRate}%</div>
              <Progress value={complianceRate} className="flex-1 h-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Konform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.compliant}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ausstehend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nicht konform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.nonCompliant}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Prüfprotokoll
          </TabsTrigger>
          <TabsTrigger value="audit">
            <FileText className="mr-2 h-4 w-4" />
            Audit-Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Konformitätsprüfung</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceItems.map((item) => {
                  const status = statusConfig[item.status as keyof typeof statusConfig];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${status.className}`}
                        >
                          <status.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{item.requirement}</p>
                          <p className="text-sm text-muted-foreground">{item.product}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {item.dueDate && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Fällig</p>
                            <p className="font-medium">
                              {new Date(item.dueDate).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        )}
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit-Log</CardTitle>
              <CardDescription>
                Vollständige Protokollierung aller Änderungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-4 rounded-lg border"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{entry.action}</p>
                        <span className="text-sm text-muted-foreground font-mono">
                          {entry.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.product} · {entry.details}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        von {entry.user}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
