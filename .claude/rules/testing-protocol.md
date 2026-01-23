---
description: Runtime verification protocol - always test actual behavior before committing, not just type/build checks
globs:
  - "apps/**/*.ts"
  - "apps/**/*.tsx"
  - "packages/**/*.ts"
---

# Testing Protocol

**NEVER commit code without testing runtime behavior first.**

## The Rule

**Compilation passing ≠ Code working**

TypeScript and build checks are necessary but NOT sufficient for testing fixes.

## Before Committing Code Changes

1. Make the code change
2. Run `bun run typecheck` and `bun run build`
3. **Start dev server (`bun run dev`)**
4. **Navigate to the affected page/feature**
5. **Verify the page loads successfully**
6. **Check server logs for errors (ECONNRESET, etc.)**
7. Only then commit and push

## Always Verify

- The actual symptom is fixed (page loads, no errors)
- Server logs show no errors
- The feature works as expected

## Why This Matters

This rule exists because code was committed that passed type checking and build but failed at runtime. The affected page wouldn't load, but this wasn't caught because only static checks were run before committing.
