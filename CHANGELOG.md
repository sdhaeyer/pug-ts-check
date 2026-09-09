# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-09-08

### Added
- Batch TypeScript diagnostics for full and stale-file rescans
- `--report`, `--check-only`, and `--rescan-all` CLI workflows

### Changed
- Improved cached diagnostic persistence and detailed error reporting
- Kept immediate per-file diagnostics in watch mode while using batch validation for rescans

## [0.2.1] - 2026-01-30

### Added
- Enhanced tsconfig.json with source map and inline sources options for better debugging

### Changed
- Refactored command logging for improved clarity and consistency
- Ensured view locals are generated immediately after type checking

### Fixed
- Improved command execution order and type checking pipeline

## [0.2.0] - 2026-01-28

### Added
- Go to Definition support for Pug symbols in VS Code extension
- Config file loading and workspace handling improvements
- ExtensionLogger class for improved logging
- Output channel integration for extension logs
- New commands and link provider for better navigation
- Navigation to mixin definitions and viewLocals
- Support for Pug 'extends' and 'include' detection
- Asset path resolution for CSS, JS, and restricted assets
- Command for choosing between view and ViewLocals definitions

### Changed
- Enhanced debug logging for mapping retrieval and file path handling
- Streamlined output messages for link detection and existence checks
- Improved code cleanup and consistency in virtualTsStore
- Refined config loading logic and TypeScript configuration
- Upgraded dependencies and improved package structure

### Fixed
- Improved error handling and logging in extension
- Fixed package.json to remove local dependency issues
- Updated server port to match configuration

## [0.1.7] - 2025-08-01

### Added
- Interactive commands help text in watch mode
- Better user guidance with keyboard shortcuts (r=rescan, s=summary, e=errors, f=full log, g=generate TS, Ctrl+C=exit)
- Visual error symbols (❌/✅) for better status recognition

### Improved
- Enhanced CLI interaction and user experience
- Improved logging consistency and clarity throughout the codebase
- Better stale dependency handling with appropriate log levels
- Cleaner terminal output with proper clearing behavior
- More structured Logger usage replacing hardcoded console.log calls
- Watch event response handling optimization

### Changed
- Moved stale dependency logs from `info` to `debug` level to reduce noise
- Enhanced error logging with optional extra type information
- Improved code formatting in logging internals

## [0.1.6] - 2025-07-31

### Added
- Enhanced logging functionality
- Improved error handling and reporting

### Changed
- TypeScript moved from devDependencies to dependencies for NPM package compatibility
- Various bug fixes and stability improvements

## [0.1.5] and earlier

Initial development versions with core functionality for TypeScript checking of Pug templates.
