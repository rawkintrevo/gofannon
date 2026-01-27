# Backend Testing Guide

This guide covers how to test the Python API backend using pytest.

## Overview

Backend tests use [pytest](https://docs.pytest.org/) to test the FastAPI application, services, and models.

## Running Backend Tests

```bash
cd webapp/packages/api/user-service

# Run all tests
python -m pytest

# Run unit tests only
python -m pytest tests/unit/

# Run integration tests only
python -m pytest tests/integration/

# Run with coverage
python -m pytest --cov=. --cov-report=html
```

## Test Structure

```
tests/
  conftest.py           # Shared fixtures
  factories/            # Test data factories
    agent_factory.py
    user_factory.py
  unit/                 # Unit tests
    test_user_service.py
    test_user_model.py
  integration/          # Integration tests
    test_health_endpoint.py
```

## Writing Tests

```python
import pytest
from services.user_service import UserService

def test_create_user():
    service = UserService()
    user = service.create_user(name="Test User")
    assert user.name == "Test User"
```

## Using Factories

```python
from tests.factories.user_factory import UserFactory

def test_user_with_factory():
    user = UserFactory.create()
    assert user.id is not None
```

## Configuration

- pytest configuration: `pytest.ini`
- Coverage configuration: `.coveragerc`

## Related Documentation

- [Unit Testing Guide](./unit-testing.md)
- [Integration Testing Guide](./integration-testing.md)
- [Coverage Requirements](./coverage.md)
