"""Unit tests for database service base class."""
from __future__ import annotations

import pytest

from services.database_service.base import DatabaseService


pytestmark = pytest.mark.unit


class ConcreteDatabaseService(DatabaseService):
    """Concrete implementation for testing."""

    def __init__(self):
        self.storage = {}

    def get(self, db_name: str, doc_id: str):
        key = f"{db_name}:{doc_id}"
        if key not in self.storage:
            raise KeyError(f"Document {doc_id} not found")
        return self.storage[key]

    def save(self, db_name: str, doc_id: str, doc):
        key = f"{db_name}:{doc_id}"
        self.storage[key] = doc
        return doc

    def delete(self, db_name: str, doc_id: str):
        key = f"{db_name}:{doc_id}"
        if key in self.storage:
            del self.storage[key]

    def list_all(self, db_name: str):
        return [
            doc for key, doc in self.storage.items()
            if key.startswith(f"{db_name}:")
        ]


def test_database_service_is_abstract():
    """Test that DatabaseService cannot be instantiated directly."""
    with pytest.raises(TypeError):
        DatabaseService()


def test_concrete_implementation_get():
    """Test get method in concrete implementation."""
    db = ConcreteDatabaseService()
    doc = {"_id": "doc1", "data": "test"}
    db.save("testdb", "doc1", doc)

    result = db.get("testdb", "doc1")
    assert result == doc


def test_concrete_implementation_get_not_found():
    """Test get method raises KeyError for missing document."""
    db = ConcreteDatabaseService()

    with pytest.raises(KeyError):
        db.get("testdb", "nonexistent")


def test_concrete_implementation_save():
    """Test save method in concrete implementation."""
    db = ConcreteDatabaseService()
    doc = {"_id": "doc2", "name": "Test Document"}

    result = db.save("testdb", "doc2", doc)
    assert result == doc

    # Verify it was saved
    saved = db.get("testdb", "doc2")
    assert saved == doc


def test_concrete_implementation_save_overwrites():
    """Test save method overwrites existing document."""
    db = ConcreteDatabaseService()

    doc1 = {"_id": "doc3", "version": 1}
    db.save("testdb", "doc3", doc1)

    doc2 = {"_id": "doc3", "version": 2}
    db.save("testdb", "doc3", doc2)

    result = db.get("testdb", "doc3")
    assert result["version"] == 2


def test_concrete_implementation_delete():
    """Test delete method in concrete implementation."""
    db = ConcreteDatabaseService()

    doc = {"_id": "doc4", "data": "to delete"}
    db.save("testdb", "doc4", doc)

    db.delete("testdb", "doc4")

    with pytest.raises(KeyError):
        db.get("testdb", "doc4")


def test_concrete_implementation_delete_nonexistent():
    """Test delete method with non-existent document (should not raise)."""
    db = ConcreteDatabaseService()

    # Should not raise an error
    db.delete("testdb", "nonexistent")


def test_concrete_implementation_list_all_empty():
    """Test list_all with no documents."""
    db = ConcreteDatabaseService()

    result = db.list_all("testdb")
    assert result == []


def test_concrete_implementation_list_all_multiple():
    """Test list_all with multiple documents."""
    db = ConcreteDatabaseService()

    doc1 = {"_id": "doc1", "name": "First"}
    doc2 = {"_id": "doc2", "name": "Second"}
    doc3 = {"_id": "doc3", "name": "Third"}

    db.save("testdb", "doc1", doc1)
    db.save("testdb", "doc2", doc2)
    db.save("testdb", "doc3", doc3)

    result = db.list_all("testdb")
    assert len(result) == 3
    assert doc1 in result
    assert doc2 in result
    assert doc3 in result


def test_concrete_implementation_list_all_filters_by_db():
    """Test list_all only returns documents from specified database."""
    db = ConcreteDatabaseService()

    db.save("db1", "doc1", {"_id": "doc1", "db": "db1"})
    db.save("db2", "doc2", {"_id": "doc2", "db": "db2"})
    db.save("db1", "doc3", {"_id": "doc3", "db": "db1"})

    result = db.list_all("db1")
    assert len(result) == 2
    assert all(doc["db"] == "db1" for doc in result)


def test_abstract_methods_must_be_implemented():
    """Test that all abstract methods must be implemented."""

    class IncompleteDatabaseService(DatabaseService):
        def get(self, db_name: str, doc_id: str):
            pass

        def save(self, db_name: str, doc_id: str, doc):
            pass

        # Missing delete and list_all

    # Should raise TypeError because not all abstract methods are implemented
    with pytest.raises(TypeError):
        IncompleteDatabaseService()


def test_database_service_interface():
    """Test that DatabaseService defines the correct interface."""
    # Verify all required methods are defined
    assert hasattr(DatabaseService, 'get')
    assert hasattr(DatabaseService, 'save')
    assert hasattr(DatabaseService, 'delete')
    assert hasattr(DatabaseService, 'list_all')

    # Verify they are abstract
    assert getattr(DatabaseService.get, '__isabstractmethod__', False)
    assert getattr(DatabaseService.save, '__isabstractmethod__', False)
    assert getattr(DatabaseService.delete, '__isabstractmethod__', False)
    assert getattr(DatabaseService.list_all, '__isabstractmethod__', False)
