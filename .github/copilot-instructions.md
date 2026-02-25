# Changelog

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

# Code practices

- Write TypeScript; do not add plain `.js` files under `/src/`.
- Static elements should be put in `/static`
- Keep all data in `browser.storage.local`; never send data to external servers.

# Testing

- Run `npm run typecheck` and `npm test` before committing to verify nothing is broken.
- Try to cover new functionality with tests unless it is low reward. But small testable functions are preferred.
- Make sure the E2E playwright tests pass
