/**
 * Shared common components. PR-A3 adds the bilingual UX primitives the
 * Phase B / C / D refactors will adopt; the pre-existing `KPICard` and
 * `StatusBadge` are domain-aware and untouched by PR-A3.
 */

export { EmptyState, type EmptyStateProps } from './EmptyState';
export { FilterBar, type FilterBarProps } from './FilterBar';
export {
  type FilterState,
  type FilterValue,
  hasAnyActiveFilter,
  resetFilters,
} from './filter-utils';
export { FormSection, type FormSectionProps } from './FormSection';
export { KPICard } from './KPICard';
export { LoadingSkeleton, type LoadingSkeletonProps } from './LoadingSkeleton';
export { SearchBar, type SearchBarProps } from './SearchBar';
export { caseInsensitiveIncludes } from './search-utils';
export { StatusIndicator, type StatusIndicatorProps } from './StatusIndicator';
export {
  STATUS_VALUES,
  type Status,
  type StatusIndicatorVisual,
  resolveStatusVisual,
} from './status-visual';
export { StatusBadge } from './StatusBadge';
