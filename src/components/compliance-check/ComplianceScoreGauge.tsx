import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { RiskLevel } from '@/types/compliance-check';

interface ComplianceScoreGaugeProps {
  score: number;
  riskLevel: RiskLevel;
  animated?: boolean;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const RISK_LABELS: Record<RiskLevel, { en: string; de: string }> = {
  low: { en: 'Low Risk', de: 'Niedriges Risiko' },
  medium: { en: 'Medium Risk', de: 'Mittleres Risiko' },
  high: { en: 'High Risk', de: 'Hohes Risiko' },
  critical: { en: 'Critical Risk', de: 'Kritisches Risiko' },
};

const RISK_BADGE_CLASS: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function getScoreColor(score: number): string {
  if (score >= 81) return '#22c55e';
  if (score >= 61) return '#eab308';
  if (score >= 41) return '#f97316';
  return '#ef4444';
}

export function ComplianceScoreGauge({ score, riskLevel, animated = true }: ComplianceScoreGaugeProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'de' ? 'de' : 'en';
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const [dashOffset, setDashOffset] = useState(animated ? 282.74 : 282.74 * (1 - score / 100));

  // Arc parameters: radius 45, circumference for 240° arc
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // ~282.74
  const arcRatio = 240 / 360; // 0.667
  const arcLength = circumference * arcRatio; // ~188.5
  const targetOffset = arcLength * (1 - score / 100);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      setDashOffset(targetOffset);
      return;
    }

    // Animate the number
    const duration = 1200;
    const startTime = performance.now();
    const startScore = 0;

    function animateNumber(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(startScore + (score - startScore) * eased));
      setDashOffset(arcLength * (1 - (score * eased) / 100));
      if (progress < 1) {
        requestAnimationFrame(animateNumber);
      }
    }

    requestAnimationFrame(animateNumber);
  }, [score, animated, arcLength, targetOffset]);

  const color = getScoreColor(score);
  const riskColor = RISK_COLORS[riskLevel];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-40 h-32">
        <svg viewBox="0 0 100 70" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 60 A 45 45 0 1 1 90 60"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-muted/20"
          />
          {/* Score arc */}
          <path
            d="M 10 60 A 45 45 0 1 1 90 60"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${arcLength}`}
            strokeDashoffset={dashOffset}
            style={{ transition: animated ? 'none' : 'stroke-dashoffset 1.2s ease-out' }}
          />
          {/* Score number */}
          <text
            x="50"
            y="45"
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: '22px', fontWeight: 700 }}
          >
            {displayScore}
          </text>
          <text
            x="50"
            y="58"
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: '7px' }}
          >
            / 100
          </text>
        </svg>
      </div>
      <Badge className={RISK_BADGE_CLASS[riskLevel]} style={{ borderColor: riskColor }}>
        {RISK_LABELS[riskLevel][locale]}
      </Badge>
    </div>
  );
}
