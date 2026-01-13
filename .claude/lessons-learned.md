# Lessons Learned

## Testing Protocol (2026-01-11)

**NEVER push code without testing runtime behavior first.**

### What Happened

- Fixed a query optimization issue in `listPersons` server function
- Ran `pnpm typecheck` and `pnpm build` ✓
- Pushed to remote WITHOUT actually testing the page loaded
- Assumed the fix worked based on compilation passing

### What Should Have Been Done

1. Make the code change
2. Run `pnpm typecheck` and `pnpm build`
3. **Start dev server (`pnpm dev`)**
4. **Use browser automation to navigate to the affected page**
5. **Verify the page loads successfully**
6. **Check server logs for errors (ECONNRESET, etc.)**
7. Only then commit and push

### The Rule

**Compilation passing ≠ Code working**

Always verify:

- The actual symptom is fixed (page loads, no errors)
- Server logs show no errors
- The feature works as expected

TypeScript and build checks are necessary but NOT sufficient for testing fixes.
