# Command Architecture & Migration Guide

This guide documents Vamsa's consolidated command surface and how to migrate from legacy script aliases.

## Canonical Commands

Use these as your default entry points:

- `pnpm dev`
- `pnpm quality`
- `pnpm quality:ci`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm test:focus --suite <unit|integration|e2e|visual|perf|mutation>`
- `pnpm test:ci`
- `pnpm cmd -- <domain> <action> [...args]`

## Test Command Migration

| Legacy command | Canonical replacement |
|---|---|
| `pnpm test:unit` | `pnpm test` |
| `pnpm test:int` | `pnpm test:integration --db sqlite` |
| `pnpm test:int:sqlite` | `pnpm test:integration --db sqlite` |
| `pnpm test:int:postgres` | `pnpm test:integration --db postgres` |
| `pnpm test:perf` | `pnpm test:focus --suite perf` |
| `pnpm test:visual` | `pnpm test:focus --suite visual` |
| `pnpm test:visual:update` | `pnpm test:focus --suite visual --update-snapshots` |
| `pnpm test:mutation` | `pnpm test:focus --suite mutation` |

Legacy aliases still work for compatibility, but emit deprecation warnings.

## Command Center Domains

Use `pnpm cmd -- ...` for operational tasks:

- `db`: schema, migration, seed, backup, restore
- `docker`: production, development, e2e, backup workflows
- `docs`: prebuild/dev/build tasks
- `obs`: observability stack lifecycle
- `prod`: production process manager lifecycle (`bm2`)
- `load`: k6 scenario execution

### Examples

- `pnpm cmd -- db migrate`
- `pnpm cmd -- docker dev`
- `pnpm cmd -- docs build`
- `pnpm cmd -- obs up`
- `pnpm cmd -- load run search`

## Deprecated Domain Alias

- `observability` domain alias is deprecated.
- Replace with `obs`.

Example:

- Old: `pnpm cmd -- observability up`
- New: `pnpm cmd -- obs up`

## CI Recommendation

Use canonical quality and test gates in CI:

- `pnpm quality:ci`
- `pnpm test:ci`
