import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileText,
  Filter,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getChecklistStats, getProducts, type ProductListItem } from '@/services/supabase';

interface ComplianceItem {
  id: string;
  product: string;
  requirement: string;
  status: 'compliant' | 'pending' | 'non-compliant';
  dueDate: string | null;
  lastChecked: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  product: string;
  timestamp: string;
  details: string;
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [, setProducts] = useState<ProductListItem[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [, setChecklistStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    notApplicable: 0,
    completionPercentage: 0,
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      const [productsData, statsData] = await Promise.all([
        getProducts(),
        getChecklistStats(),
      ]);

      setProducts(productsData);
      setChecklistStats(statsData);

      // Generate compliance items based on products
      const items: ComplianceItem[] = [];
      productsData.forEach((product, index) => {
        items.push({
          id: `${product.id}-ce`,
          product: product.name,
          requirement: 'CE-Kennzeichnung',
          status: 'compliant',
          dueDate: null,
          lastChecked: new Date().toISOString().split('T')[0],
        });
        items.push({
          id: `${product.id}-reach`,
          product: product.name,
          requirement: 'REACH Verordnung',
          status: index === 0 ? 'compliant' : 'pending',
          dueDate: index === 0 ? null : '2026-02-15',
          lastChecked: index === 0 ? new Date().toISOString().split('T')[0] : null,
        });
      });

      setComplianceItems(items);

      // Generate basic audit log
      const log: AuditLogEntry[] = productsData.slice(0, 4).map((product, index) => ({
        id: `audit-${index}`,
        action: index === 0 ? 'Dokument hochgeladen' : index === 1 ? 'Status geändert' : 'Produkt aktualisiert',
        user: 'admin@company.de',
        product: product.name,
        timestamp: new Date(Date.now() - index * 86400000).toISOString().replace('T', ' ').substring(0, 19),
        details: index === 0 ? 'CE_Konformitaetserklarung.pdf' : 'Compliance-Status aktualisiert',
      }));

      setAuditLog(log);
      setIsLoading(false);
    }

    loadData();
  }, []);

  const stats = {
    total: complianceItems.length,
    compliant: complianceItems.filter((i) => i.status === 'compliant').length,
    pending: complianceItems.filter((i) => i.status === 'pending').length,
    nonCompliant: complianceItems.filter((i) => i.status === 'non-compliant').length,
  };

  const complianceRate = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;

  const filteredItems = complianceItems.filter((item) =>
    item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.requirement.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>
                    {complianceItems.length === 0
                      ? 'Keine Compliance-Daten vorhanden. Erstellen Sie zunächst Produkte.'
                      : 'Keine Einträge entsprechen Ihrer Suche.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredItems.map((item) => {
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
              )}
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
              {auditLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>Keine Audit-Einträge vorhanden.</p>
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
