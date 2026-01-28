import { useState } from 'react';
import {
  Building2,
  Palette,
  Users,
  Key,
  Save,
  Upload,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const users = [
  { id: '1', name: 'Admin User', email: 'admin@company.de', role: 'Admin', status: 'active' },
  { id: '2', name: 'Maria Schmidt', email: 'maria@company.de', role: 'Editor', status: 'active' },
  { id: '3', name: 'Thomas Müller', email: 'thomas@company.de', role: 'Viewer', status: 'active' },
  { id: '4', name: 'Julia Weber', email: 'julia@company.de', role: 'Editor', status: 'invited' },
];

const apiKeys = [
  { id: '1', name: 'ERP Integration', key: 'dpp_live_sk_...7x9a', created: '2024-06-15', lastUsed: '2026-01-27' },
  { id: '2', name: 'Shopify Connector', key: 'dpp_live_sk_...3b2c', created: '2024-09-01', lastUsed: '2026-01-25' },
];

export function SettingsPage({ tab = 'company' }: { tab?: string }) {
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihr Firmenprofil und Systemeinstellungen
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={tab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Firmenprofil
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Benutzer
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API-Keys
          </TabsTrigger>
        </TabsList>

        {/* Firmenprofil */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Unternehmensdaten</CardTitle>
              <CardDescription>
                Diese Informationen werden in Ihren DPPs angezeigt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Firmenname *</label>
                  <Input defaultValue="GreenStep GmbH" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">EORI-Nummer</label>
                  <Input defaultValue="DE123456789012345" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Straße & Hausnummer</label>
                  <Input defaultValue="Musterstraße 123" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PLZ & Stadt</label>
                  <Input defaultValue="10115 Berlin" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Land</label>
                  <Input defaultValue="Deutschland" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">USt-IdNr.</label>
                  <Input defaultValue="DE123456789" className="font-mono" />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-4">Verantwortliche Person (EU-Verordnung)</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input defaultValue="Dr. Anna Musterfrau" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-Mail</label>
                    <Input defaultValue="compliance@greenstep.de" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefon</label>
                    <Input defaultValue="+49 30 123456789" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Farben</CardTitle>
              <CardDescription>
                Passen Sie das Erscheinungsbild Ihrer DPPs an
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <label className="text-sm font-medium">Firmenlogo</label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Hochladen
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        PNG, SVG bis 2MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium">Primärfarbe</label>
                  <div className="flex gap-2">
                    <div className="h-10 w-10 rounded border" style={{ backgroundColor: '#3B82F6' }} />
                    <Input defaultValue="#3B82F6" className="font-mono" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Diese Farbe wird als Akzentfarbe in Ihren DPPs verwendet
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-4">Vorschau</h3>
                <div className="p-6 rounded-lg border bg-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded bg-primary flex items-center justify-center text-white font-bold">
                      G
                    </div>
                    <span className="font-semibold">GreenStep GmbH</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    So erscheint Ihr Branding in öffentlichen DPPs
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benutzer */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Benutzer & Rollen</CardTitle>
                  <CardDescription>
                    Verwalten Sie Zugriffsrechte für Ihr Team
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Benutzer einladen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === 'Admin' ? 'default' : 'secondary'}
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === 'active' ? 'outline' : 'secondary'}
                          className={user.status === 'active' ? 'text-success' : ''}
                        >
                          {user.status === 'active' ? 'Aktiv' : 'Eingeladen'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rollen</CardTitle>
              <CardDescription>Definierte Zugriffsrechte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">Admin</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vollzugriff auf alle Funktionen inkl. Einstellungen und Benutzerverwaltung
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">Editor</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kann Produkte und DPPs erstellen, bearbeiten und veröffentlichen
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">Viewer</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nur Lesezugriff auf Produkte und Berichte
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API-Keys */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API-Keys</CardTitle>
                  <CardDescription>
                    Verwalten Sie API-Schlüssel für Integrationen (ERP, Shop-Systeme)
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Neuer API-Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API-Key</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Zuletzt verwendet</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm">
                            {showApiKey === key.id ? 'dpp_live_sk_a1b2c3d4e5f6g7h8i9j0' : key.key}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowApiKey(showApiKey === key.id ? null : key.id)}
                          >
                            {showApiKey === key.id ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(key.created).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(key.lastUsed).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API-Dokumentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted font-mono text-sm">
                <p className="text-muted-foreground"># Basis-URL</p>
                <p>https://api.dpp-manager.de/v1</p>
                <p className="text-muted-foreground mt-4"># Authentifizierung</p>
                <p>Authorization: Bearer {'<API_KEY>'}</p>
              </div>
              <Button variant="outline" className="mt-4">
                Vollständige Dokumentation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
