# @vamsa/cli

`vamsa` is a command-line client for the Vamsa REST API (`/api/v1`). It runs on Bun.

```bash
pnpm --filter @vamsa/cli start          # or: bun apps/cli/src/index.ts
```

## Log in

```bash
echo "$PASSWORD" | vamsa login --url https://vamsa.example --email me@example.com --password-stdin
vamsa token create --name laptop --scope read     # long-lived token, shown once
vamsa login --profile ci --token vms_...          # store a token in a profile
```

Prompts only appear when both stdin and stdout are a TTY. Every prompt has a flag or env var that replaces it:

| Env             | Flag        |
| --------------- | ----------- |
| `VAMSA_URL`     | `--url`     |
| `VAMSA_TOKEN`   | (none)      |
| `VAMSA_PROFILE` | `--profile` |
| `VAMSA_DEBUG=1` | `--verbose` |

Config lives at `$XDG_CONFIG_HOME/vamsa/config.json` (or `~/.config/vamsa/config.json`) with mode 0600.

## Commands

```
vamsa                      home: profile, user, counts, next steps
vamsa login | logout | whoami
vamsa profile list | use <name> | remove <name>
vamsa token create | list | revoke <id>
vamsa person list [--q] [--limit] [--page] [--fields] [--full] | get | create | update | delete
vamsa relationship list --person <id> | get | create | delete
```

Every command takes `--help`.

## Output

- TOON by default and JSON with `--json`. Both go to stdout.
- Lists show 3-4 columns. Use `--fields a,b,c` to pick columns and `--full` to stop long text being truncated.
- Lists always print `total`. An empty list prints a `message` instead of nothing.
- Errors print an `error:` block (`code`, `message`, `hint`) to stdout. stderr is only used for `--verbose` logs.
- Exit codes: 0 ok, 1 error, 2 usage (unknown flag or command, missing argument).
- Most output ends with `help[]` lines that suggest the next command.
- Deletes are idempotent. Deleting something that doesn't exist succeeds with a note.

The CLI uses a small `fetch` wrapper instead of `packages/client`, because that client's Hono RPC types pull in the whole web server's module graph.
