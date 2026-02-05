/**
 * DPP ESPR Sections Component
 *
 * Shared component for rendering ESPR 2024/1781 mandatory fields across all 11 DPP templates.
 * Includes: Economic Operators, SVHC, Durability, Conformity, Safety, Registry.
 */

import { CSSProperties } from 'react';
import {
  Building2,
  AlertTriangle,
  Zap,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SafeHtml } from '@/components/ui/safe-html';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/product';

interface ESPRSectionsProps {
  product: Product;
  isFieldVisible: (field: string) => boolean;
  cardStyle: CSSProperties;
  headingStyle: CSSProperties;
  primaryColor: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function DPPESPRSections({
  product,
  isFieldVisible,
  cardStyle,
  headingStyle,
  primaryColor,
  t,
}: ESPRSectionsProps) {
  return (
    <>
      {renderEconomicOperators()}
      {renderSVHC()}
      {renderDurability()}
      {renderConformity()}
      {renderSafety()}
      {renderRegistry()}
    </>
  );

  // ============================================
  // Economic Operators Section
  // ============================================
  function renderEconomicOperators() {
    const hasImporter = isFieldVisible('importerName') && (product.importerName || product.importerEORI);
    const hasAuthRep = isFieldVisible('authorizedRepresentative') && product.authorizedRepresentative;
    const hasDppResp = isFieldVisible('dppResponsible') && product.dppResponsible;

    if (!hasImporter && !hasAuthRep && !hasDppResp) return null;

    return (
      <div key="economic-operators" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Economic Operators')}</h2>
            <p className="text-sm text-muted-foreground">{t('ESPR 2024/1781 Compliance')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Importer */}
          {hasImporter && (
            <div className="p-4 bg-muted/30 rounded-xl border border-primary/10">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" style={{ color: primaryColor }} />
                {t('EU Importer')}
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {product.importerName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('Name')}</p>
                    <p className="font-medium text-sm">{product.importerName}</p>
                  </div>
                )}
                {product.importerEORI && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('EORI Number')}</p>
                    <p className="font-mono text-sm">{product.importerEORI}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Authorized Representative */}
          {hasAuthRep && (
            <div className="p-4 bg-muted/30 rounded-xl border border-primary/10">
              <h4 className="font-semibold text-sm mb-3">{t('Authorized Representative')}</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('Name')}</p>
                  <p className="font-medium text-sm">{product.authorizedRepresentative.name}</p>
                </div>
                {product.authorizedRepresentative.email && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('Email')}</p>
                    <p className="text-sm">{product.authorizedRepresentative.email}</p>
                  </div>
                )}
                {product.authorizedRepresentative.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('Phone')}</p>
                    <p className="text-sm">{product.authorizedRepresentative.phone}</p>
                  </div>
                )}
                {product.authorizedRepresentative.address && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">{t('Address')}</p>
                    <p className="text-sm">{product.authorizedRepresentative.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DPP Responsible */}
          {hasDppResp && (
            <div className="p-4 bg-muted/30 rounded-xl border border-primary/10">
              <h4 className="font-semibold text-sm mb-3">{t('DPP Responsible Person')}</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('Name')}</p>
                  <p className="font-medium text-sm">{product.dppResponsible.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('Role')}</p>
                  <p className="text-sm">{product.dppResponsible.role}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('Email')}</p>
                  <p className="text-sm">{product.dppResponsible.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('Last Update')}</p>
                  <p className="text-sm">{new Date(product.dppResponsible.lastUpdate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // SVHC Section
  // ============================================
  function renderSVHC() {
    if (!isFieldVisible('substancesOfConcern') || !product.substancesOfConcern?.length) return null;

    return (
      <div key="svhc" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-orange-500/10">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Substances of Concern')}</h2>
            <p className="text-sm text-muted-foreground">{t('REACH SVHC / SCIP Declaration')}</p>
          </div>
        </div>

        <div className="space-y-3">
          {product.substancesOfConcern.map((substance, index) => (
            <div key={index} className="p-4 bg-muted/30 rounded-xl border border-orange-500/20">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{substance.name}</h4>
                {substance.svhcListed && (
                  <Badge variant="destructive" className="text-xs">SVHC</Badge>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('CAS Number')}</p>
                  <p className="font-mono">{substance.casNumber}</p>
                </div>
                {substance.ecNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('EC Number')}</p>
                    <p className="font-mono">{substance.ecNumber}</p>
                  </div>
                )}
                {substance.concentration !== undefined && substance.concentration !== null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('Concentration')}</p>
                    <p className="font-medium">{substance.concentration}%</p>
                  </div>
                )}
                {substance.scipId && (
                  <div className="sm:col-span-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('SCIP ID')}</p>
                    <p className="font-mono text-xs">{substance.scipId}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // Durability & Sustainability Section
  // ============================================
  function renderDurability() {
    const hasRecycled = isFieldVisible('recycledContentPercentage') && product.recycledContentPercentage !== undefined && product.recycledContentPercentage !== null;
    const hasEnergy = isFieldVisible('energyConsumptionKWh') && product.energyConsumptionKWh !== undefined && product.energyConsumptionKWh !== null;
    const hasDurability = isFieldVisible('durabilityYears') && product.durabilityYears !== undefined && product.durabilityYears !== null;
    const hasRepair = isFieldVisible('repairabilityScore') && product.repairabilityScore !== undefined && product.repairabilityScore !== null;
    const hasDisassembly = isFieldVisible('disassemblyInstructions') && product.disassemblyInstructions;
    const hasEOL = isFieldVisible('endOfLifeInstructions') && product.endOfLifeInstructions;

    if (!hasRecycled && !hasEnergy && !hasDurability && !hasRepair && !hasDisassembly && !hasEOL) return null;

    return (
      <div key="durability" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-green-500/10">
            <Zap className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Durability & Circularity')}</h2>
            <p className="text-sm text-muted-foreground">{t('ESPR Annex I Requirements')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Key Metrics Grid */}
          {(hasRecycled || hasEnergy || hasDurability || hasRepair) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {hasRecycled && (
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t('Recycled Content')}</p>
                  <p className="text-2xl font-bold" style={{ color: primaryColor }}>{product.recycledContentPercentage}%</p>
                </div>
              )}
              {hasEnergy && (
                <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl border border-yellow-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t('Energy Consumption')}</p>
                  <p className="text-2xl font-bold" style={{ color: primaryColor }}>{product.energyConsumptionKWh} <span className="text-sm font-normal">kWh/year</span></p>
                </div>
              )}
              {hasDurability && (
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t('Durability')}</p>
                  <p className="text-2xl font-bold" style={{ color: primaryColor }}>{product.durabilityYears} <span className="text-sm font-normal">{t('years')}</span></p>
                </div>
              )}
              {hasRepair && (
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl border border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t('Repairability Score')}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold" style={{ color: primaryColor }}>{product.repairabilityScore}</p>
                    <p className="text-sm text-muted-foreground">/100</p>
                  </div>
                  <div className="mt-2 h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all rounded-full"
                      style={{
                        width: `${product.repairabilityScore}%`,
                        background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}dd)`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disassembly Instructions */}
          {hasDisassembly && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t('Disassembly Instructions')}
              </h4>
              <SafeHtml html={product.disassemblyInstructions} className="text-sm text-muted-foreground prose prose-sm max-w-none" />
            </div>
          )}

          {/* End-of-Life Instructions */}
          {hasEOL && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t('End-of-Life Disposal')}
              </h4>
              <SafeHtml html={product.endOfLifeInstructions} className="text-sm text-muted-foreground prose prose-sm max-w-none" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // Conformity & Certifications Section
  // ============================================
  function renderConformity() {
    const hasCE = isFieldVisible('ceMarking') && product.ceMarking;
    const hasDoC = isFieldVisible('euDeclarationOfConformity') && product.euDeclarationOfConformity;
    const hasManual = isFieldVisible('userManualUrl') && product.userManualUrl;
    const hasReports = isFieldVisible('testReports') && product.testReports?.length;

    if (!hasCE && !hasDoC && !hasManual && !hasReports) return null;

    return (
      <div key="conformity" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Conformity & Certification')}</h2>
            <p className="text-sm text-muted-foreground">{t('EU Product Compliance')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* CE Marking */}
          {hasCE && (
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">{t('CE Marking Present')}</p>
                <p className="text-xs text-muted-foreground">{t('Product conforms to EU safety, health, and environmental requirements')}</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-lg font-bold px-4 py-2">CE</Badge>
            </div>
          )}

          {/* EU Declaration of Conformity */}
          {hasDoC && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="font-semibold text-sm mb-3">{t('EU Declaration of Conformity')}</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(product.euDeclarationOfConformity, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('View Declaration (PDF)')}
              </Button>
            </div>
          )}

          {/* User Manual */}
          {hasManual && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="font-semibold text-sm mb-3">{t('User Manual')}</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(product.userManualUrl, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('View User Manual (PDF)')}
              </Button>
            </div>
          )}

          {/* Test Reports */}
          {hasReports && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="font-semibold text-sm mb-3">{t('Test Reports')}</h4>
              <div className="space-y-2">
                {product.testReports!.map((url, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(url, '_blank')}
                    className="gap-2 w-full justify-start"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('Test Report {{number}}', { number: index + 1 })}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // Safety Information Section
  // ============================================
  function renderSafety() {
    if (!isFieldVisible('safetyInformation') || !product.safetyInformation) return null;

    return (
      <div key="safety" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Safety Information')}</h2>
            <p className="text-sm text-muted-foreground">{t('Important safety warnings and precautions')}</p>
          </div>
        </div>

        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <SafeHtml html={product.safetyInformation} className="text-sm prose prose-sm max-w-none" />
        </div>
      </div>
    );
  }

  // ============================================
  // DPP Registry Section
  // ============================================
  function renderRegistry() {
    if (!isFieldVisible('dppRegistryId') || !product.dppRegistryId) return null;

    return (
      <div key="registry" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-indigo-500/10">
            <Award className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('DPP Registry')}</h2>
            <p className="text-sm text-muted-foreground">{t('EU Digital Product Passport Registration')}</p>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 rounded-xl border border-indigo-500/20 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-4">
            <Award className="h-8 w-8 text-indigo-500" />
          </div>
          <p className="text-xs text-muted-foreground mb-2">{t('Registry ID')}</p>
          <p className="font-mono text-lg font-bold" style={{ color: primaryColor }}>{product.dppRegistryId}</p>
          <p className="text-xs text-muted-foreground mt-3">{t('Registered in EU DPP Registry per ESPR Article 8')}</p>
        </div>
      </div>
    );
  }
}
