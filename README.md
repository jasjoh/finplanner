# FinPlanner

A full-stack web application for aligning income, spending, and investment strategy with near-term and long-term financial goals.

## Prerequisites (Phase 0)

Before running the app, ensure the following are installed and documented:

### Node.js and pnpm

- **Node.js:** LTS version (see [.nvmrc](.nvmrc); currently Node 20). Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm): `nvm install` or `fnm use`.
- **Package manager:** [pnpm](https://pnpm.io/). Install with: `npm install -g pnpm` or `corepack enable && corepack prepare pnpm@latest --activate`.

### PostgreSQL

- **PostgreSQL** must be installed and running locally.
- **Default database URL:** `postgresql://localhost:5432/finplanner`
- Create the database before running migrations (Phase 1):  
  `createdb finplanner` or via psql: `CREATE DATABASE finplanner;`

## Project phases

Implementation follows [docs/project-phases.md](docs/project-phases.md). Phase 0 (prerequisites) is complete when Node, pnpm, and PostgreSQL are in place and the implementation decisions are accepted.

## References

- [Product Requirements](docs/product-requirements.md)
- [Technical Design](docs/technical-design.md)
- [Implementation Plan](docs/implementation-plan.md)
