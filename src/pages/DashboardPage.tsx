import { Link } from 'react-router-dom';
import {
  Package,
  FileWarning,
  AlertTriangle,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  QrCode,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Demo-Daten
const stats = [
  {
    title: 'Aktive Produkte',
    value: '127',
    change: '+12 diesen Monat',
    icon: Package,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Ausstehende DoCs',
    value: '8',
    change: '3 kritisch',
    icon: FileWarning,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    title: 'Ablaufende Zertifikate',
    value: '5',
    change: 'nächste 30 Tage',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  {
    title: 'Konformitätsrate',
    value: '94%',
    change: '+2% vs. Vormonat',
    icon: TrendingUp,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
];

const upcomingDeadlines = [
  {
    product: 'Eco Sneaker Pro',
    type: 'OEKO-TEX Zertifikat',
    date: '15.02.2026',
    daysLeft: 19,
    status: 'warning',
  },
  {
    product: 'Solar Powerbank 20000',
    type: 'CE-Kennzeichnung',
    date: '28.02.2026',
    daysLeft: 32,
    status: 'normal',
  },
  {
    product: 'Bio Cotton T-Shirt',
    type: 'EU Ecolabel',
    date: '01.03.2026',
    daysLeft: 33,
    status: 'normal',
  },
  {
    product: 'Recycled Backpack',
    type: 'GRS Zertifikat',
    date: '05.02.2026',
    daysLeft: 9,
    status: 'critical',
  },
];

const recentProducts = [
  {
    id: '1',
    name: 'Eco Sneaker Pro',
    gtin: '4012345678901',
    status: 'live',
    compliance: 95,
    lastUpdated: 'vor 2 Stunden',
  },
  {
    id: '2',
    name: 'Solar Powerbank 20000',
    gtin: '4098765432101',
    status: 'live',
    compliance: 88,
    lastUpdated: 'vor 5 Stunden',
  },
  {
    id: '3',
    name: 'Bio Cotton T-Shirt',
    gtin: '4056789012345',
    status: 'draft',
    compliance: 72,
    lastUpdated: 'gestern',
  },
  {
    id: '4',
    name: 'Recycled Backpack',
    gtin: '4034567890123',
    status: 'review',
    compliance: 60,
    lastUpdated: 'vor 3 Tagen',
  },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Übersicht über Ihre Produkte und Compliance-Status
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/dpp/qr-generator">
              <QrCode className="mr-2 h-4 w-4" />
              QR generieren
            </Link>
          </Button>
          <Button asChild>
            <Link to="/products/new">
              <Package className="mr-2 h-4 w-4" />
              Neues Produkt
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Nächste Fristen
                </CardTitle>
                <CardDescription>
                  Zertifikate und Dokumente mit Ablaufdatum
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/documents/tracker">
                  Alle anzeigen
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{deadline.product}</p>
                    <p className="text-sm text-muted-foreground">{deadline.type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{deadline.date}</p>
                      <p
                        className={`text-xs ${
                          deadline.status === 'critical'
                            ? 'text-destructive'
                            : deadline.status === 'warning'
                              ? 'text-warning'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {deadline.daysLeft} Tage
                      </p>
                    </div>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        deadline.status === 'critical'
                          ? 'bg-destructive'
                          : deadline.status === 'warning'
                            ? 'bg-warning'
                            : 'bg-success'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  Aktuelle Produkte
                </CardTitle>
                <CardDescription>Zuletzt bearbeitete Produkte</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/products">
                  Alle anzeigen
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{product.name}</p>
                      <Badge
                        variant={
                          product.status === 'live'
                            ? 'default'
                            : product.status === 'draft'
                              ? 'secondary'
                              : 'outline'
                        }
                        className="text-xs"
                      >
                        {product.status === 'live' && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {product.status === 'draft' && <Clock className="mr-1 h-3 w-3" />}
                        {product.status}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      GTIN: {product.gtin}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span>Konformität</span>
                        <span
                          className={
                            product.compliance >= 90
                              ? 'text-success'
                              : product.compliance >= 70
                                ? 'text-warning'
                                : 'text-destructive'
                          }
                        >
                          {product.compliance}%
                        </span>
                      </div>
                      <Progress
                        value={product.compliance}
                        className="h-1.5"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {product.lastUpdated}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
          <CardDescription>Häufig verwendete Funktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link to="/products/new">
                <Package className="h-6 w-6" />
                <span>Produkt anlegen</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link to="/documents/upload">
                <FileWarning className="h-6 w-6" />
                <span>Dokument hochladen</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link to="/dpp/qr-generator">
                <QrCode className="h-6 w-6" />
                <span>QR-Code erstellen</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link to="/compliance/export">
                <TrendingUp className="h-6 w-6" />
                <span>Report exportieren</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
