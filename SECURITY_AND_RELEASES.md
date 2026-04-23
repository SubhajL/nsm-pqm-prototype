# Security and releases

## Current release model

This repository uses:

- **GitHub** for source control and protected-branch policy
- **GitHub Actions** for CI checks only
- **Vercel native Git integration** for preview and production deployments

## Protected branch

The `main` branch is protected with the following rules:

- Pull requests are required before merging
- Branches must be up to date before merging
- Required checks must pass before merging:
  - `Preview checks`
  - `Vercel`
- Conversation resolution is required before merge
- Force pushes are disabled
- Branch deletion is disabled
- Admins are also subject to these protections

## Why this exists

These protections reduce the risk of:

- accidental direct pushes to production
- broken builds landing on `main`
- unreviewed changes bypassing CI and deployment checks
- unstable code reaching the live Vercel site

## Deployment flow

### Preview flow

1. Create a branch from `main`
2. Push the branch to GitHub
3. Open a pull request
4. GitHub Actions runs `Preview checks`
5. Vercel creates a preview deployment automatically
6. Review the preview URL before merging

### Production flow

1. A pull request is opened against `main`
2. Required checks pass
3. The pull request is merged into `main`
4. Vercel deploys the latest `main` commit to production

## Current production URL

- `https://nsm-pqm-prototype.vercel.app`

## Current CI and deployment checks

### GitHub Actions

- `Preview checks`
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Vercel

- `Vercel`
  - native Git integration deployment status
  - preview deploys on PR updates
  - production deploys on `main`

## Operational notes

- The Vercel project is configured to use **Node.js 22.x**
- The repository uses native Vercel Git integration instead of a GitHub Actions deploy workflow
- `.vercelignore` excludes local-only build artifacts and data folders from CLI deploy uploads

## If the deployment model changes later

Before introducing a GitHub Actions deploy workflow:

1. Decide whether native Vercel Git integration should remain enabled
2. Avoid running both deployment models at the same time
3. Revisit branch protection checks if the deployment status context names change
