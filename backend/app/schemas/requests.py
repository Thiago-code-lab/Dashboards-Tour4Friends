from datetime import date as Date
from typing import Literal

from pydantic import EmailStr, Field, SecretStr, field_validator

from app.schemas.domain import BookingStatus, Category, Contract, Id, Money, Text

Role = Literal["admin", "manager", "analyst", "viewer"]


class LoginRequest(Contract):
    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def lowercase(cls, value: str) -> str:
        return value.lower()


class UserCreate(LoginRequest):
    password: SecretStr = Field(min_length=12, max_length=128)
    name: str = Field(min_length=2, max_length=100)
    role: Role


class VersionedPatch(Contract):
    expected_version: int = Field(ge=1)


class UserPatch(VersionedPatch):
    active: bool | None = None
    role: Role | None = None


class BookingPatch(VersionedPatch):
    category: Category | None = None
    status: BookingStatus | None = None
    total_amount: Money | None = None
    form_complete: bool | None = None
    cancellation_reason: str | None = Field(default=None, max_length=600)
    traveler_ids: list[Id] | None = Field(default=None, min_length=1, max_length=20)


class DeparturePatch(VersionedPatch):
    date: Date | None = None
    end_date: Date | None = None
    capacity: int | None = Field(default=None, gt=0, le=10000)
    transfer_confirmed: bool | None = None
    transfer_due: Date | None = None


class AllocationPatch(VersionedPatch):
    capacity: int | None = Field(default=None, gt=0, le=10000)
    confirmed: bool | None = None


class CostPatch(VersionedPatch):
    amount: Money | None = None
    budget: Money | None = None
    category: Text | None = None
    status: Literal["realized", "estimated"] | None = None


class AlertPatch(Contract):
    expected_version: int = Field(ge=0)
    status: Literal["open", "reviewed", "resolved"]
    note: str = Field(default="", max_length=1000)


class CommitImport(Contract):
    batch_id: str = Field(min_length=36, max_length=36)
    validation_token: str = Field(min_length=40, max_length=100)
