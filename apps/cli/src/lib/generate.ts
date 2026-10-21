/**
 * Generated artifacts: shell completion scripts and the agent skill file.
 * Both are derived from the command tree so they never drift from the CLI.
 */

import { leaves, walk } from "./tree";
import type { AnyCommand } from "./command";
import type { CommandInfo } from "./tree";

const GLOBAL_FLAGS = [
  "--json",
  "--verbose",
  "--profile",
  "--url",
  "--help",
  "--version",
];

function flagWords(c: CommandInfo): Array<string> {
  return [
    ...c.flags.flatMap((f) => [
      `--${f.name}`,
      ...f.alias.map((a) => (a.length === 1 ? `-${a}` : `--${a}`)),
    ]),
    ...GLOBAL_FLAGS,
  ];
}

/** Shell `case` arms: path -> words. Works in bash 3 (macOS) and zsh. */
function caseArms(root: AnyCommand, pick: (c: CommandInfo) => Array<string>) {
  return walk(root)
    .map((c) => `    "${c.path.join(" ")}") echo "${pick(c).join(" ")}" ;;`)
    .join("\n");
}

function lookupFunctions(root: AnyCommand): string {
  return `_vamsa_subs() {
  case "$1" in
${caseArms(root, (c) => c.subcommands)}
  esac
}
_vamsa_flags() {
  case "$1" in
${caseArms(root, flagWords)}
  esac
}
_vamsa_is_cmd() {
  case "$1" in
${walk(root)
  .filter((c) => c.path.length)
  .map((c) => `    "${c.path.join(" ")}") return 0 ;;`)
  .join("\n")}
  esac
  return 1
}`;
}

export function bashCompletion(root: AnyCommand): string {
  return `# vamsa bash completion. Install: vamsa completion bash > ~/.local/share/bash-completion/completions/vamsa
${lookupFunctions(root)}
_vamsa() {
  local cur="\${COMP_WORDS[COMP_CWORD]}" cmdpath="" w i next
  for ((i = 1; i < COMP_CWORD; i++)); do
    w="\${COMP_WORDS[i]}"
    [[ "$w" == -* ]] && continue
    next="\${cmdpath:+$cmdpath }$w"
    _vamsa_is_cmd "$next" && cmdpath="$next"
  done
  if [[ "$cur" == -* ]]; then
    COMPREPLY=($(compgen -W "$(_vamsa_flags "$cmdpath")" -- "$cur"))
  else
    COMPREPLY=($(compgen -W "$(_vamsa_subs "$cmdpath")" -- "$cur"))
  fi
}
complete -o default -F _vamsa vamsa
`;
}

export function zshCompletion(root: AnyCommand): string {
  return `#compdef vamsa
# vamsa zsh completion. Install: vamsa completion zsh > "\${fpath[1]}/_vamsa" (then restart the shell)
${lookupFunctions(root)}
_vamsa() {
  local cmdpath="" w i next
  for ((i = 2; i < CURRENT; i++)); do
    w="\${words[i]}"
    [[ "$w" == -* ]] && continue
    next="\${cmdpath:+$cmdpath }$w"
    _vamsa_is_cmd "$next" && cmdpath="$next"
  done
  if [[ "\${words[CURRENT]}" == -* ]]; then
    compadd -- \${=$(_vamsa_flags "$cmdpath")}
  else
    local subs="$(_vamsa_subs "$cmdpath")"
    if [[ -n "$subs" ]]; then compadd -- \${=subs}; else _files; fi
  fi
}
compdef _vamsa vamsa
`;
}

function usage(c: CommandInfo): string {
  const pos = c.positionals.map((p) =>
    p.variadic ? `<${p.name}...>` : `<${p.name}>`
  );
  return ["vamsa", ...c.path, ...pos].join(" ");
}

function flagSummary(c: CommandInfo): string {
  if (!c.flags.length) return "";
  return c.flags
    .map((f) =>
      f.boolean ? `--${f.name}` : `--${f.name} <${f.hint ?? "value"}>`
    )
    .join(" ");
}

/** SKILL.md for agents (Claude Code / Agent Skills format). */
export function skillMarkdown(root: AnyCommand): string {
  const groups = new Map<string, Array<CommandInfo>>();
  for (const c of leaves(root)) {
    const key = c.path.length > 1 ? c.path[0] : "account";
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const reference = [...groups.entries()]
    .map(([name, cmds]) => {
      const rows = cmds
        .map((c) => {
          const flags = flagSummary(c);
          return `- \`${usage(c)}\` - ${c.description}${flags ? `\n  flags: \`${flags}\`` : ""}`;
        })
        .join("\n");
      return `### ${name}\n\n${rows}`;
    })
    .join("\n\n");

  return `---
name: vamsa
description: Read and edit a Vamsa family tree (people, relationships, events, places, sources, GEDCOM, admin) with the \`vamsa\` CLI. Use when the user asks about their family tree, relatives, genealogy records, or administering a Vamsa instance.
---

# Vamsa CLI

\`vamsa\` talks to a Vamsa server's REST API. Run \`vamsa\` with no arguments first: it prints the current profile, server, user and record counts, plus suggested next commands.

## Rules for using it

- Output is TOON by default (compact, YAML-like tables). Add \`--json\` when you need to parse it.
- Lists print \`total\` and an explicit \`message\` when empty. Use \`--fields a,b,c\` for columns and \`--full\` to see untruncated text.
- Errors print an \`error:\` block with \`code\`, \`message\` and a \`hint\` holding the next command to try. Exit codes: 0 ok, 1 error, 2 usage error.
- Never prompts when not on a TTY. Pass values as flags: \`--email\`, \`--password-stdin\`, \`--yes\` for destructive admin actions.
- Deletes are idempotent: deleting something already gone succeeds with a \`note\`.
- Follow the \`help[]\` lines at the end of each output; they suggest concrete next commands (replace \`<id>\` placeholders).
- Every command accepts \`--help\`.

## Auth

- Interactive: \`vamsa login --url <url> --email <email>\`
- Scripted: \`echo "$PW" | vamsa login --url <url> --email <email> --password-stdin\`
- Long-lived token: \`vamsa token create --name agent --scope read\`, then \`VAMSA_TOKEN=vms_... vamsa ...\` or \`vamsa login --token vms_...\`
- Prefer a \`read\` scoped token for agents unless edits are requested.

## Command reference

${reference}
`;
}

/** Claude Code settings.json snippet: show the vamsa dashboard at session start. */
export function sessionHookSnippet(bin: string) {
  return {
    hooks: {
      SessionStart: [
        {
          hooks: [{ type: "command", command: `${bin} 2>/dev/null || true` }],
        },
      ],
    },
  };
}
