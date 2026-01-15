import os
import uuid
import pytest
from decimal import Decimal
from fastapi import HTTPException
from services.database_service.dynamodb import DynamoDBService

# We assume environment variables are set as per instructions, 
# but checking DYNAMODB_ENDPOINT_URL is a good safety measure to avoid 
# running against real production AWS by accident if not intended, 
# or to skip if environment is not set up.
@pytest.mark.skipif(not os.getenv("DYNAMODB_ENDPOINT_URL"), reason="DynamoDB endpoint not configured")
class TestDynamoDBIntegration:
    @pytest.fixture
    def db(self):
        region = os.getenv("DYNAMODB_REGION", "us-east-1")
        endpoint = os.getenv("DYNAMODB_ENDPOINT_URL")
        key = os.getenv("AWS_ACCESS_KEY_ID", "test")
        secret = os.getenv("AWS_SECRET_ACCESS_KEY", "test")
        
        return DynamoDBService(
            region_name=region,
            endpoint_url=endpoint,
            aws_access_key_id=key,
            aws_secret_access_key=secret
        )

    def test_crud_operations(self, db):
        table_name = "test_integration_table"
        doc_id = str(uuid.uuid4())
        doc_data = {"name": "Test Item", "value": 123.45, "nested": {"sub_value": 67.89}}

        # 1. Save (Create)
        saved = db.save(table_name, doc_id, doc_data)
        assert saved["id"] == doc_id
        
        # 2. Get (Read)
        retrieved = db.get(table_name, doc_id)
        assert retrieved["_id"] == doc_id
        assert retrieved["name"] == "Test Item"
        # Verify Decimal conversion happened
        assert retrieved["value"] == Decimal("123.45")
        assert retrieved["nested"]["sub_value"] == Decimal("67.89")

        # 3. List (Read All)
        # We might have other items from other tests if we don't clean up, 
        # but we just check if OUR item is in the list.
        all_items = db.list_all(table_name)
        assert any(item["_id"] == doc_id for item in all_items)

        # 4. Delete
        db.delete(table_name, doc_id)

        # 5. Verify deletion
        with pytest.raises(HTTPException) as excinfo:
             db.get(table_name, doc_id)
        assert excinfo.value.status_code == 404
