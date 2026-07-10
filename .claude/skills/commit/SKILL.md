---
name: commit
description: Stage and commit all changes using the project's commit style. Trigger when the user says "commit", "make a commit", "commit the changes", "save the changes", "git commit", or any similar phrasing asking to record current work into git history.
allowed-tools: Bash(git status) Bash(git diff) Bash(git add *) Bash(git commit *) AskUserQuestion
---

Stage and commit all changes. Follow these rules strictly:

## Format rules

Every commit is a **one-liner**:
```
feat: ABC added to XYZ
fix: typo corrected in config
```

Valid types: `feat`, `fix`, `chore`, `docs`, `refactor` (logic restructure), `style` (cosmetic only), `test`.

Never write "Co-Authored-By" lines.

## Splitting into multiple commits

**Prefer multiple focused commits over one large commit.** When changes span logically distinct concerns — different features, different layers (backend vs frontend), different bug fixes — split them into separate commits, each staged and committed independently.

Ask yourself: *can these changes be described by more than one clear sentence?* If yes, split.

Examples of good splits:
- Backend API change → one commit; frontend consuming it → another
- Two unrelated bug fixes → two commits
- New feature + unrelated chore → two commits

Only bundle everything into one commit if the changes are truly inseparable (e.g. a rename that touches 20 files, or a single atomic feature with tightly coupled frontend/backend).

## Steps

1. Run `git status` and `git diff` to understand what changed.
2. Group the changes into logical commits — aim for 2–4 focused commits rather than one large one.
3. Present the planned commits as a numbered list, then use the `AskUserQuestion` tool to ask for confirmation with two options: **Confirm** and **Cancel**. Do not proceed until the user selects an option.
   Example list before the question:
   ```
   1. feat: rotation detection and resolve-rotation endpoint — analyze.py, curate.py, state.py
   2. feat: rotation UI with cache-busting — Curate.tsx, api.ts
   3. fix: DD/MM/YYYY date format — StandardizeCards.tsx
   ```
4. If the user selects **Confirm**, for each group: stage only those files with `git add <files>`, then commit. If they select **Cancel**, stop.
5. Commit using a HEREDOC so formatting is preserved:

```bash
git commit -m "$(cat <<'EOF'
<message here>
EOF
)"
```
