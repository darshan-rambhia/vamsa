# @vamsa/cli

`vamsa` is a command-line client for a Vamsa server's REST API (`/api/v1`). It's built for people and for AI agents: output is compact, every error says what to run next, and nothing prompts when there's no terminal.

## Install

**Binary.** Download `vamsa-<platform>` from a [`cli-v*` release](../../releases) (darwin-arm64, darwin-x64, linux-x64, linux-arm64), check it against `SHA256SUMS`, then:

```bash
chmod +x vamsa-darwin-arm64 && mv vamsa-darwin-arm64 ~/.local/bin/vamsa
vamsa --version
```

**From source (Bun).**

```bash
pnpm install
bun apps/cli/src/index.ts           # or: pnpm --filter @vamsa/cli start
pnpm --filter @vamsa/cli build:bin  # standalone binaries in apps/cli/dist/
```

## Log in

```bash
vamsa login --url https://vamsa.example --email me@example.com          # prompts for the password on a TTY
echo "$PASSWORD" | vamsa login --url https://vamsa.example --email me@example.com --password-stdin
vamsa token create --name laptop --scope read                           # long-lived token, shown once
vamsa login --profile ci --token vms_...                                # store a token in another profile
vamsa                                                                   # home view: who, where, counts, next steps
```

Token scopes cap what a token can do: `read` (VIEWER), `write` (MEMBER), `admin` (ADMIN). A token never gets more than its user's own role.

Every prompt has a flag or env var that replaces it:

| Env             | Flag        | Meaning                                    |
| --------------- | ----------- | ------------------------------------------ |
| `VAMSA_URL`     | `--url`     | Server URL                                 |
| `VAMSA_TOKEN`   |             | Session token or `vms_` token (no profile) |
| `VAMSA_PROFILE` | `--profile` | Profile name                               |
| `VAMSA_DEBUG=1` | `--verbose` | Request logs on stderr                     |

URLs without a scheme default to `https://`. Plain `http://` is refused except for `localhost`, `127.0.0.1` and `[::1]`. A profile's saved token is only sent to the server it was issued for: pointing `--url` or `VAMSA_URL` at another server gives a `token_url_mismatch` error instead.

Profiles live in `$XDG_CONFIG_HOME/vamsa/config.json` (default `~/.config/vamsa/config.json`), with file mode 0600.

## Commands

```
vamsa                                   home view
vamsa login | logout | whoami
vamsa profile list | use <name> | remove <name>
vamsa token create | list | revoke <id>
vamsa person list [--q] [--limit] [--page] | get | create | update | delete
vamsa relationship list --person <id> | get | create | delete
vamsa event list --person <id> | create | update | delete | participant add|remove
vamsa place list --q|--person | get | hierarchy | children | create | update | delete | link | unlink
vamsa source list | get | create | update | delete | cite | citation
vamsa gedcom validate <file> | import <file> [--dry-run] | export [-o file|-] [--zip]
vamsa bulk add <file.json|csv> --type person|relationship [--dry-run]
vamsa admin user list|get|update|delete|unlock|link|available
vamsa admin invite list|create|revoke|resend|delete
vamsa admin settings get | set key=value ...
vamsa admin backup create|list|imports|validate|preview   (restore: not available yet)
vamsa admin audit [--since 7d] [--user <email>] [--action DELETE] [--entity PERSON]
vamsa setup [--dir] [--hook]            install the agent skill
vamsa --version                         version (any position; honours --json)
vamsa completion zsh|bash               shell completion script
```

Every command takes `--help`.

## Output rules

- TOON by default, JSON with `--json`. Both go to stdout.
- Lists show 3-4 columns. Use `--fields a,b,c` to pick columns and `--full` to stop long text being truncated (truncated text shows how much was cut).
- Lists always print `total`. An empty list prints a `message` instead of nothing.
- Errors print an `error:` block (`code`, `message`, `hint`) to stdout. stderr is only used for `--verbose` logs.
- Exit codes: `0` ok, `1` error, `2` usage (unknown flag or command, missing argument, confirmation needed).
- Most output ends with `help[]` lines that suggest the next command, with `<id>` placeholders.
- Deletes, revokes and unlinks are idempotent. If the record is already gone, the command succeeds with a `note`.
- Destructive admin actions ask for confirmation on a TTY. Without a TTY they need `--yes`.
- `bulk add` skips rows that already exist, so re-running a file is safe.

## For agents

```bash
vamsa setup          # writes ~/.claude/skills/vamsa/SKILL.md, generated from the command tree;
                     # re-running updates it, unless you edited it (then it needs --force)
vamsa setup --hook   # also prints a Claude Code SessionStart hook that shows the `vamsa` dashboard
```

Give agents a `read` token unless they need to edit: `VAMSA_TOKEN=vms_... vamsa person list`.

## Shell completion

```bash
vamsa completion zsh > "${fpath[1]}/_vamsa"
vamsa completion bash > ~/.local/share/bash-completion/completions/vamsa
```

## Development

```bash
pnpm --filter @vamsa/cli test        # vitest
pnpm --filter @vamsa/cli typecheck
```

The code is split into `src/index.ts` (entry), `src/main.ts` (dispatch, strict flags, help), `src/commands/**` and `src/lib/{config,client,output,errors,...}.ts`. Commands are defined with citty, but dispatch is custom because citty accepts unknown flags silently.

The CLI uses a small `fetch` wrapper instead of `packages/client`, because that client's Hono RPC types pull in the whole web server's module graph. Enum values are mirrored in `src/lib/enums.ts`, so the binary doesn't bundle zod.

Releases: bump `version` in `apps/cli/package.json`, then push a tag `cli-v<version>`. `.github/workflows/cli-release.yml` tests the CLI, builds the four binaries, smoke-tests each one on a matching runner, and attaches them with `SHA256SUMS` to the release.
