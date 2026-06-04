/**
 * Single source of truth for chart colors.
 *
 * Values mirror `src/design-system/tokens.json` (primary / secondary /
 * tertiary / error and their hues used by primary-container etc.) and
 * are duplicated here as hex because ECharts cannot resolve CSS
 * variables. If a token changes there, change it here too.
 */
export const CHART_TOKENS = {
  primary: '#00288e',
  primaryContainer: '#1e40af',
  secondary: '#9d4300',
  secondaryContainer: '#fd761a',
  tertiary: '#003d28',
  tertiaryContainer: '#00f8a0',
  error: '#ba1a1a',
  accent: '#fbb340',
} as const

/** Default categorical palette for bar / donut charts (4 series). */
export const CHART_PALETTE: string[] = [
  CHART_TOKENS.primary,
  CHART_TOKENS.secondaryContainer,
  CHART_TOKENS.tertiary,
  CHART_TOKENS.error,
]

/** Extended palette for higher-cardinality categorical charts. */
export const CHART_PALETTE_EXTENDED: string[] = [
  CHART_TOKENS.primary,
  CHART_TOKENS.secondaryContainer,
  CHART_TOKENS.tertiary,
  CHART_TOKENS.error,
  CHART_TOKENS.primaryContainer,
  CHART_TOKENS.secondary,
  CHART_TOKENS.accent,
]

/** Single-series default (line charts, single-bar series). */
export const CHART_PRIMARY = CHART_TOKENS.primary

/**
 * Map a named semantic role to a chart hex. Used by StatCard icons.
 */
export const STAT_ICON_COLORS: Record<string, string> = {
  primary: CHART_TOKENS.primary,
  secondary: CHART_TOKENS.secondary,
  tertiary: CHART_TOKENS.tertiary,
  error: CHART_TOKENS.error,
}
