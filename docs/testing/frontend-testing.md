# Frontend Testing Guide

This guide covers how to test React components in Gofannon using Vitest.

## Overview

Frontend tests use [Vitest](https://vitest.dev/) with React Testing Library to test React components in isolation.

## Running Frontend Tests

```bash
cd webapp/packages/webui

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Test Location

Frontend tests are co-located with components:
```
src/components/
  ActionCard.jsx
  ActionCard.test.jsx  # Test file next to component
```

## Writing Component Tests

```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## Configuration

Vitest configuration is in `webapp/packages/webui/vitest.config.ts`.

## Related Documentation

- [Unit Testing Guide](./unit-testing.md)
- [Coverage Requirements](./coverage.md)
- [Contributing Tests](./contributing.md)
