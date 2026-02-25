# Copilot Instructions

## Changelog

Always add an entry to the `[Unreleased]` section in `CHANGELOG.md` when making any user-visible change. Follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

- **Added** – new features
- **Changed** – changes to existing functionality
- **Deprecated** – features that will be removed in a future release
- **Removed** – features removed in this release
- **Fixed** – bug fixes
- **Security** – fixes for vulnerabilities

Each entry should reference the relevant pull request, e.g.:
```markdown
## [Unreleased]

### Fixed
- Corrected domain matching for subdomains ([#42](https://github.com/emanuelen5/smart-privacy/pull/42))
```

## Code practices

- Write TypeScript; do not add plain `.js` files under `src/`.
- Run `npm run typecheck` and `npm test` before committing to verify nothing is broken.
- Keep all data in `browser.storage.local`; never send data to external servers.
- Follow the existing module structure: shared logic in `src/utils.ts` and `src/types.ts`, background logic in `src/background.ts`, UI logic in `src/content.ts`, `src/popup/`, and `src/options/`.
- Add or update unit tests in `src/__tests__/` when changing shared utilities or background logic.
