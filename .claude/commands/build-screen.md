Build a new screen for the PQM prototype: $ARGUMENTS

Steps:
1. Read the IMPLEMENTATION_PLAN.md to understand the screen's requirements
2. Fetch the Stitch HTML for reference: use `mcp__stitch__get_screen` with project ID `5556082433200311458` and the screen ID from the plan
3. Read the relevant CLAUDE.md in the target directory
4. Create/update the JSON mock data file in `src/data/` if not exists
5. Create the API route in `src/app/api/` if not exists
6. Create the React Query hook in `src/hooks/` if not exists
7. Create any needed shared components in `src/components/`
8. Create the page component in the correct `src/app/(dashboard)/` route
9. Run `npm run typecheck` to verify no type errors
10. Verify the page renders by checking dev server

Use Ant Design components, ECharts for charts, and follow the Thai-first bilingual label pattern.
