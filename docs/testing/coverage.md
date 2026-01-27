# Coverage Requirements

This document outlines the code coverage requirements and reporting for Gofannon.

## Coverage Thresholds

| Metric | Minimum |
|--------|---------|
| Lines | 95% |
| Functions | 95% |
| Branches | 95% |
| Statements | 95% |

## Running Coverage Reports

### Frontend (Vitest)

```bash
cd webapp/packages/webui
pnpm test:coverage
# Open ./coverage/index.html in browser
```

### Backend (pytest)

```bash
cd webapp/packages/api/user-service
python -m pytest tests/unit --cov=. --cov-report=html
# Open ./htmlcov/index.html in browser
```

### All Coverage

```bash
cd webapp
pnpm test:coverage
```

## Report Formats

Coverage is generated in multiple formats:
- **HTML** - Interactive browser reports
- **XML** - For CI/CD integration
- **LCOV** - For Codecov uploads

## Codecov Integration

Coverage data is automatically uploaded to Codecov on CI runs. View reports at:
- PR coverage diffs
- Historical coverage trends
- Per-file coverage breakdown

## Excluding Files from Coverage

### Frontend (vitest.config.ts)

```typescript
coverage: {
  exclude: ['**/node_modules/**', '**/test/**']
}
```

### Backend (.coveragerc)

```ini
[run]
omit =
    tests/*
    */__pycache__/*
```

## Related Documentation

- [Unit Testing Guide](./unit-testing.md)
- [CI/CD Testing](./ci-cd.md)
- [Contributing Tests](./contributing.md)
