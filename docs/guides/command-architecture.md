# Command Architecture & Migration Guide

This guide documents Vamsa's consolidated command surface and how to migrate from legacy script aliases.

## Canonical Commands

Use these as your default entry points:

- `bun run dev`
- `bun run quality`
- `bun run quality:ci`
- `bun run test`
- `bun run test:integration`
- `bun run test:e2e`
- `bun run test:focus --suite <unit|integration|e2e|visual|perf|mutation>`
- `bun run test:ci`
- `bun run cmd -- <domain> <action> [...args]`

## Test Command Migration

| Legacy command | Canonical replacement |
|---|---|
| `bun run test:unit` | `bun run test` |
| `bun run test:int` | `bun run test:integration --db sqlite` |
| `bun run test:int:sqlite` | `bun run test:integration --db sqlite` |
| `bun run test:int:postgres` | `bun run test:integration --db postgres` |
| `bun run test:perf` | `bun run test:focus --suite perf` |
| `bun run test:visual` | `bun run test:focus --suite visual` |
| `bun run test:visual:update` | `bun run test:focus --suite visual --update-snapshots` |
| `bun run test:mutation` | `bun run test:focus --suite mutation` |

Legacy aliases still work for compatibility, but emit deprecation warnings.

## Command Center Domains

Use `bun run cmd -- ...` for operational tasks:

- `db`: schema, migration, seed, backup, restore
- `docker`: production, development, e2e, backup workflows
- `docs`: prebuild/dev/build tasks
- `obs`: observability stack lifecycle
- `prod`: production process manager lifecycle (`bm2`)
- `load`: k6 scenario execution

### Examples

- `bun run cmd -- db migrate`
- `bun run cmd -- docker dev`
- `bun run cmd -- docs build`
- `bun run cmd -- obs up`
- `bun run cmd -- load run search`

## Deprecated Domain Alias

- `observability` domain alias is deprecated.
- Replace with `obs`.

Example:

- Old: `bun run cmd -- observability up`
- New: `bun run cmd -- obs up`

## CI Recommendation

Use canonical quality and test gates in CI:

- `bun run quality:ci`
- `bun run test:ci`
