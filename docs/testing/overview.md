# Testing Overview

This document provides an introduction to the testing strategy used in Gofannon.

## Testing Philosophy

Gofannon maintains a comprehensive testing strategy with:

- **Unit tests** for individual functions, classes, and components
- **Integration tests** for testing components working together
- **E2E tests** for complete user workflows

## Test Types

| Type | Purpose | Speed | When Run |
|------|---------|-------|----------|
| Unit | Test isolated functions/components | Fast (&lt;100ms) | Every PR |
| Integration | Test components together | Medium (500ms-5s) | Nightly |
| E2E | Test user workflows in browser | Slow (5-30s) | Nightly |

## Related Documentation

- [Unit Testing Guide](./unit-testing.md)
- [Integration Testing Guide](./integration-testing.md)
- [Frontend Testing Guide](./frontend-testing.md)
- [Backend Testing Guide](./backend-testing.md)
- [CI/CD Testing](./ci-cd.md)
- [Coverage Requirements](./coverage.md)
