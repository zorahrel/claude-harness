---
name: spec
description: Full spec-driven development — propose, approve, build, test, verify, review
---

Complete spec-driven workflow with visual verification.

## Step 0: Project Check
- If NO `openspec/`: run `openspec init`, copy performance spec template, set up playwright config with `video: "on"` and `slowMo: 300`
- If NO `tests/`: create `tests/e2e/` directory structure
- If NO `.gitignore`: create one with node_modules, test-results/artifacts, .env

## Step 1: Classify & Branch
Evaluate the request:
- **Trivial** (typo, one-liner, config fix) → skip to Step 7, fix directly on current branch
- **Bug/hotfix** → create `fix/<slug>` branch on current repo, abbreviated flow (no full spec, just describe + fix + test)
- **Feature/refactor** → create `feat/<slug>` branch **in an isolated worktree**, full flow below
- Ask user if classification is unclear

### Worktree Isolation (feature/refactor only)
For non-trivial work, create an isolated worktree so the main working tree stays clean:
```bash
git worktree add .claude/worktrees/feat-<slug> -b feat/<slug>
```
- Switch session CWD to the worktree
- All subsequent steps run inside the worktree
- Bugfix branches stay in the current repo (no worktree needed)

## Step 2: Spec Proposal
Propose change via `/gsd:do $ARGUMENTS`:
- proposal.md (what and why)
- specs/ with GIVEN/WHEN/THEN acceptance criteria
- design.md (how — technical approach)
- tasks.md (implementation checklist)

## Step 3: ⏸️ Human Approval Gate
Show acceptance criteria clearly. STOP and WAIT for explicit approval.
- "ok" / "approved" → proceed
- "change X" → update spec, re-show
- "no" → discard

Track approval: note in change's .openspec.yaml

## Step 4: Build
Implement ONLY what's in the approved spec. Nothing more.

## Step 5: Test + Video
Run `npx playwright test` — records video + screenshots automatically.
- If tests fail: diagnose, fix, re-test (max 3 iterations)
- Take explicit screenshots at key moments (BEFORE/AFTER states)

## Step 6: Verify
- Check ALL acceptance criteria are covered by passing tests
- Run performance checks: CLS < 0.1, load < 3s, no layout shift
- Generate missing tests for uncovered AC
- Visual stability: screenshot diff must show < 2% pixel change

## Step 7: AI Visual Review
Analyze screenshots yourself (you ARE a vision model):
- Layout: misalignment, overlap, truncated text, inconsistent spacing
- Visual: wrong colors, flash, broken elements, rendering issues
- State: "Offline" when connected, stuck spinners, wrong empty states
- UX: contrast, clickable elements, responsive issues
- BEFORE/AFTER: unexpected changes, layout shift
Save findings in `test-results/ai-review.json`
If issues found → fix them → re-test → re-review

## Step 8: Security & Quality Pre-flight
Before committing, check:
- `npm audit` — no high/critical vulnerabilities introduced
- No hardcoded secrets, API keys, or tokens in diff
- No `console.log` left in production code (unless intentional)
- No TODO/FIXME without linked issue
- If touching auth/permissions: extra scrutiny on the logic

## Step 9: Report
Show summary:
- Tests: X passed, Y failed
- AI Review: pass/review/fail with findings
- Performance: CLS, load time, stability
- Security: clean / warnings
- Files changed: `git diff --staged --stat`

## Step 10: Prepare Commit
- `git add` relevant files
- Show proposed commit message (conventional commits: feat/fix/refactor)
- Show `git diff --staged --stat`

## Step 11: ⏸️ Human Approval for Commit
WAIT for explicit "ok" / "commit" / "go" / "push"
- If user says "push" → commit AND push
- If user says "ok" → commit only

## Step 12: Commit + Push + PR
- Commit with approved message
- Push branch to remote: `git push -u origin <branch>`
- Create PR via `gh pr create --title "<conventional title>" --body "<summary from Step 9>"`
- Show PR URL to user

## Step 13: Self-Review
Claude reviews the PR diff as a code reviewer:
- `gh pr diff <number>` — read the full diff
- Check for: logic errors, security issues, missing edge cases, style inconsistencies, test gaps
- Check spec compliance: does the diff fully implement the approved acceptance criteria?
- Generate a review summary: PASS / NEEDS_CHANGES with findings
- If NEEDS_CHANGES → fix issues → amend/new commit → push → re-review (max 2 iterations)
- Post review as PR comment via `gh pr comment <number> --body "<review>"`

## Step 14: ⏸️ Human Approval for Merge
Show:
- PR URL
- Self-review result (PASS/NEEDS_CHANGES)
- Final `git diff --stat` summary
WAIT for explicit "merge" / "ok" / "go"
- If user says "merge" → proceed to merge
- If user says "no" / "wait" → leave PR open, skip merge

## Step 15: Merge + Cleanup
- Merge PR: `gh pr merge <number> --squash --delete-branch`
- If working in a worktree:
  - Switch CWD back to main repo
  - Remove worktree: `git worktree remove .claude/worktrees/feat-<slug>`
  - Pull latest main: `git pull origin main`
- Confirm: "PR merged, branch cleaned up, main updated"

## Rollback
If something breaks after commit:
- `git revert HEAD` to undo last commit
- Or `git reset --soft HEAD~1` to uncommit but keep changes
- Re-run tests to verify rollback is clean

## RULES
- NEVER write code before specs are approved
- NEVER commit without human approval
- NEVER skip tests for non-trivial changes
- Screenshots at key moments are mandatory
- Performance checks are mandatory on all projects
- Security pre-flight is mandatory
- If AI review finds issues, fix before commit
- Videos must be watchable (slowMo >= 300ms)
- Bug hotfixes can skip full spec but MUST have tests
- Feature branches MUST use worktree isolation; bugfix branches stay in main repo
- NEVER merge without human approval
- Always clean up worktree after merge
