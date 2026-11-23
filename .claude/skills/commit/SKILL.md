---
name: commit
description: Stage and commit all changes using the project's commit style, then ask once and push main (which deploys the live site); stops only for an anomaly (see Anomalies). Trigger when the user says "commit", "make a commit", "commit the changes", "save the changes", "git commit", "commit and push", or any similar phrasing asking to record current work into git history.
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git branch *) Bash(git add *) Bash(git commit *) Bash(git push) Bash(git rev-parse *) Bash(git log *) Bash(git fetch *) Bash(git ls-remote *) AskUserQuestion
---

Stage and commit all changes on `main`, then ask once and push. Follow the rules and steps below strictly.

This repo has a single branch: `main`. GitHub Pages builds the live site from it, so **a push is a deploy**. Commits
stay local until the push in step 6.

## Format rules

Every commit is a **one-liner**:
```
feat: ABC added to XYZ
fix: typo corrected in config
```

Valid types: `feat`, `fix`, `chore`, `docs`, `refactor` (logic restructure), `style` (cosmetic only), `test`.

Never write "Co-Authored-By" lines.

## Limits

Never force-push, never skip hooks (`--no-verify`), never amend or rebase a commit that is already on `origin/main`,
never push without the owner's yes in step 6.

## 1. Check what changed

Run `git status` and `git diff` to understand what changed. Untracked files count too.

## 2. Check the branch

`git branch --show-current` must print `main`. On any other branch, a detached HEAD, or with a merge, rebase or
cherry-pick in progress, stop (see Anomalies).

## 3. Group into logical commits

Group the changes into logical commits: aim for 2–4 focused commits rather than one large one.

### Splitting into multiple commits

**Prefer multiple focused commits over one large commit.** When changes span logically distinct concerns (different features, different layers such as markup vs script, different bug fixes), split them into separate commits, each staged and committed independently.

Ask yourself: *can these changes be described by more than one clear sentence?* If yes, split.

Examples of good splits:
- New data source → one commit; the page consuming it → another
- Two unrelated bug fixes → two commits
- New feature + unrelated chore → two commits

Only bundle everything into one commit if the changes are truly inseparable (e.g. a rename that touches 20 files, or a single atomic feature with tightly coupled markup and script).

When one file holds changes for two commits, stage it by hunk and check `git diff --cached --stat` against the hunks
you meant to stage. Every commit must leave a working site on its own: if a split could break that, serve the staged
snapshot (`git checkout-index -a --prefix=<tmp>/`) and load it before committing, or don't split that file.

## 4. Print the plan

Print the planned commits as a numbered list, then go on to step 5:
```
1. feat: manifests read for the app stations: home.js, index.html
2. chore: static app descriptions dropped: i18n.js
3. chore: unused project icons removed: assets/projects/
```

## 5. Stage and commit

For each group, stage only its files with `git add <files>`, then commit using a HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
<message here>
EOF
)"
```

`git status` must be clean afterwards.

## 6. Ask, then push

The owner often pushes from the IDE right after a commit, and a scheduled job (`update-languages.yml`) commits
`data/languages.json` to `main`, so check the remote first: `git fetch origin`, then `git status -sb`.

- **Nothing to push** (`origin/main` already has the commits): say so in one line and stop.
- **Ahead only:** ask with `AskUserQuestion`, options **Push** and **Not now**, naming the commits that would go live.
  On **Push**, run `git push` and report in one line what went out. Pages takes a minute or two to rebuild, and its
  CDN caches for up to 10 minutes, so a check of the live site needs a cache-buster (`?cb=<n>`) and some patience.
- **Behind or diverged:** stop (see Anomalies).

## Anomalies

Stop and tell the owner, without working around it, when:

- **Before committing:** not on `main`; a detached HEAD, or a merge, rebase or cherry-pick in progress; a change that
  looks like a secret (`.env`, a key, a token, a private repo or org name, which must never be committed here because
  the repo and its Actions logs are public); a large or binary file nobody asked for; changes that plainly belong to
  other work.
- **A hook fails:** if the cause is plainly in this change, fix it and make a new commit, at most twice. Otherwise
  stop with the output.
- **The branch is behind or diverged from `origin/main`:** say which commits are only on the remote (`git log
  HEAD..origin/main --oneline`). Never answer with a force, a pull or a rebase on your own; the owner decides.
- **The push fails** for any reason (rejected, authentication, permission).
- **`git status` is not clean after committing** for a reason you cannot explain.
