# Gofannon Database Service Documentation

## Overview

The Gofannon database service provides a flexible, abstraction-based approach to data persistence. It supports multiple database backends through a common interface, allowing you to switch between database providers without changing application code.

**Current Supported Databases:**
- In-Memory (default for testing)
- Apache CouchDB
- Google Cloud Firestore
- AWS DynamoDB

## Table of Contents

1. [Architecture](#architecture)
2. [Database Interface](#database-interface)
3. [Collections and Schema](#collections-and-schema)
4. [Existing Database Implementations](#existing-database-implementations)
5. [Configuration](#configuration)
6. [Implementing a New Database](#implementing-a-new-database)
7. [Testing](#testing)

---

## Architecture

### Location

The database service code is located at:
```
webapp/packages/api/user-service/services/database_service/
├── __init__.py      # Factory function and singleton management
├── base.py          # Abstract base class defining the interface
├── memory.py        # In-memory implementation
├── couchdb.py       # Apache CouchDB implementation
├── firestore.py     # Google Cloud Firestore implementation
└── dynamodb.py      # AWS DynamoDB implementation
```

### Design Pattern

The service uses the **Abstract Factory Pattern** with a **Singleton** instance:

1. **Abstract Base Class** (`DatabaseService` in [base.py](webapp/packages/api/user-service/services/database_service/base.py)) defines the contract
2. **Concrete Implementations** implement the abstract methods for each database
3. **Factory Function** (`get_database_service()` in [__init__.py](webapp/packages/api/user-service/services/database_service/__init__.py)) returns the appropriate implementation based on configuration
4. **Singleton Instance** ensures only one database connection exists throughout the application lifecycle

### Dependency Injection

The database service is injected into API endpoints using FastAPI's dependency injection system:

```python
from dependencies import get_db

@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str, db: DatabaseService = Depends(get_db)):
    return db.get("agents", agent_id)
```

See [dependencies.py](webapp/packages/api/user-service/dependencies.py:27-30) for the implementation.

---

## Database Interface

All database implementations must inherit from the `DatabaseService` abstract base class and implement four core methods:

### Abstract Base Class

```python
from abc import ABC, abstractmethod
from typing import Any, Dict, List

class DatabaseService(ABC):
    """Abstract base class for a generic database service."""

    @abstractmethod
    def get(self, db_name: str, doc_id: str) -> Dict[str, Any]:
        """
        Retrieve a document by ID.

        Args:
            db_name: The database/collection name
            doc_id: The document identifier

        Returns:
            Dictionary containing the document data

        Raises:
            HTTPException(404): If document not found
        """
        pass

    @abstractmethod
    def save(self, db_name: str, doc_id: str, doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save (create or update) a document.

        Args:
            db_name: The database/collection name
            doc_id: The document identifier
            doc: The document data to save

        Returns:
            Dictionary with at minimum {"id": doc_id, "rev": revision_info}
        """
        pass

    @abstractmethod
    def delete(self, db_name: str, doc_id: str) -> None:
        """
        Delete a document by ID.

        Args:
            db_name: The database/collection name
            doc_id: The document identifier

        Raises:
            HTTPException(404): If document not found
        """
        pass

    @abstractmethod
    def list_all(self, db_name: str) -> List[Dict[str, Any]]:
        """
        List all documents in a database/collection.

        Args:
            db_name: The database/collection name

        Returns:
            List of dictionaries, each containing a document
        """
        pass
```

### Method Specifications

| Method | Parameters | Returns | Error Handling |
|--------|-----------|---------|----------------|
| `get()` | `db_name: str`<br>`doc_id: str` | `Dict[str, Any]` | Raises `HTTPException(404)` if not found |
| `save()` | `db_name: str`<br>`doc_id: str`<br>`doc: Dict[str, Any]` | `{"id": str, "rev": str}` | Implementation-specific (e.g., 409 for conflicts) |
| `delete()` | `db_name: str`<br>`doc_id: str` | `None` | Raises `HTTPException(404)` if not found |
| `list_all()` | `db_name: str` | `List[Dict[str, Any]]` | Returns empty list if collection doesn't exist |

### Important Interface Conventions

1. **Database Name Parameter**: The `db_name` parameter represents a collection/table name, not a database server. Each implementation maps this to its native concept:
   - CouchDB: Database name
   - Firestore: Collection name
   - DynamoDB: Table name
   - Memory: Dictionary key namespace

2. **Document ID**: All documents must have an identifier:
   - Stored as `_id` field in the document
   - Passed as `doc_id` parameter to methods
   - Some implementations auto-add this field on save

3. **Return Values**: The `save()` method must return a dictionary with:
   - `id`: The document ID (echo of `doc_id` parameter)
   - `rev`: Revision identifier (implementation-specific, can be placeholder)

4. **Error Handling**: Use FastAPI's `HTTPException` for consistency:
   ```python
   from fastapi import HTTPException

   raise HTTPException(status_code=404, detail="Document not found")
   raise HTTPException(status_code=409, detail="Document conflict")
   ```

---

## Collections and Schema

### Required Collections

The Gofannon system uses the following collections/tables. Each must be supported by your database implementation:

| Collection Name | Purpose | Primary Key | Description |
|-----------------|---------|-------------|-------------|
| `agents` | AI Agents | `_id` (UUID) | Stores agent definitions including code, tools, and schemas |
| `deployments` | Deployment Mappings | `_id` (friendly_name) | Maps friendly endpoint names to agent IDs |
| `users` | User Profiles | `_id` (user_id) | User information, billing plans, and usage tracking |
| `sessions` | Chat Sessions | `_id` (session_id) | Conversation sessions and interaction history |
| `tickets` | Async Jobs | `_id` (ticket_id) | Asynchronous task tracking and results |
| `demos` | Demo Apps | `_id` (demo_id) | Demo application configurations |

### Document Schemas

#### Agent Document

Location: [models/agent.py](webapp/packages/api/user-service/models/agent.py)

```python
{
    "_id": "550e8400-e29b-41d4-a716-446655440000",  # UUID string
    "name": "MyAgent",                              # Agent name
    "description": "Description of what agent does",
    "code": "def handler(event):\n    return {}",  # Python execution code
    "friendly_name": "my-agent",                    # URL-safe deployment name
    "tools": {                                       # Available tools by category
        "web": ["web_search", "web_fetch"],
        "data": ["sql_query"]
    },
    "input_schema": {                               # Expected input structure
        "query": "string",
        "max_results": "integer"
    },
    "output_schema": {                              # Expected output structure
        "results": "array",
        "count": "integer"
    },
    "gofannon_agents": [                            # Dependent Gofannon agents
        "agent-id-1",
        "agent-id-2"
    ],
    "created_at": "2024-01-15T10:30:00Z",          # ISO 8601 datetime
    "updated_at": "2024-01-15T10:30:00Z"           # ISO 8601 datetime
}
```

**Key Fields:**
- `_id`: Unique identifier (UUID v4)
- `code`: Executable Python code for the agent
- `friendly_name`: Used in deployment URLs (`/api/agents/{friendly_name}/run`)
- `tools`: Nested dictionary of tool categories and available tools
- Schemas define input/output validation contracts

#### Deployment Document

Location: [models/deployment.py](webapp/packages/api/user-service/models/deployment.py)

```python
{
    "_id": "my-friendly-name",                      # Deployment endpoint name
    "agentId": "550e8400-e29b-41d4-a716-446655440000"  # References agent._id
}
```

**Key Fields:**
- `_id`: The friendly name used in API URLs
- `agentId`: Foreign key to agents collection

**Usage**: Enables agents to be deployed at human-readable endpoints like `/api/agents/my-friendly-name/run`

#### User Document

Location: [models/user.py](webapp/packages/api/user-service/models/user.py)

```python
{
    "_id": "user_google_123456789",                 # Provider-specific user ID
    "basic_info": {
        "display_name": "John Doe",
        "email": "john@example.com",
        "picture_url": "https://...",               # Optional profile picture
        "provider": "google"                         # Authentication provider
    },
    "billing_info": {
        "plan": "free",                              # Subscription tier
        "status": "active",                          # Billing status
        "stripe_customer_id": "cus_...",            # Optional Stripe reference
        "subscription_id": "sub_..."                # Optional subscription ID
    },
    "usage_info": {
        "monthly_allowance": 100.0,                 # USD allowance per month
        "spend_remaining": 87.50,                   # USD remaining this period
        "usage": [                                   # Usage history
            {
                "timestamp": "2024-01-15T10:30:00Z",
                "response_cost": 0.05,              # Cost in USD
                "agent_id": "agent-id",             # Optional agent reference
                "session_id": "session-id"          # Optional session reference
            }
        ],
        "last_reset": "2024-01-01T00:00:00Z"       # Last billing period reset
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
}
```

**Key Fields:**
- `_id`: Composite of provider and provider user ID
- `usage_info.usage`: Array that grows with each API call
- Cost tracking in USD for billing/quota enforcement

#### Session Document

Location: [models/session.py](webapp/packages/api/user-service/models/session.py)

```python
{
    "_id": "session_abc123",                        # Unique session identifier
    "user_id": "user_google_123456789",            # References user._id
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",  # References agent._id
    "messages": [                                   # Conversation history
        {
            "role": "user",
            "content": "Hello, agent!",
            "timestamp": "2024-01-15T10:30:00Z"
        },
        {
            "role": "assistant",
            "content": "Hello! How can I help?",
            "timestamp": "2024-01-15T10:30:05Z"
        }
    ],
    "metadata": {                                   # Additional context
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "tags": ["support", "billing"]
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z",
    "expires_at": "2024-01-16T10:30:00Z"          # Optional session expiry
}
```

**Key Fields:**
- `messages`: Append-only conversation array
- Foreign keys to `users` and `agents`
- Optional expiry for automatic cleanup

#### Ticket Document

Location: [models/ticket.py](webapp/packages/api/user-service/models/ticket.py)

```python
{
    "_id": "ticket_xyz789",                         # Unique ticket identifier
    "status": "pending",                            # "pending" | "processing" | "completed" | "failed"
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z",
    "request": {                                     # Original request data
        "agent_id": "agent-id",
        "input": {"query": "..."},
        "user_id": "user_id"
    },
    "result": {                                      # Populated when completed
        "output": {"results": [...]},
        "cost": 0.05,
        "completed_at": "2024-01-15T10:35:00Z"
    },
    "error": null                                    # Populated if failed
}
```

**Key Fields:**
- `status`: Tracks async job lifecycle
- `result`: Only present after successful completion
- `error`: Only present if job failed

#### Demo Document

Location: [models/demo.py](webapp/packages/api/user-service/models/demo.py)

```python
{
    "_id": "demo_chat_app",                         # Demo identifier
    "name": "Interactive Chat Demo",
    "description": "A demo showing chat capabilities",
    "agent_id": "agent-id",                        # References agent to use
    "config": {                                     # Demo-specific settings
        "theme": "dark",
        "max_messages": 50,
        "features": ["markdown", "code_highlighting"]
    },
    "is_public": true,                             # Visibility flag
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
}
```

### Schema Conventions

1. **ID Field**: All documents must include an `_id` field
2. **Timestamps**: Use ISO 8601 format strings (`"2024-01-15T10:30:00Z"`)
3. **Foreign Keys**: Reference other documents by their `_id` value
4. **Optional Fields**: Fields may be `null` or omitted entirely
5. **Arrays**: Use lists for collections (messages, usage history, etc.)
6. **Nested Objects**: Use dictionaries for grouped related fields

---

## Existing Database Implementations

### Memory Database (Default)

**File**: [memory.py](webapp/packages/api/user-service/services/database_service/memory.py)

**Purpose**: In-memory storage for testing and development

**Implementation Details**:
```python
class MemoryDatabaseService(DatabaseService):
    def __init__(self):
        self._data: Dict[str, Dict[str, Dict[str, Any]]] = {}
        # Structure: {db_name: {doc_id: document}}
```

**Characteristics**:
- **Storage**: Python dictionary in RAM
- **Persistence**: None (data lost on restart)
- **Performance**: Extremely fast (no I/O)
- **Revision Tracking**: Returns placeholder `"memory-rev"`
- **Auto-initialization**: No setup required

**When to Use**:
- Unit testing
- Local development without external dependencies
- CI/CD pipelines
- Prototype/demo environments

**Configuration**:
```bash
# .env or environment variables
DATABASE_PROVIDER=memory
# No additional configuration needed
```

**Special Considerations**:
- No persistence across restarts
- Single-process only (no shared state)
- No concurrency control
- Unlimited storage (until RAM exhausted)

---

### Apache CouchDB

**File**: [couchdb.py](webapp/packages/api/user-service/services/database_service/couchdb.py)

**Purpose**: Production-ready document database with HTTP API

**Implementation Details**:
```python
class CouchDBService(DatabaseService):
    def __init__(self, url: str, username: str, password: str):
        self.couch = couchdb.Server(url)
        self.couch.resource.credentials = (username, password)
```

**Characteristics**:
- **Storage**: Disk-based B-tree
- **Persistence**: Full durability with append-only writes
- **Performance**: Good for document-oriented workloads
- **Revision Tracking**: Native `_rev` field with MVCC
- **Auto-initialization**: Creates databases on first access

**Configuration**:
```bash
# .env or environment variables
DATABASE_PROVIDER=couchdb
COUCHDB_URL=http://localhost:5984
COUCHDB_USER=admin
COUCHDB_PASSWORD=password
```

**Docker Setup**:
```yaml
# docker-compose.yml includes:
services:
  couchdb:
    image: couchdb:latest
    ports:
      - "5984:5984"
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=password
```

**Special Considerations**:

1. **Database Creation**: Automatically creates databases if they don't exist
   ```python
   # In save() method:
   if db_name not in self.couch:
       self.couch.create(db_name)
   ```

2. **Revision Conflicts**: CouchDB uses MVCC (Multi-Version Concurrency Control)
   - Must include current `_rev` when updating documents
   - Returns 409 status on conflict
   - Implementation handles this by fetching current `_rev` before update:
   ```python
   try:
       existing = db[doc_id]
       doc["_rev"] = existing["_rev"]
   except couchdb.http.ResourceNotFound:
       pass  # New document, no _rev needed
   ```

3. **Listing Documents**: Uses `_all_docs` view with `include_docs=True`
   ```python
   for row in db.view("_all_docs", include_docs=True):
       documents.append(row.doc)
   ```

4. **ID Storage**: Stores document ID in both:
   - CouchDB's native `_id` field
   - Application's `_id` field (for consistency)

**Production Recommendations**:
- Enable authentication (never use admin party mode)
- Configure replication for high availability
- Set up regular backups (CouchDB replication protocol)
- Monitor disk space (compaction needed periodically)
- Use clustering for horizontal scaling

---

### Google Cloud Firestore

**File**: [firestore.py](webapp/packages/api/user-service/services/database_service/firestore.py)

**Purpose**: Serverless NoSQL database for Google Cloud deployments

**Implementation Details**:
```python
class FirestoreService(DatabaseService):
    def __init__(self, project_id: str = None):
        firebase_admin.initialize_app()
        self.db = firestore.client()
```

**Characteristics**:
- **Storage**: Cloud-native distributed database
- **Persistence**: Automatic with multi-region replication
- **Performance**: Low-latency worldwide access
- **Revision Tracking**: Placeholder `"firestore-rev"` (uses server-side versioning)
- **Auto-initialization**: Collections created on first write

**Configuration**:
```bash
# .env or environment variables
DATABASE_PROVIDER=firestore

# Authentication via Firebase Admin SDK:
# - Set GOOGLE_APPLICATION_CREDENTIALS pointing to service account JSON
# - Or use Application Default Credentials in GCP
```

**Authentication Setup**:
1. Create a Firebase project
2. Generate a service account key
3. Download JSON key file
4. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

**Special Considerations**:

1. **Collection Auto-Creation**: Collections are created implicitly on first document write
   - No need to pre-create collections
   - No "create database" equivalent

2. **Document Structure**: Firestore uses collections and documents
   - `db_name` parameter maps to collection name
   - `doc_id` parameter is the document ID within that collection

3. **ID Field**: Implementation adds `_id` to returned documents
   ```python
   def get(self, db_name: str, doc_id: str) -> Dict[str, Any]:
       doc_ref = self.db.collection(db_name).document(doc_id)
       doc = doc_ref.get()
       data = doc.to_dict()
       data["_id"] = doc.id  # Add ID to document
       return data
   ```

4. **Listing Documents**: Streams all documents in collection
   ```python
   docs = self.db.collection(db_name).stream()
   for doc in docs:
       data = doc.to_dict()
       data["_id"] = doc.id
       documents.append(data)
   ```

5. **Revision Information**: Returns placeholder revision
   - Firestore handles versioning server-side
   - Application doesn't need to track revisions

**Production Recommendations**:
- Use security rules to restrict access
- Enable audit logging for compliance
- Use composite indexes for complex queries (if needed)
- Monitor quota usage (reads/writes/deletes)
- Consider Firestore Native mode over Datastore mode
- Use multi-region for high availability

**Cost Considerations**:
- Charged per document read/write/delete
- Free tier: 50K reads, 20K writes, 20K deletes per day
- Storage: $0.18/GB/month
- Network egress charges apply

---

### AWS DynamoDB

**File**: [dynamodb.py](webapp/packages/api/user-service/services/database_service/dynamodb.py)

**Purpose**: Serverless NoSQL database for AWS deployments

**Implementation Details**:
```python
class DynamoDBService(DatabaseService):
    def __init__(self, region_name: str = "us-east-1", endpoint_url: str = None):
        self.dynamodb = boto3.resource(
            "dynamodb",
            region_name=region_name,
            endpoint_url=endpoint_url  # For local DynamoDB
        )
        self.tables: Dict[str, Any] = {}
```

**Characteristics**:
- **Storage**: Cloud-native key-value and document database
- **Persistence**: Automatic with multi-AZ replication
- **Performance**: Single-digit millisecond latency
- **Revision Tracking**: Placeholder `"dynamodb-rev"` (uses conditional writes)
- **Auto-initialization**: Creates tables on first access with on-demand billing

**Configuration**:
```bash
# .env or environment variables
DATABASE_PROVIDER=dynamodb
DYNAMODB_REGION=us-east-1
DYNAMODB_ENDPOINT_URL=http://localhost:8000  # Optional, for local DynamoDB

# AWS credentials via standard AWS SDK methods:
# - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
# - AWS credentials file (~/.aws/credentials)
# - IAM role (when running on EC2/ECS/Lambda)
```

**Local Development Setup**:
```bash
# Install DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Configure endpoint
export DYNAMODB_ENDPOINT_URL=http://localhost:8000
```

**Special Considerations**:

1. **Table Auto-Creation**: Creates tables on first access if they don't exist
   ```python
   def _ensure_table_exists(self, db_name: str):
       if db_name in self.tables:
           return

       try:
           table = self.dynamodb.Table(db_name)
           table.load()
           self.tables[db_name] = table
       except ClientError:
           # Table doesn't exist, create it
           table = self.dynamodb.create_table(
               TableName=db_name,
               KeySchema=[{"AttributeName": "_id", "KeyType": "HASH"}],
               AttributeDefinitions=[{"AttributeName": "_id", "AttributeType": "S"}],
               BillingMode="PAY_PER_REQUEST"
           )
           table.wait_until_exists()
           self.tables[db_name] = table
   ```

2. **Partition Key**: All tables use `_id` as the partition key
   - Hash-based distribution
   - Single-attribute key (no sort key)

3. **Billing Mode**: Uses on-demand (PAY_PER_REQUEST) pricing
   - No capacity planning required
   - Charged per request
   - Alternative: provisioned capacity with auto-scaling

4. **Decimal Conversion**: DynamoDB requires Decimal for floating-point numbers
   ```python
   def _convert_floats_to_decimal(self, obj):
       """Recursively convert floats to Decimal for DynamoDB compatibility"""
       if isinstance(obj, float):
           return Decimal(str(obj))
       # ... handle dicts, lists recursively
   ```

5. **Pagination**: Handles large result sets in `list_all()`
   ```python
   response = table.scan()
   items = response.get("Items", [])

   # Handle pagination
   while "LastEvaluatedKey" in response:
       response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
       items.extend(response.get("Items", []))
   ```

6. **Type Conversions**: DynamoDB uses custom types (boto3 handles this)
   - Numbers: Stored as `Decimal`
   - Binary: Stored as `Binary`
   - Sets: Stored as DynamoDB sets
   - Application sees standard Python types

**Production Recommendations**:
- Use IAM roles instead of access keys
- Enable point-in-time recovery (PITR) for backups
- Enable DynamoDB Streams for change data capture
- Use global tables for multi-region replication
- Monitor throttling metrics
- Consider provisioned capacity with auto-scaling for predictable workloads
- Use DAX (DynamoDB Accelerator) for read-heavy caching

**Cost Considerations**:
- On-demand: $1.25 per million write requests, $0.25 per million read requests
- Provisioned: ~$0.47/month per WCU, ~$0.09/month per RCU
- Storage: $0.25/GB/month
- Free tier: 25GB storage, 25 WCU, 25 RCU

**Performance Tuning**:
- Use batch operations for multiple items (not currently implemented)
- Consider secondary indexes for query patterns (not currently used)
- Avoid scans on large tables (use queries with indexes)
- Current implementation uses scan() which reads entire table

---

## Configuration

### Environment Variables

Configuration is managed through environment variables, defined in [config/__init__.py](webapp/packages/api/user-service/config/__init__.py).

**Core Settings**:
```python
class Settings:
    # Database provider selection
    DATABASE_PROVIDER: str = os.getenv("DATABASE_PROVIDER", "memory")

    # CouchDB configuration
    COUCHDB_URL: str | None = os.getenv("COUCHDB_URL")
    COUCHDB_USER: str | None = os.getenv("COUCHDB_USER")
    COUCHDB_PASSWORD: str | None = os.getenv("COUCHDB_PASSWORD")

    # DynamoDB configuration
    DYNAMODB_REGION: str = os.getenv("DYNAMODB_REGION", "us-east-1")
    DYNAMODB_ENDPOINT_URL: str | None = os.getenv("DYNAMODB_ENDPOINT_URL")

    # Firestore uses GOOGLE_APPLICATION_CREDENTIALS (Firebase Admin SDK standard)
```

### Configuration File

Create a `.env` file in the user-service directory:

```bash
# Database Provider Selection
# Options: memory, couchdb, firestore, dynamodb
DATABASE_PROVIDER=couchdb

# CouchDB Configuration (if using couchdb)
COUCHDB_URL=http://localhost:5984
COUCHDB_USER=admin
COUCHDB_PASSWORD=password

# DynamoDB Configuration (if using dynamodb)
DYNAMODB_REGION=us-east-1
DYNAMODB_ENDPOINT_URL=http://localhost:8000  # Optional, for local DynamoDB

# Firestore Configuration (if using firestore)
# Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path
# export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

### Factory Function

The `get_database_service()` function in [__init__.py](webapp/packages/api/user-service/services/database_service/__init__.py:33-69) instantiates the correct database implementation:

```python
_db_instance: DatabaseService | None = None

def get_database_service(settings) -> DatabaseService:
    """
    Factory function to get the appropriate database service instance.
    Returns a singleton instance based on DATABASE_PROVIDER setting.
    """
    global _db_instance

    if _db_instance is not None:
        return _db_instance

    provider = settings.DATABASE_PROVIDER.lower()

    if provider == "couchdb":
        if not all([settings.COUCHDB_URL, settings.COUCHDB_USER, settings.COUCHDB_PASSWORD]):
            raise ValueError("CouchDB configuration incomplete")
        _db_instance = CouchDBService(
            settings.COUCHDB_URL,
            settings.COUCHDB_USER,
            settings.COUCHDB_PASSWORD
        )

    elif provider == "firestore":
        _db_instance = FirestoreService()

    elif provider == "dynamodb":
        _db_instance = DynamoDBService(
            region_name=settings.DYNAMODB_REGION,
            endpoint_url=settings.DYNAMODB_ENDPOINT_URL
        )

    else:  # Default to memory
        _db_instance = MemoryDatabaseService()

    return _db_instance
```

### Validation

The factory function validates required credentials and raises errors if configuration is incomplete:

```python
# Example: CouchDB validation
if not all([settings.COUCHDB_URL, settings.COUCHDB_USER, settings.COUCHDB_PASSWORD]):
    raise ValueError("CouchDB requires COUCHDB_URL, COUCHDB_USER, and COUCHDB_PASSWORD")
```

### Docker Compose Configuration

For local development, [docker-compose.yml](webapp/infra/docker/docker-compose.yml) includes database services:

```yaml
services:
  couchdb:
    image: couchdb:latest
    container_name: gofannon-couchdb
    ports:
      - "5984:5984"
    environment:
      - COUCHDB_USER=${COUCHDB_USER:-admin}
      - COUCHDB_PASSWORD=${COUCHDB_PASSWORD:-password}
    volumes:
      - couchdb-data:/opt/couchdb/data
      - ./couchdb-init.sh:/docker-entrypoint-initdb.d/init.sh

  # Add DynamoDB Local for development
  dynamodb-local:
    image: amazon/dynamodb-local
    container_name: gofannon-dynamodb
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb"

volumes:
  couchdb-data:
```

---

## Implementing a New Database

This section provides a step-by-step guide to adding a new database backend to Gofannon.

### Step 1: Create Implementation File

Create a new Python file in the database service directory:

```bash
touch webapp/packages/api/user-service/services/database_service/mynewdb.py
```

### Step 2: Implement the Interface

Implement all four abstract methods from `DatabaseService`:

```python
"""
MyNewDB database service implementation.
"""
from typing import Any, Dict, List
from fastapi import HTTPException
from .base import DatabaseService


class MyNewDBService(DatabaseService):
    """Database service implementation for MyNewDB."""

    def __init__(self, connection_string: str, **options):
        """
        Initialize the MyNewDB connection.

        Args:
            connection_string: Database connection string
            **options: Additional database-specific options
        """
        # Initialize your database connection here
        self.connection_string = connection_string
        self.options = options
        self.client = None  # Your database client

        # Example connection logic:
        # self.client = mynewdb.connect(connection_string, **options)

    def _ensure_collection_exists(self, db_name: str):
        """
        Ensure the collection/table exists.
        Create it if it doesn't exist (if your database requires this).
        """
        # Example:
        # if not self.client.collection_exists(db_name):
        #     self.client.create_collection(db_name)
        pass

    def get(self, db_name: str, doc_id: str) -> Dict[str, Any]:
        """
        Retrieve a document by ID.

        Args:
            db_name: Collection/table name
            doc_id: Document identifier

        Returns:
            Document as dictionary

        Raises:
            HTTPException(404): If document not found
        """
        try:
            # Example implementation:
            # collection = self.client.collection(db_name)
            # doc = collection.find_one({"_id": doc_id})
            # if doc is None:
            #     raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
            # return doc

            raise NotImplementedError("Implement document retrieval")

        except Exception as e:
            # Handle database-specific exceptions
            if "not found" in str(e).lower():
                raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    def save(self, db_name: str, doc_id: str, doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save (create or update) a document.

        Args:
            db_name: Collection/table name
            doc_id: Document identifier
            doc: Document data

        Returns:
            Dictionary with {"id": doc_id, "rev": revision_id}
        """
        try:
            # Ensure collection exists (if needed)
            self._ensure_collection_exists(db_name)

            # Add document ID to the document
            doc["_id"] = doc_id

            # Example implementation:
            # collection = self.client.collection(db_name)
            # result = collection.replace_one(
            #     {"_id": doc_id},
            #     doc,
            #     upsert=True  # Create if doesn't exist
            # )
            #
            # # Get revision/version info if your database supports it
            # rev = result.get("revision") or "v1"
            #
            # return {"id": doc_id, "rev": rev}

            raise NotImplementedError("Implement document save")

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save document: {str(e)}")

    def delete(self, db_name: str, doc_id: str) -> None:
        """
        Delete a document by ID.

        Args:
            db_name: Collection/table name
            doc_id: Document identifier

        Raises:
            HTTPException(404): If document not found
        """
        try:
            # Example implementation:
            # collection = self.client.collection(db_name)
            # result = collection.delete_one({"_id": doc_id})
            #
            # if result.deleted_count == 0:
            #     raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

            raise NotImplementedError("Implement document deletion")

        except HTTPException:
            raise  # Re-raise HTTPException
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

    def list_all(self, db_name: str) -> List[Dict[str, Any]]:
        """
        List all documents in a collection.

        Args:
            db_name: Collection/table name

        Returns:
            List of documents
        """
        try:
            # Example implementation:
            # collection = self.client.collection(db_name)
            # documents = list(collection.find({}))
            # return documents

            # If collection doesn't exist, return empty list
            # try:
            #     self._ensure_collection_exists(db_name)
            # except:
            #     return []

            raise NotImplementedError("Implement list all documents")

        except Exception as e:
            # Some databases may not have the collection yet
            return []
```

### Step 3: Add Configuration Settings

Update [config/__init__.py](webapp/packages/api/user-service/config/__init__.py) to include your database settings:

```python
class Settings:
    # Existing settings...

    # MyNewDB configuration
    MYNEWDB_CONNECTION_STRING: str | None = os.getenv("MYNEWDB_CONNECTION_STRING")
    MYNEWDB_DATABASE: str = os.getenv("MYNEWDB_DATABASE", "gofannon")
    MYNEWDB_OPTION_1: str | None = os.getenv("MYNEWDB_OPTION_1")
    # Add other configuration options as needed
```

### Step 4: Update Factory Function

Update [__init__.py](webapp/packages/api/user-service/services/database_service/__init__.py) to include your implementation:

```python
from .mynewdb import MyNewDBService

def get_database_service(settings) -> DatabaseService:
    """Factory function to get the appropriate database service instance."""
    global _db_instance

    if _db_instance is not None:
        return _db_instance

    provider = settings.DATABASE_PROVIDER.lower()

    # Existing implementations...

    elif provider == "mynewdb":
        # Validate required configuration
        if not settings.MYNEWDB_CONNECTION_STRING:
            raise ValueError("MyNewDB requires MYNEWDB_CONNECTION_STRING")

        _db_instance = MyNewDBService(
            connection_string=settings.MYNEWDB_CONNECTION_STRING,
            database=settings.MYNEWDB_DATABASE,
            option_1=settings.MYNEWDB_OPTION_1
        )

    else:
        # Default to memory
        _db_instance = MemoryDatabaseService()

    return _db_instance
```

### Step 5: Add Dependencies

If your database requires additional Python packages, update the requirements:

```bash
# Add to webapp/packages/api/user-service/requirements.txt
mynewdb-client>=1.0.0
```

Or in `pyproject.toml`:
```toml
[project]
dependencies = [
    # ... existing dependencies
    "mynewdb-client>=1.0.0",
]
```

### Step 6: Write Unit Tests

Create comprehensive tests following the pattern in [test_memory_database_service.py](webapp/packages/api/user-service/tests/unit/services/test_memory_database_service.py):

```python
"""
Unit tests for MyNewDB database service implementation.
"""
import pytest
from fastapi import HTTPException
from services.database_service.mynewdb import MyNewDBService


@pytest.fixture
def db_service():
    """Create a MyNewDB service instance for testing."""
    service = MyNewDBService(
        connection_string="test://localhost:1234/testdb"
    )
    yield service
    # Cleanup after tests
    service.client.close()


class TestMyNewDBService:
    """Test suite for MyNewDB database service."""

    def test_save_and_get(self, db_service):
        """Test saving and retrieving a document."""
        doc = {"name": "Test Agent", "value": 42}

        # Save document
        result = db_service.save("agents", "test-id", doc)
        assert result["id"] == "test-id"
        assert "rev" in result

        # Retrieve document
        retrieved = db_service.get("agents", "test-id")
        assert retrieved["_id"] == "test-id"
        assert retrieved["name"] == "Test Agent"
        assert retrieved["value"] == 42

    def test_get_nonexistent_document(self, db_service):
        """Test retrieving a document that doesn't exist."""
        with pytest.raises(HTTPException) as exc_info:
            db_service.get("agents", "nonexistent-id")
        assert exc_info.value.status_code == 404

    def test_update_document(self, db_service):
        """Test updating an existing document."""
        # Create initial document
        doc = {"name": "Original", "value": 1}
        db_service.save("agents", "test-id", doc)

        # Update document
        updated_doc = {"name": "Updated", "value": 2}
        result = db_service.save("agents", "test-id", updated_doc)
        assert result["id"] == "test-id"

        # Verify update
        retrieved = db_service.get("agents", "test-id")
        assert retrieved["name"] == "Updated"
        assert retrieved["value"] == 2

    def test_delete(self, db_service):
        """Test deleting a document."""
        # Create document
        doc = {"name": "To Delete"}
        db_service.save("agents", "test-id", doc)

        # Delete document
        db_service.delete("agents", "test-id")

        # Verify deletion
        with pytest.raises(HTTPException) as exc_info:
            db_service.get("agents", "test-id")
        assert exc_info.value.status_code == 404

    def test_delete_nonexistent_document(self, db_service):
        """Test deleting a document that doesn't exist."""
        with pytest.raises(HTTPException) as exc_info:
            db_service.delete("agents", "nonexistent-id")
        assert exc_info.value.status_code == 404

    def test_list_all(self, db_service):
        """Test listing all documents in a collection."""
        # Create multiple documents
        db_service.save("agents", "id-1", {"name": "Agent 1"})
        db_service.save("agents", "id-2", {"name": "Agent 2"})
        db_service.save("agents", "id-3", {"name": "Agent 3"})

        # List all documents
        documents = db_service.list_all("agents")
        assert len(documents) == 3

        # Verify all documents are present
        ids = {doc["_id"] for doc in documents}
        assert ids == {"id-1", "id-2", "id-3"}

    def test_list_all_empty_collection(self, db_service):
        """Test listing documents from an empty collection."""
        documents = db_service.list_all("empty-collection")
        assert documents == []

    def test_multiple_collections(self, db_service):
        """Test that collections are isolated from each other."""
        # Save to different collections
        db_service.save("agents", "id-1", {"type": "agent"})
        db_service.save("users", "id-1", {"type": "user"})

        # Verify isolation
        agent = db_service.get("agents", "id-1")
        user = db_service.get("users", "id-1")

        assert agent["type"] == "agent"
        assert user["type"] == "user"
```

Run tests:
```bash
cd webapp/packages/api/user-service
pytest tests/unit/services/test_mynewdb_database_service.py -v
```

### Step 7: Add Docker Support (Optional)

If your database requires a service, add it to [docker-compose.yml](webapp/infra/docker/docker-compose.yml):

```yaml
services:
  mynewdb:
    image: mynewdb:latest
    container_name: gofannon-mynewdb
    ports:
      - "9999:9999"  # Adjust port as needed
    environment:
      - MYNEWDB_USER=${MYNEWDB_USER:-admin}
      - MYNEWDB_PASSWORD=${MYNEWDB_PASSWORD:-password}
    volumes:
      - mynewdb-data:/var/lib/mynewdb/data
    healthcheck:
      test: ["CMD", "mynewdb-healthcheck"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mynewdb-data:
```

### Step 8: Update Documentation

Add your database to this documentation:

1. Add a new section under "Existing Database Implementations"
2. Document configuration requirements
3. Add any special considerations
4. Provide setup instructions

### Step 9: Integration Testing

Test your implementation with the full application:

```bash
# Set environment variables
export DATABASE_PROVIDER=mynewdb
export MYNEWDB_CONNECTION_STRING=mynewdb://localhost:9999/gofannon

# Start the application
cd webapp/packages/api/user-service
uvicorn main:app --reload

# Test API endpoints
curl http://localhost:8000/agents
```

### Common Implementation Patterns

#### Pattern 1: Auto-Create Collections

Some databases require explicit collection creation:

```python
def _ensure_collection_exists(self, db_name: str):
    """Create collection if it doesn't exist."""
    if not self.client.collection_exists(db_name):
        self.client.create_collection(db_name)
        # Add indexes if needed
        self.client.create_index(db_name, "_id", unique=True)
```

#### Pattern 2: Connection Pooling

For production use, implement connection pooling:

```python
def __init__(self, connection_string: str, pool_size: int = 10):
    self.pool = mynewdb.ConnectionPool(
        connection_string,
        max_connections=pool_size,
        min_connections=2
    )

def get(self, db_name: str, doc_id: str) -> Dict[str, Any]:
    with self.pool.get_connection() as conn:
        # Use connection
        return conn.get(db_name, doc_id)
```

#### Pattern 3: Type Conversion

Handle database-specific type requirements:

```python
def _prepare_document(self, doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert Python types to database-compatible types."""
    prepared = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            prepared[key] = value.isoformat()
        elif isinstance(value, Decimal):
            prepared[key] = float(value)
        else:
            prepared[key] = value
    return prepared
```

#### Pattern 4: Error Mapping

Map database-specific exceptions to HTTP exceptions:

```python
def _handle_error(self, error: Exception, operation: str) -> HTTPException:
    """Map database errors to HTTP exceptions."""
    error_str = str(error).lower()

    if "not found" in error_str or "does not exist" in error_str:
        return HTTPException(status_code=404, detail=f"{operation} failed: not found")

    if "conflict" in error_str or "already exists" in error_str:
        return HTTPException(status_code=409, detail=f"{operation} failed: conflict")

    if "permission" in error_str or "unauthorized" in error_str:
        return HTTPException(status_code=403, detail=f"{operation} failed: permission denied")

    return HTTPException(status_code=500, detail=f"{operation} failed: {str(error)}")
```

### Implementation Checklist

- [ ] Create implementation file in `database_service/`
- [ ] Implement all abstract methods from `DatabaseService`
- [ ] Handle document ID storage (`_id` field)
- [ ] Return proper format from `save()` method
- [ ] Raise `HTTPException(404)` for missing documents
- [ ] Add configuration settings to `config/__init__.py`
- [ ] Update factory function in `__init__.py`
- [ ] Add dependencies to `requirements.txt`
- [ ] Write comprehensive unit tests
- [ ] Test with actual database instance
- [ ] Add Docker Compose service (if applicable)
- [ ] Update this documentation
- [ ] Test integration with API endpoints
- [ ] Verify all six collections work correctly
- [ ] Test error handling and edge cases
- [ ] Document any special considerations

---

## Testing

### Unit Tests

Unit tests are located in:
```
webapp/packages/api/user-service/tests/unit/services/
├── test_database_service_base.py       # Abstract interface tests
└── test_memory_database_service.py     # Memory implementation tests
```

#### Running Unit Tests

```bash
cd webapp/packages/api/user-service

# Run all database tests
pytest tests/unit/services/test_*database*.py -v

# Run specific test file
pytest tests/unit/services/test_memory_database_service.py -v

# Run specific test
pytest tests/unit/services/test_memory_database_service.py::TestMemoryDatabaseService::test_save_and_get -v

# Run with coverage
pytest tests/unit/services/ --cov=services/database_service --cov-report=html
```

#### Test Structure

Tests validate:

1. **CRUD Operations**:
   - Creating documents with `save()`
   - Reading documents with `get()`
   - Updating documents with `save()`
   - Deleting documents with `delete()`

2. **Error Handling**:
   - 404 errors for missing documents
   - Conflict handling (if applicable)
   - Invalid input handling

3. **Collection Operations**:
   - Listing all documents with `list_all()`
   - Collection isolation
   - Empty collection handling

4. **Edge Cases**:
   - Updating non-existent documents
   - Deleting non-existent documents
   - Special characters in IDs
   - Large documents

#### Example Test

```python
def test_save_and_get(db_service):
    """Test saving and retrieving a document."""
    doc = {"name": "Test Agent", "description": "A test agent"}

    # Save document
    result = db_service.save("agents", "test-id", doc)
    assert result["id"] == "test-id"
    assert "rev" in result

    # Retrieve document
    retrieved = db_service.get("agents", "test-id")
    assert retrieved["_id"] == "test-id"
    assert retrieved["name"] == "Test Agent"
```

### Integration Tests

Integration tests verify the database service works with the full API:

```bash
# Start the application with your database
export DATABASE_PROVIDER=couchdb
uvicorn main:app --reload

# In another terminal, run integration tests
pytest tests/integration/ -v
```

### Manual Testing

Use the API endpoints to test database operations:

```bash
# Create an agent
curl -X POST http://localhost:8000/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Agent", "code": "print(\"hello\")"}'

# Get the agent
curl http://localhost:8000/agents/{agent_id}

# Update the agent
curl -X PUT http://localhost:8000/agents/{agent_id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Agent", "code": "print(\"updated\")"}'

# Delete the agent
curl -X DELETE http://localhost:8000/agents/{agent_id}

# List all agents
curl http://localhost:8000/agents
```

### Testing Best Practices

1. **Use Test Fixtures**: Create reusable test database instances
2. **Isolate Tests**: Each test should clean up after itself
3. **Test Error Paths**: Verify proper exception handling
4. **Mock External Services**: Don't require real database connections for unit tests
5. **Test Concurrency**: Verify thread-safety if applicable
6. **Performance Tests**: Ensure operations complete in reasonable time
7. **Integration Tests**: Test with actual database instances in CI/CD

---

## Troubleshooting

### Common Issues

#### 1. "Database provider not found"

**Error**: `ValueError: Unknown database provider: xyz`

**Solution**:
- Check `DATABASE_PROVIDER` environment variable
- Ensure it matches one of: `memory`, `couchdb`, `firestore`, `dynamodb`
- Verify the provider is imported in `__init__.py`

#### 2. "Connection refused"

**Error**: `ConnectionError: Failed to connect to database`

**Solution**:
- Verify database service is running
- Check connection string/URL is correct
- Ensure firewall allows connection
- For Docker: verify service is in same network

#### 3. "Document not found" on list_all

**Issue**: `list_all()` raises 404 instead of returning empty list

**Solution**: Ensure implementation returns `[]` for non-existent collections:
```python
def list_all(self, db_name: str) -> List[Dict[str, Any]]:
    try:
        # ... implementation
    except CollectionNotFoundError:
        return []  # Don't raise exception
```

#### 4. "Missing _id field"

**Issue**: Documents don't have `_id` field

**Solution**: Add `_id` to document in `save()` method:
```python
def save(self, db_name: str, doc_id: str, doc: Dict[str, Any]):
    doc["_id"] = doc_id  # Ensure _id is present
    # ... rest of implementation
```

#### 5. "Float can't be serialized" (DynamoDB)

**Issue**: `TypeError: Float types are not supported`

**Solution**: Convert floats to Decimal:
```python
from decimal import Decimal

def _convert_floats(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    # Handle dicts and lists recursively
```

#### 6. "Revision conflict" (CouchDB)

**Issue**: `409 Conflict: Document update conflict`

**Solution**: Fetch current revision before update:
```python
try:
    existing = db[doc_id]
    doc["_rev"] = existing["_rev"]
except ResourceNotFound:
    pass  # New document, no revision needed
```

### Debugging Tips

1. **Enable Debug Logging**:
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

2. **Check Database Logs**: Most databases have detailed logs
   - CouchDB: `/_utils` web UI
   - DynamoDB: CloudWatch Logs
   - Firestore: Google Cloud Console

3. **Test Connectivity**:
   ```bash
   # CouchDB
   curl http://localhost:5984

   # DynamoDB Local
   aws dynamodb list-tables --endpoint-url http://localhost:8000
   ```

4. **Verify Environment Variables**:
   ```bash
   env | grep DATABASE
   env | grep COUCHDB
   env | grep DYNAMODB
   ```

5. **Use Database Client Tools**:
   - CouchDB: Fauxton web UI (http://localhost:5984/_utils)
   - DynamoDB: AWS Console or NoSQL Workbench
   - Firestore: Firebase Console

---

## Performance Considerations

### General Guidelines

1. **Connection Pooling**: Reuse database connections
2. **Batch Operations**: Implement batch read/write if supported
3. **Indexing**: Add indexes for frequently queried fields
4. **Caching**: Consider caching frequently accessed documents
5. **Pagination**: Implement pagination for `list_all()` on large collections

### Database-Specific Optimizations

#### CouchDB
- Use views for complex queries
- Enable compression for large documents
- Configure compaction schedule
- Use replication for read scaling

#### Firestore
- Minimize document reads (each counts toward quota)
- Use collection group queries for cross-collection queries
- Batch writes when possible (up to 500 operations)
- Use server timestamps instead of client timestamps

#### DynamoDB
- Use batch operations (BatchGetItem, BatchWriteItem)
- Implement pagination with LastEvaluatedKey
- Use query() instead of scan() when possible
- Consider provisioned capacity for predictable workloads
- Use DAX for caching read-heavy workloads

### Monitoring

Monitor these metrics for production deployments:

- **Latency**: Time for get/save/delete/list_all operations
- **Throughput**: Requests per second
- **Error Rate**: Failed operations percentage
- **Connection Pool**: Active/idle connections
- **Storage**: Database size growth
- **Costs**: For cloud-based databases

---

## Security Best Practices

1. **Authentication**: Always require credentials for production databases
2. **Encryption**: Use TLS/SSL for connections
3. **Least Privilege**: Database user should have minimal required permissions
4. **Secrets Management**: Use environment variables or secret managers, never hardcode credentials
5. **Input Validation**: Validate document IDs and data before database operations
6. **Audit Logging**: Enable audit logs for compliance
7. **Network Security**: Restrict database access to application servers only
8. **Regular Updates**: Keep database software and client libraries updated

---

## Migration Guide

### Migrating Between Databases

To migrate data from one database to another:

```python
from services.database_service import get_database_service
from config import Settings

# Source database
source_settings = Settings(DATABASE_PROVIDER="couchdb")
source_db = get_database_service(source_settings)

# Target database
target_settings = Settings(DATABASE_PROVIDER="dynamodb")
target_db = get_database_service(target_settings)

# Collections to migrate
collections = ["agents", "deployments", "users", "sessions", "tickets", "demos"]

# Migrate each collection
for collection in collections:
    print(f"Migrating {collection}...")
    documents = source_db.list_all(collection)

    for doc in documents:
        doc_id = doc.pop("_id")
        # Remove source-specific fields
        doc.pop("_rev", None)

        # Save to target
        target_db.save(collection, doc_id, doc)
        print(f"  Migrated {doc_id}")

    print(f"Completed {collection}: {len(documents)} documents")
```

### Data Export/Import

Export data to JSON for backup:

```bash
python scripts/export_database.py --output backup.json
python scripts/import_database.py --input backup.json --target dynamodb
```

---

## Additional Resources

### Code References

- Abstract base class: [base.py](webapp/packages/api/user-service/services/database_service/base.py)
- Factory function: [__init__.py](webapp/packages/api/user-service/services/database_service/__init__.py:33-69)
- Configuration: [config/__init__.py](webapp/packages/api/user-service/config/__init__.py)
- Dependency injection: [dependencies.py](webapp/packages/api/user-service/dependencies.py:27-30)

### Database Documentation

- **CouchDB**: https://docs.couchdb.org/
- **Firestore**: https://firebase.google.com/docs/firestore
- **DynamoDB**: https://docs.aws.amazon.com/dynamodb/
- **Python CouchDB**: https://couchdb-python.readthedocs.io/
- **Firebase Admin SDK**: https://firebase.google.com/docs/admin/setup
- **Boto3 (DynamoDB)**: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html

### Related Documentation

- [LLM Provider Configuration](llm-provider-configuration.md)
- [Developer Quickstart](developers-quickstart.md)
- API Documentation (coming soon)

---

## Appendix

### Full Example: PostgreSQL Implementation

Here's a complete example implementing PostgreSQL support:

```python
"""
PostgreSQL database service implementation.
"""
from typing import Any, Dict, List
import psycopg2
import psycopg2.extras
from psycopg2 import sql
from fastapi import HTTPException
from .base import DatabaseService


class PostgreSQLService(DatabaseService):
    """Database service implementation for PostgreSQL."""

    def __init__(self, connection_string: str):
        """
        Initialize PostgreSQL connection.

        Args:
            connection_string: PostgreSQL connection string
                               Format: postgresql://user:password@host:port/database
        """
        self.connection_string = connection_string
        self.conn = psycopg2.connect(connection_string)
        self.conn.autocommit = True

    def _ensure_table_exists(self, db_name: str):
        """Create table if it doesn't exist."""
        with self.conn.cursor() as cursor:
            cursor.execute(
                sql.SQL("""
                    CREATE TABLE IF NOT EXISTS {} (
                        _id TEXT PRIMARY KEY,
                        data JSONB NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """).format(sql.Identifier(db_name))
            )
            # Create index on JSONB data for faster queries
            cursor.execute(
                sql.SQL("CREATE INDEX IF NOT EXISTS {}_data_idx ON {} USING GIN (data)").format(
                    sql.Identifier(f"{db_name}_data_idx"),
                    sql.Identifier(db_name)
                )
            )

    def get(self, db_name: str, doc_id: str) -> Dict[str, Any]:
        """Retrieve a document by ID."""
        self._ensure_table_exists(db_name)

        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute(
                sql.SQL("SELECT data FROM {} WHERE _id = %s").format(sql.Identifier(db_name)),
                (doc_id,)
            )
            result = cursor.fetchone()

            if result is None:
                raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

            doc = dict(result["data"])
            doc["_id"] = doc_id
            return doc

    def save(self, db_name: str, doc_id: str, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Save (create or update) a document."""
        self._ensure_table_exists(db_name)

        doc["_id"] = doc_id

        with self.conn.cursor() as cursor:
            cursor.execute(
                sql.SQL("""
                    INSERT INTO {} (_id, data, updated_at)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (_id)
                    DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
                    RETURNING updated_at
                """).format(sql.Identifier(db_name)),
                (doc_id, psycopg2.extras.Json(doc))
            )
            result = cursor.fetchone()
            rev = result[0].isoformat() if result else "v1"

        return {"id": doc_id, "rev": rev}

    def delete(self, db_name: str, doc_id: str) -> None:
        """Delete a document by ID."""
        self._ensure_table_exists(db_name)

        with self.conn.cursor() as cursor:
            cursor.execute(
                sql.SQL("DELETE FROM {} WHERE _id = %s RETURNING _id").format(sql.Identifier(db_name)),
                (doc_id,)
            )

            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

    def list_all(self, db_name: str) -> List[Dict[str, Any]]:
        """List all documents in a table."""
        try:
            self._ensure_table_exists(db_name)
        except:
            return []

        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute(
                sql.SQL("SELECT _id, data FROM {}").format(sql.Identifier(db_name))
            )
            results = cursor.fetchall()

        documents = []
        for row in results:
            doc = dict(row["data"])
            doc["_id"] = row["_id"]
            documents.append(doc)

        return documents

    def __del__(self):
        """Close connection on cleanup."""
        if hasattr(self, 'conn'):
            self.conn.close()
```

This PostgreSQL implementation demonstrates:
- Table auto-creation with proper schema
- JSONB for document storage
- GIN index for fast JSON queries
- Upsert logic with `ON CONFLICT`
- Proper SQL injection prevention with parameterized queries
- Connection cleanup

---

**Document Version**: 1.0
**Last Updated**: 2026-01-11
**Maintainer**: Gofannon Development Team
