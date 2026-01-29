import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProduct, getCategories, getSuppliers, assignProductToSupplier } from '@/services/supabase';
import type { Category, Supplier } from '@/types/database';
import { useBranding } from '@/contexts/BrandingContext';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  Leaf,
  ShieldCheck,
  FileText,
  Truck,
  Save,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SUPPLIER_ROLES = [
  { value: 'manufacturer', label: 'Hersteller' },
  { value: 'importeur', label: 'Importeur' },
  { value: 'component', label: 'Komponenten-Lieferant' },
  { value: 'raw_material', label: 'Rohstoff-Lieferant' },
  { value: 'packaging', label: 'Verpackung' },
  { value: 'logistics', label: 'Logistik' },
];

const steps = [
  { id: 'stammdaten', title: 'Stammdaten', icon: Package },
  { id: 'nachhaltigkeit', title: 'Nachhaltigkeit', icon: Leaf },
  { id: 'konformitaet', title: 'Konformität', icon: ShieldCheck },
  { id: 'dokumente', title: 'Dokumente', icon: FileText },
  { id: 'lieferanten', title: 'Lieferanten', icon: Truck },
];

export function ProductFormPage() {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedMainCategory, setSelectedMainCategory] = useState('');

  // Lieferanten-State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSelfManufacturer, setIsSelfManufacturer] = useState(false);
  const [isSelfImporter, setIsSelfImporter] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Array<{
    supplier_id: string;
    role: string;
    is_primary: boolean;
    lead_time_days?: number;
  }>>([]);

  useEffect(() => {
    Promise.all([
      getCategories().then(setCategories),
      getSuppliers().then(setSuppliers),
    ]).catch(console.error).finally(() => setCategoriesLoading(false));
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    gtin: '',
    serialNumber: '',
    category: '',
    description: '',
    materials: [{ name: '', percentage: 0, recyclable: false, origin: '' }],
    recyclablePercentage: 0,
    recyclingInstructions: '',
    certifications: [] as string[],
  });

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addMaterial = () => {
    setFormData((prev) => ({
      ...prev,
      materials: [...prev.materials, { name: '', percentage: 0, recyclable: false, origin: '' }],
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const updateMaterial = (index: number, field: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const selectedSubcategories = categories
    .find(c => c.name === selectedMainCategory)
    ?.subcategories || [];

  const handleCategoryChange = (mainCat: string) => {
    setSelectedMainCategory(mainCat);
    updateField('category', mainCat);
  };

  const handleSubcategoryChange = (sub: string) => {
    updateField('category', `${selectedMainCategory} / ${sub}`);
  };

  // Lieferanten-Handler
  const addSupplierAssignment = () => {
    setSelectedSuppliers(prev => [...prev, {
      supplier_id: '',
      role: 'component',
      is_primary: false,
    }]);
  };

  const removeSupplierAssignment = (index: number) => {
    setSelectedSuppliers(prev => prev.filter((_, i) => i !== index));
  };

  const updateSupplierAssignment = (index: number, field: string, value: unknown) => {
    setSelectedSuppliers(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createProduct({
        name: formData.name,
        manufacturer: formData.manufacturer,
        gtin: formData.gtin,
        serialNumber: formData.serialNumber,
        category: formData.category,
        description: formData.description,
        materials: formData.materials,
        certifications: formData.certifications.map((name) => ({
          name,
          issuedBy: '',
          validUntil: '',
        })),
        recyclability: {
          recyclablePercentage: formData.recyclablePercentage,
          instructions: formData.recyclingInstructions,
          disposalMethods: [],
        },
      });
      if (result.success && result.id) {
        // Lieferanten zuordnen
        const supplierAssignments = selectedSuppliers.filter(s => s.supplier_id);
        for (const assignment of supplierAssignments) {
          await assignProductToSupplier({
            supplier_id: assignment.supplier_id,
            product_id: result.id,
            role: assignment.role as 'manufacturer' | 'importeur' | 'component' | 'raw_material' | 'packaging' | 'logistics',
            is_primary: assignment.is_primary,
            lead_time_days: assignment.lead_time_days,
          });
        }
        navigate('/products');
      } else if (result.success) {
        navigate('/products');
      } else {
        setSubmitError(result.error || 'Produkt konnte nicht gespeichert werden.');
      }
    } catch {
      setSubmitError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Neues Produkt anlegen</h1>
          <p className="text-muted-foreground">
            Erstellen Sie einen neuen Digital Product Passport
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    index < currentStep
                      ? 'border-primary bg-primary text-primary-foreground'
                      : index === currentStep
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground'
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Form Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = steps[currentStep].icon;
              return <StepIcon className="h-5 w-5" />;
            })()}
            {steps[currentStep].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 0 && 'Geben Sie die grundlegenden Produktinformationen ein'}
            {currentStep === 1 && 'Definieren Sie Materialien und Nachhaltigkeitsdaten'}
            {currentStep === 2 && 'Fügen Sie Zertifizierungen und Konformitätsdaten hinzu'}
            {currentStep === 3 && 'Laden Sie relevante Dokumente hoch'}
            {currentStep === 4 && 'Ordnen Sie Lieferanten und Wirtschaftsakteure zu'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Stammdaten */}
          {currentStep === 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Produktname *</label>
                <Input
                  placeholder="z.B. Eco Sneaker Pro"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hersteller *</label>
                <Input
                  placeholder="z.B. GreenStep GmbH"
                  value={formData.manufacturer}
                  onChange={(e) => updateField('manufacturer', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GTIN/EAN *</label>
                <Input
                  placeholder="z.B. 4012345678901"
                  value={formData.gtin}
                  onChange={(e) => updateField('gtin', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Seriennummer</label>
                <Input
                  placeholder="z.B. GSP-2024-001234"
                  value={formData.serialNumber}
                  onChange={(e) => updateField('serialNumber', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategorie *</label>
                <Select value={selectedMainCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={categoriesLoading ? 'Laden...' : 'Kategorie wählen...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => !c.parent_id).map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedMainCategory && selectedSubcategories.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unterkategorie</label>
                  <Select
                    value={formData.category.includes(' / ') ? formData.category.split(' / ')[1] : ''}
                    onValueChange={handleSubcategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unterkategorie wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubcategories.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Beschreibung</label>
                <textarea
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Produktbeschreibung..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Nachhaltigkeit */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Materialzusammensetzung</h3>
                  <Button variant="outline" size="sm" onClick={addMaterial}>
                    <Plus className="mr-2 h-4 w-4" />
                    Material hinzufügen
                  </Button>
                </div>
                <div className="space-y-4">
                  {formData.materials.map((material, index) => (
                    <div key={index} className="grid gap-4 md:grid-cols-5 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Material</label>
                        <Input
                          placeholder="z.B. Recyceltes PET"
                          value={material.name}
                          onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Anteil (%)</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={material.percentage}
                          onChange={(e) => updateMaterial(index, 'percentage', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Herkunft</label>
                        <Input
                          placeholder="z.B. Deutschland"
                          value={material.origin}
                          onChange={(e) => updateMaterial(index, 'origin', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Recycelbar</label>
                        <div className="flex items-center h-10">
                          <input
                            type="checkbox"
                            checked={material.recyclable}
                            onChange={(e) => updateMaterial(index, 'recyclable', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="ml-2 text-sm">Ja</span>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterial(index)}
                          disabled={formData.materials.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recycelbarkeit gesamt (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.recyclablePercentage}
                    onChange={(e) => updateField('recyclablePercentage', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Recycling-Hinweise</label>
                  <textarea
                    className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Entsorgungshinweise für den Verbraucher..."
                    value={formData.recyclingInstructions}
                    onChange={(e) => updateField('recyclingInstructions', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Konformität */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Zertifizierungen</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    'CE-Kennzeichnung',
                    'EU Ecolabel',
                    'OEKO-TEX Standard 100',
                    'Fair Trade',
                    'GRS (Global Recycled Standard)',
                    'GOTS (Global Organic Textile Standard)',
                    'FSC',
                    'Blauer Engel',
                  ].map((cert) => (
                    <label
                      key={cert}
                      className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.certifications.includes(cert)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              certifications: [...prev.certifications, cert],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              certifications: prev.certifications.filter((c) => c !== cert),
                            }));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="font-medium">{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.certifications.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-4">Ausgewählte Zertifizierungen</h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.map((cert) => (
                        <Badge key={cert} variant="secondary">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Dokumente */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed cursor-pointer hover:bg-muted/50">
                <div className="text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    Dateien hierher ziehen
                  </p>
                  <p className="text-xs text-muted-foreground">
                    oder klicken zum Hochladen
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    PDF, PNG, JPG bis 10MB
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Empfohlene Dokumente:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Konformitätserklärung (DoC)</li>
                  <li>• CE-Zertifikat</li>
                  <li>• Testberichte</li>
                  <li>• Materialdatenblätter</li>
                  <li>• LCA (Lebenszyklusanalyse)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 5: Lieferanten */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Eigenes Unternehmen */}
              <div>
                <h3 className="font-medium mb-4">Eigenes Unternehmen</h3>
                <div className="space-y-3 p-4 border rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelfManufacturer}
                      onChange={(e) => setIsSelfManufacturer(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="font-medium">
                      {branding.appName || 'Eigenes Unternehmen'} ist Hersteller dieses Produkts
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelfImporter}
                      onChange={(e) => setIsSelfImporter(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="font-medium">
                      {branding.appName || 'Eigenes Unternehmen'} ist Importeur dieses Produkts
                    </span>
                  </label>
                  {(isSelfManufacturer || isSelfImporter) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {isSelfManufacturer && (
                        <Badge variant="secondary">Hersteller (eigen)</Badge>
                      )}
                      {isSelfImporter && (
                        <Badge variant="secondary">Importeur (eigen)</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Externe Lieferanten */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Externe Lieferanten</h3>
                  <Button variant="outline" size="sm" onClick={addSupplierAssignment}>
                    <Plus className="mr-2 h-4 w-4" />
                    Lieferant hinzufügen
                  </Button>
                </div>

                {selectedSuppliers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Truck className="mx-auto h-10 w-10 opacity-30 mb-2" />
                    <p>Noch keine Lieferanten zugeordnet</p>
                    <p className="text-xs mt-1">
                      Klicken Sie auf "Lieferant hinzufügen" um externe Partner zuzuordnen
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedSuppliers.map((assignment, index) => (
                      <div key={index} className="grid gap-4 md:grid-cols-5 p-4 border rounded-lg">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">Lieferant</label>
                          <Select
                            value={assignment.supplier_id}
                            onValueChange={(v) => updateSupplierAssignment(index, 'supplier_id', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Lieferant wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} ({s.country})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Rolle</label>
                          <Select
                            value={assignment.role}
                            onValueChange={(v) => updateSupplierAssignment(index, 'role', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPLIER_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Lieferzeit (Tage)</label>
                          <Input
                            type="number"
                            min="0"
                            value={assignment.lead_time_days || ''}
                            onChange={(e) => updateSupplierAssignment(index, 'lead_time_days', parseInt(e.target.value) || undefined)}
                            placeholder="z.B. 14"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Optionen</label>
                          <div className="flex items-center gap-3 h-10">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assignment.is_primary}
                                onChange={(e) => updateSupplierAssignment(index, 'is_primary', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <span className="text-sm">Primär</span>
                            </label>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSupplierAssignment(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>

        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Als Entwurf speichern
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={nextStep}>
              Weiter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? 'Wird gespeichert…' : 'Produkt erstellen'}
            </Button>
          )}
        </div>
      </div>

      {submitError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {submitError}
        </div>
      )}
    </div>
  );
}
