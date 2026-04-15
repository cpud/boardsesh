'use client';

import React, { useState, useMemo, useCallback } from 'react';
import MuiTooltip from '@mui/material/Tooltip';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import { CssBarChart, GroupedBarChart } from '@/app/components/charts/css-bar-chart';
import type { CssBarChartBar, BarSegment, GroupedBar } from '@/app/components/charts/css-bar-chart';
import { EmptyState } from '@/app/components/ui/empty-state';
import { type AggregatedTimeframeType, aggregatedTimeframeOptions } from '../utils/profile-constants';
import type { LayoutPercentage, LayoutLegendEntry, VPointsTimelineData } from '../utils/chart-data-builders';
import VPointsChart from './v-points-chart';
import styles from '../profile-page.module.css';

export interface StatsSummaryProps {
  statisticsSummary: {
    totalAscents: number;
    layoutPercentages: LayoutPercentage[];
  };
  loadingProfileStats: boolean;
  aggregatedTimeframe: AggregatedTimeframeType;
  onAggregatedTimeframeChange: (value: AggregatedTimeframeType) => void;
  loadingAggregated: boolean;
  aggregatedStackedBars: { bars: CssBarChartBar[]; legendEntries: LayoutLegendEntry[] } | null;
  aggregatedFlashRedpointBars: GroupedBar[] | null;
  vPointsTimeline: VPointsTimelineData | null;
}

export default function StatsSummary({
  statisticsSummary,
  loadingProfileStats,
  aggregatedTimeframe,
  onAggregatedTimeframeChange,
  loadingAggregated,
  aggregatedStackedBars,
  aggregatedFlashRedpointBars,
  vPointsTimeline,
}: StatsSummaryProps) {
  const [hiddenLayouts, setHiddenLayouts] = useState<Set<string>>(new Set());

  const toggleLayout = useCallback((label: string) => {
    setHiddenLayouts((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const filteredBars = useMemo(() => {
    if (!aggregatedStackedBars || hiddenLayouts.size === 0) return aggregatedStackedBars?.bars ?? null;
    return aggregatedStackedBars.bars.map((bar) => ({
      ...bar,
      segments: bar.segments.map((seg: BarSegment) =>
        seg.label && hiddenLayouts.has(seg.label) ? { ...seg, value: 0 } : seg,
      ),
    }));
  }, [aggregatedStackedBars, hiddenLayouts]);

  if (loadingProfileStats || statisticsSummary.totalAscents === 0) {
    return null;
  }

  return (
    <MuiCard className={styles.statsCard}><CardContent>
      <div className={styles.statsSummaryHeader}>
        <div className={styles.totalAscentsContainer}>
          <Typography variant="body2" component="span" className={styles.totalAscentsLabel}>Distinct Climbs</Typography>
          <Typography variant="h4" component="h2" className={styles.totalAscentsValue}>
            {statisticsSummary.totalAscents}
          </Typography>
        </div>
      </div>

      {statisticsSummary.layoutPercentages.length > 1 && (
        <div className={styles.percentageBarContainer}>
          <div className={styles.percentageBar}>
            {statisticsSummary.layoutPercentages.map((layout) => (
              <MuiTooltip
                key={layout.layoutKey}
                title={`${layout.displayName}: ${layout.count} distinct climbs (${layout.percentage}%)`}
              >
                <div
                  className={styles.percentageSegment}
                  style={{ width: `${layout.percentage}%`, backgroundColor: layout.color }}
                >
                  {layout.percentage >= 15 && (
                    <span className={styles.percentageLabel}>
                      {layout.displayName.split(' ').slice(-1)[0]} {layout.percentage}%
                    </span>
                  )}
                </div>
              </MuiTooltip>
            ))}
          </div>
        </div>
      )}

      <div className={styles.gradeDistributionSection}>
        <div className={styles.gradeDistributionHeader}>
          <Typography variant="body2" component="span" fontWeight={600} className={styles.gradeDistributionTitle}>
            Grade Distribution
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={aggregatedTimeframe}
            onChange={(_, val) => { if (val) onAggregatedTimeframeChange(val as AggregatedTimeframeType); }}
            className={styles.gradeDistributionToggle}
          >
            {aggregatedTimeframeOptions.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        {loadingAggregated ? (
          <div className={styles.loadingStats}>
            <CircularProgress size={24} />
          </div>
        ) : filteredBars ? (
          <>
            <CssBarChart
              bars={filteredBars}
              height={160}
              mobileHeight={120}
              ariaLabel="Grade distribution across boards"
            />
            {aggregatedStackedBars && aggregatedStackedBars.legendEntries.length > 1 && (
              <div className={styles.stackedChartLegend}>
                {aggregatedStackedBars.legendEntries.map((entry) => {
                  const isHidden = hiddenLayouts.has(entry.label);
                  return (
                    <button
                      key={entry.label}
                      type="button"
                      className={styles.legendButton}
                      onClick={() => toggleLayout(entry.label)}
                      aria-pressed={!isHidden}
                    >
                      <div
                        className={styles.legendColor}
                        style={{
                          backgroundColor: entry.color,
                          opacity: isHidden ? 0.3 : 1,
                        }}
                      />
                      <Typography
                        variant="body2"
                        component="span"
                        className={styles.legendText}
                        style={{
                          opacity: isHidden ? 0.4 : 1,
                          textDecoration: isHidden ? 'line-through' : 'none',
                        }}
                      >
                        {entry.label}
                      </Typography>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <EmptyState description="No ascent data for this period" />
        )}
      </div>

      {aggregatedFlashRedpointBars && !loadingAggregated && (
        <div className={styles.flashRedpointSection}>
          <Typography variant="body2" component="span" fontWeight={600} className={styles.gradeDistributionTitle}>
            Flash vs Redpoint
          </Typography>
          <GroupedBarChart
            bars={aggregatedFlashRedpointBars}
            height={140}
            mobileHeight={100}
            gap={2}
            ariaLabel="Flash vs redpoint by grade"
          />
        </div>
      )}

      {vPointsTimeline && !loadingAggregated && (
        <div className={styles.flashRedpointSection}>
          <VPointsChart data={vPointsTimeline} />
        </div>
      )}
    </CardContent></MuiCard>
  );
}
