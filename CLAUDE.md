# Project Instructions

## Commit Message Convention

Follow the NestJS/Angular conventional commit format for all commits.

### Format

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

- Header is mandatory, scope is recommended
- No line longer than 100 characters

### Types (required)

- **build**: changes to build system or external dependencies
- **chore**: maintenance tasks; no production code change
- **ci**: changes to CI configuration files and scripts
- **docs**: documentation only changes
- **feat**: a new feature
- **fix**: a bug fix
- **perf**: a code change that improves performance
- **refactor**: a code change that neither fixes a bug nor adds a feature
- **revert**: reverts a previous commit (body must say `This reverts commit <hash>.`)
- **style**: formatting, missing semi-colons, etc; no code meaning change
- **test**: adding or correcting tests

### Scopes

- **api**: changes in `apps/api`
- **admin**: changes in `apps/admin`
- **deps**: dependency updates
- **config**: monorepo configuration (turbo, tsconfig, etc.)
- **docs**: documentation in `docs/`

Use comma-separated scopes if multiple areas are affected: `feat(api,admin): ...`
Scope may be omitted for changes spanning the entire project.

### Subject

- Imperative, present tense: "change" not "changed" nor "changes"
- No capital first letter
- No dot (.) at the end

### Footer

- Reference GitHub issues with `Closes #123`
- Breaking changes start with `BREAKING CHANGE:` followed by description
