# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
<!-- releases -->

### Fixed
- Fixed `npm test` failing with `ERR_REQUIRE_ESM` by setting `"type": "module"` in package.json for Vitest v4 ESM compatibility ([#14](https://github.com/emanuelen5/smart-privacy/pull/14))

### Added
- Sponsor page that kindly asks for donations, accessible from the popup and shown automatically on first install ([#12](https://github.com/emanuelen5/smart-privacy/pull/12))

### Fixed
- Release notes page no longer shows the changelog preamble and unreleased section

<!-- released -->

## [1.0.0] - 2026-02-24

### Added
- Initial release of Smart Privacy extension ([#1](https://github.com/emanuelen5/smart-privacy/pull/1))
- Automatically removes cookies and site data for sites not on the approve list
- Prompts user when a site is visited repeatedly
- Prompts user when a password field is detected
- Popup with approve/deny controls for the current site
- Options page to manage the approve/deny list and visit threshold
- Release notes accessible from the popup
