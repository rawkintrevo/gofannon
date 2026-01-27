# CI/CD Testing

This guide covers the automated testing workflows in GitHub Actions.

## Overview

Gofannon uses GitHub Actions to run tests automatically on PRs and on a nightly schedule.

## Workflows

### PR Unit Tests (`pr-unit-tests.yml`)

Runs on every pull request:
- Frontend unit tests with coverage
- Backend unit tests with coverage
- Lint checks
- Coverage threshold validation

**PR will be blocked if:**
- Any test fails
- Coverage drops below threshold
- Lint errors exist

### Nightly Integration Tests (`nightly-integration-tests.yml`)

Runs every night at 2 AM UTC:
- Backend integration tests with full Docker stack
- E2E tests with Playwright
- Full coverage reports

**Team is notified if:**
- Any nightly test fails
- Services fail to start
- Tests timeout

## Workflow Files

Located in `.github/workflows/`:
- `pr-unit-tests.yml` - PR checks
- `nightly-integration-tests.yml` - Nightly comprehensive tests

## Viewing Results

- Check the "Actions" tab in GitHub to see workflow runs
- PR checks appear as status checks on the pull request
- Coverage reports are uploaded to Codecov

## Related Documentation

- [Unit Testing Guide](./unit-testing.md)
- [Integration Testing Guide](./integration-testing.md)
- [Coverage Requirements](./coverage.md)
