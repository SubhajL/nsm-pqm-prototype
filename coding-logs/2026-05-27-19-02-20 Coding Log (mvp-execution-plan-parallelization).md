## Review (2026-06-01 17:36:36 +07) - staged diff /tmp/sprint4-staged.diff

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: feat/sprint4-dark-mode-polish
- Scope: staged diff at /tmp/sprint4-staged.diff, current staged files
- Commit Reviewed: a06f119
- Commands Run: git status --porcelain=v1; CODEX_ALLOW_LARGE_OUTPUT=1 git diff --staged --name-only; CODEX_ALLOW_LARGE_OUTPUT=1 git diff --staged --stat; rg targeted symbol searches; sed/nl targeted file reads; npx tsx contrast spot-checks; npx vitest run src/lib/theme-preference.test.ts src/theme/palette-contrast.test.ts

### Findings
CRITICAL
- No critical findings.

HIGH
- Theme changes are not shared between ThemeToggle and ThemedConfigProvider. useThemePreference owns local React state, so the toggle's click updates only the header instance while the provider instance keeps its old resolved theme until reload. Hoist one theme preference controller into context or a store and have both ConfigProvider and ThemeToggle consume the same state.

MEDIUM
- Shell inline styles bypass AntD tokens, so dark mode remains visually mixed even after provider state is fixed. Header, content, and sidebar/drawer use light COLORS values directly instead of theme tokens or a resolved light/dark shell token map.
- DARK_COLORS.primary is too low contrast on dark bgLayout for foreground use. Spot check: #3B5F8C on #0F141B is 2.82:1, below 3:1 icon/UI contrast and below 4.5:1 body text. Add a dark primary text token or lighten primary if it is intended as foreground.

LOW
- The new sidebar selected-row pseudo-element stacks with the existing global selected-row border. globals.css already applies a 3px selected border with !important, so the new ::before accent can render as a doubled/wider accent. Remove the old global border or explicitly zero it in the new rule.
- Persisted dark mode flashes light on first paint. Current initial server and client render both start light, so this is not a hydration warning today, but a no-flash fix should use server-readable cookie rendering or a pre-hydration html class/data-theme pattern with suppressHydrationWarning.
- _MIRROR_OK is a runtime-only const used for a type assertion and suppressed with an eslint disable. Replace it with a type-only Assert<T extends true> alias so no dead runtime symbol ships.

### Open Questions / Assumptions
- The review assumes Sprint 4's dark-mode acceptance includes the app shell, not only AntD components that do not have inline color styles.
- styled-jsx global in a client component is assumed valid for this repo; the staged build is reported green and an existing Gantt component already uses the same pattern.

### Recommended Tests / Validation
- Add a component/integration test for one shared theme state: clicking ThemeToggle changes ConfigProvider-derived AntD tokens without reload.
- Add a visual smoke or DOM style test for dark mode shell surfaces: header, content background, desktop sidebar, and mobile drawer.
- Extend contrast tests for DARK_COLORS.accentTealText on sidebarDark and for any primary foreground token chosen for dark surfaces.

### Rollout Notes
- Fix the shared state first; otherwise color polish can be masked by the provider not updating at all.
