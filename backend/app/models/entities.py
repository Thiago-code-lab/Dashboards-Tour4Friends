from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

JSON_TYPE = JSON().with_variant(JSONB, "postgresql")
MONEY = Numeric(14, 2)
CATEGORY_CHECK = "category IN ('Premium','Conforto','Alternativa')"


class Base(DeclarativeBase):
    pass


class Entity:
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, server_default="1", default=1)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", default=0)


class DatasetMetadata(Base):
    __tablename__ = "dataset_metadata"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON_TYPE)
    seed_digest: Mapped[str] = mapped_column(String(64))
    __table_args__ = (CheckConstraint("id = 1", name="metadata_singleton"),)


class Route(Entity, Base):
    __tablename__ = "routes"
    name: Mapped[str] = mapped_column(String(80))
    short_name: Mapped[str] = mapped_column(String(80))
    modality: Mapped[str] = mapped_column(String(20), index=True)
    country: Mapped[str] = mapped_column(String(80))
    days: Mapped[int] = mapped_column(Integer)
    distance_km: Mapped[int] = mapped_column(Integer)
    stages: Mapped[list[str]] = mapped_column(JSON_TYPE)
    __table_args__ = (
        CheckConstraint("days > 0 AND distance_km >= 0", name="route_quantities"),
        CheckConstraint("modality IN ('A pé','Bicicleta','Cultural')", name="route_modality"),
    )


class Customer(Entity, Base):
    __tablename__ = "customers"
    label: Mapped[str] = mapped_column(String(80))


class Lead(Entity, Base):
    __tablename__ = "leads"
    route_id: Mapped[str] = mapped_column(ForeignKey("routes.id"), index=True)
    category: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[date] = mapped_column(Date, index=True)
    channel: Mapped[str] = mapped_column(String(80), index=True)
    stage: Mapped[str] = mapped_column(String(20))
    potential_value: Mapped[Decimal] = mapped_column(MONEY)
    __table_args__ = (
        CheckConstraint(CATEGORY_CHECK, name="lead_category"),
        CheckConstraint("stage IN ('new','qualified','proposal','won','lost')", name="lead_stage"),
        CheckConstraint("potential_value >= 0", name="lead_value"),
    )


class Departure(Entity, Base):
    __tablename__ = "departures"
    route_id: Mapped[str] = mapped_column(ForeignKey("routes.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date)
    capacity: Mapped[int] = mapped_column(Integer)
    transfer_confirmed: Mapped[bool] = mapped_column(Boolean)
    transfer_due: Mapped[date] = mapped_column(Date)
    __table_args__ = (
        CheckConstraint("capacity > 0", name="departure_capacity"),
        CheckConstraint("date <= end_date AND transfer_due <= date", name="departure_dates"),
    )


class Booking(Entity, Base):
    __tablename__ = "bookings"
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), index=True)
    lead_id: Mapped[str] = mapped_column(ForeignKey("leads.id"), unique=True)
    departure_id: Mapped[str] = mapped_column(ForeignKey("departures.id"), index=True)
    booked_at: Mapped[date] = mapped_column(Date, index=True)
    confirmed_at: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), index=True)
    category: Mapped[str] = mapped_column(String(20), index=True)
    total_amount: Mapped[Decimal] = mapped_column(MONEY)
    form_complete: Mapped[bool] = mapped_column(Boolean)
    cancellation_reason: Mapped[str | None] = mapped_column(String(600))
    __table_args__ = (
        CheckConstraint("status IN ('confirmed','pending','cancelled')", name="booking_status"),
        CheckConstraint(CATEGORY_CHECK, name="booking_category"),
        CheckConstraint("total_amount >= 0", name="booking_amount"),
        CheckConstraint("confirmed_at IS NULL OR confirmed_at >= booked_at", name="booking_dates"),
        CheckConstraint(
            "status != 'confirmed' OR confirmed_at IS NOT NULL", name="booking_confirmation"
        ),
        CheckConstraint("status != 'pending' OR confirmed_at IS NULL", name="booking_pending"),
        UniqueConstraint("id", "departure_id", "status", name="booking_traveler_target"),
    )


class BookingTraveler(Base):
    __tablename__ = "booking_travelers"
    booking_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), primary_key=True)
    departure_id: Mapped[str] = mapped_column(ForeignKey("departures.id"), index=True)
    status: Mapped[str] = mapped_column(String(20))
    position: Mapped[int] = mapped_column(Integer)
    __table_args__ = (
        ForeignKeyConstraint(
            ["booking_id", "departure_id", "status"],
            ["bookings.id", "bookings.departure_id", "bookings.status"],
            ondelete="CASCADE",
            onupdate="CASCADE",
            name="traveler_booking_fk",
        ),
        UniqueConstraint("booking_id", "position", name="traveler_order_unique"),
        CheckConstraint("position >= 0 AND position < 20", name="traveler_position"),
        Index(
            "traveler_one_active_departure",
            "departure_id",
            "customer_id",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
        ),
    )


class Partner(Entity, Base):
    __tablename__ = "partners"
    name: Mapped[str] = mapped_column(String(80))
    route_id: Mapped[str] = mapped_column(ForeignKey("routes.id"), index=True)
    locality: Mapped[str] = mapped_column(String(80))


class Allocation(Entity, Base):
    __tablename__ = "accommodation_allocations"
    departure_id: Mapped[str] = mapped_column(ForeignKey("departures.id"), index=True)
    partner_id: Mapped[str] = mapped_column(ForeignKey("partners.id"), index=True)
    locality: Mapped[str] = mapped_column(String(80))
    date: Mapped[date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(20), index=True)
    capacity: Mapped[int] = mapped_column(Integer)
    confirmed: Mapped[bool] = mapped_column(Boolean)
    __table_args__ = (
        CheckConstraint("capacity > 0", name="allocation_capacity"),
        CheckConstraint(CATEGORY_CHECK, name="allocation_category"),
        UniqueConstraint(
            "departure_id", "date", "locality", "category", name="allocation_slot_unique"
        ),
    )


class Cost(Entity, Base):
    __tablename__ = "operational_costs"
    departure_id: Mapped[str] = mapped_column(ForeignKey("departures.id"), index=True)
    category: Mapped[str] = mapped_column(String(80))
    date: Mapped[date] = mapped_column(Date, index=True)
    budget: Mapped[Decimal] = mapped_column(MONEY)
    amount: Mapped[Decimal] = mapped_column(MONEY)
    status: Mapped[str] = mapped_column(String(20))
    __table_args__ = (
        CheckConstraint("budget >= 0 AND amount >= 0", name="cost_amounts"),
        CheckConstraint("status IN ('realized','estimated')", name="cost_status"),
    )


class Payment(Entity, Base):
    __tablename__ = "payments"
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(MONEY)
    __table_args__ = (CheckConstraint("amount >= 0", name="payment_amount"),)


class Feedback(Entity, Base):
    __tablename__ = "feedback"
    booking_id: Mapped[str] = mapped_column(ForeignKey("bookings.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    nps: Mapped[int] = mapped_column(Integer)
    service: Mapped[int] = mapped_column(Integer)
    accommodation: Mapped[int] = mapped_column(Integer)
    logistics: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(String(600))
    __table_args__ = (
        CheckConstraint(
            "nps BETWEEN 0 AND 10 AND service BETWEEN 0 AND 10 AND accommodation BETWEEN 0 AND 10 AND logistics BETWEEN 0 AND 10",
            name="feedback_scores",
        ),
    )


class User(Entity, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(254), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        CheckConstraint("role IN ('admin','manager','analyst','viewer')", name="user_role"),
        CheckConstraint("email = lower(email)", name="user_email_normalized"),
    )


class UserSession(Base):
    __tablename__ = "user_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("expires_at > created_at", name="session_expiration"),)


class AlertStatus(Entity, Base):
    __tablename__ = "alert_statuses"
    status: Mapped[str] = mapped_column(String(20))
    note: Mapped[str] = mapped_column(String(1000), default="")
    updated_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        CheckConstraint("status IN ('open','reviewed','resolved')", name="alert_status_value"),
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(60))
    before_data: Mapped[dict[str, Any] | None] = mapped_column(JSON_TYPE)
    after_data: Mapped[dict[str, Any] | None] = mapped_column(JSON_TYPE)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    request_id: Mapped[str] = mapped_column(String(36))
    __table_args__ = (
        Index("audit_entity_time", "entity_type", "entity_id", "occurred_at"),
        Index("audit_action_time", "action", "occurred_at"),
    )


class ImportBatch(Base):
    __tablename__ = "import_batches"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    actor_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    content_hash: Mapped[str] = mapped_column(String(64))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="validated")
    payload: Mapped[list[dict[str, Any]]] = mapped_column(JSON_TYPE)
    row_count: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    committed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        CheckConstraint(
            "status IN ('validated','committed') AND row_count BETWEEN 1 AND 500",
            name="import_valid_state",
        ),
        Index(
            "import_commit_once",
            "content_hash",
            unique=True,
            postgresql_where=text("status = 'committed'"),
        ),
    )
