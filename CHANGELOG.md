# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
