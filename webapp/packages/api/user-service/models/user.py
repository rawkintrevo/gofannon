# webapp/packages/api/user-service/models/user.py
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class UserBudget(BaseModel):
    id: str = Field(..., alias="_id")
    email: Optional[str] = None
    spend_remaining: float = Field(0.0, alias="spendRemaining")
    monthly_allowance: float = Field(0.0, alias="monthlyAllowance")
    refill_date: Optional[date] = Field(None, alias="refillDate")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")
    rev: Optional[str] = Field(None, alias="_rev")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class UpdateUserBudgetRequest(BaseModel):
    email: Optional[str] = None
    spend_remaining: Optional[float] = Field(None, alias="spendRemaining")
    monthly_allowance: Optional[float] = Field(None, alias="monthlyAllowance")
    refill_date: Optional[date] = Field(None, alias="refillDate")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")
