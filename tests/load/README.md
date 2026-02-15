# Load Tests (k6)

Performance and load testing for Vamsa's critical API flows using [k6](https://k6.io).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Docker (no install needed)
docker run --rm -i grafana/k6 run - <tests/load/mixed.js
```

## Running Tests

Start the app first:

```bash
bun run dev          # development server
# or
bun run build && cd apps/web && bun run start  # production build
```

Then run load tests:

```bash
# Mixed realistic scenario (recommended first run)
bun run load-test

# Individual test scripts
bun run load-test:auth      # Login/logout throughput
bun run load-test:people    # Paginated people list
bun run load-test:search    # Search queries
bun run load-test:detail    # Person detail by ID
```

## Configuration

Environment variables:

| Variable        | Default                 | Description        |
| --------------- | ----------------------- | ------------------ |
| `BASE_URL`      | `http://localhost:3000` | Target server URL  |
| `TEST_EMAIL`    | `admin@vamsa.app`       | Test user email    |
| `TEST_PASSWORD` | `password`              | Test user password |

Example:

```bash
k6 run --env BASE_URL=http://staging.vamsa.app tests/load/mixed.js
```

## Test Scripts

| Script             | What it tests                                             | Thresholds   |
| ------------------ | --------------------------------------------------------- | ------------ |
| `auth.js`          | Login/logout cycle under concurrency                      | p95 < 800ms  |
| `people-list.js`   | Paginated list with varying sizes and sort                | p95 < 600ms  |
| `search.js`        | Search with different query complexities                  | p95 < 800ms  |
| `person-detail.js` | Single person fetch by ID                                 | p95 < 400ms  |
| `mixed.js`         | Weighted mix: 50% browse, 25% search, 20% detail, 5% auth | p95 < varies |

All tests share: **p95 < 500ms** overall, **error rate < 1%**.

## Load Profile

Default stages (configurable in `config.js`):

```
  VUs
  20 |           ┌──────────────┐
  10 |     ┌─────┘              └──────┐
   5 |  ┌──┘                           └──┐
   0 |──┘                                 └──
     0s  10s     20s          50s  60s   80s
```

## Output

k6 prints a summary including:

- **http_req_duration** — latency percentiles (p50, p90, p95, p99)
- **http_reqs** — total requests and requests/sec
- **http_req_failed** — error rate
- Custom metrics per scenario (login_duration, search_duration, etc.)

For JSON output (useful for CI):

```bash
k6 run --out json=results.json tests/load/mixed.js
```
