from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_serializer, model_validator
from pydantic.alias_generators import to_camel

Id = Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")]
Text = Annotated[str, Field(min_length=1, max_length=80)]
Money = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2, allow_inf_nan=False)]
Category = Literal["Premium", "Conforto", "Alternativa"]
Modality = Literal["A pé", "Bicicleta", "Cultural"]
BookingStatus = Literal["confirmed", "pending", "cancelled"]
Score = Annotated[int, Field(ge=0, le=10, strict=True)]


class Contract(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid", from_attributes=True
    )

    @field_serializer("*", check_fields=False, when_used="json")
    def serialize_money(self, value: object) -> object:
        return float(value) if isinstance(value, Decimal) else value


class Metadata(Contract):
    source_type: Literal["synthetic_demo"] = Field(alias="source_type")
    version: Text
    seed: int
    generated_at: datetime
    reference_date: date
    history_start: date
    history_end: date
    currency: Literal["BRL"]

    @model_validator(mode="after")
    def chronological(self) -> Self:
        if not self.history_start <= self.history_end < self.reference_date:
            raise ValueError("Corte histórico inválido.")
        return self


class RouteData(Contract):
    id: Id
    name: Text
    short_name: Text
    modality: Modality
    country: Text
    days: int = Field(gt=0)
    distance_km: int = Field(ge=0)
    stages: list[Text] = Field(min_length=1, max_length=100)


class CustomerData(Contract):
    id: Id
    label: Text


class LeadData(Contract):
    id: Id
    route_id: Id
    category: Category
    created_at: date
    channel: Text
    stage: Literal["new", "qualified", "proposal", "won", "lost"]
    potential_value: Money


class DepartureData(Contract):
    id: Id
    route_id: Id
    date: date
    end_date: date
    capacity: int = Field(gt=0, le=10000)
    transfer_confirmed: bool
    transfer_due: date

    @model_validator(mode="after")
    def chronological(self) -> Self:
        if self.end_date < self.date or self.transfer_due > self.date:
            raise ValueError("Datas da saída inconsistentes.")
        return self


class BookingData(Contract):
    id: Id
    customer_id: Id
    traveler_ids: list[Id] = Field(min_length=1, max_length=20)
    lead_id: Id
    departure_id: Id
    booked_at: date
    confirmed_at: date | None
    status: BookingStatus
    category: Category
    total_amount: Money
    form_complete: bool
    cancellation_reason: str | None = Field(max_length=600)

    @model_validator(mode="after")
    def participants_and_confirmation(self) -> Self:
        if self.customer_id not in self.traveler_ids or len(set(self.traveler_ids)) != len(
            self.traveler_ids
        ):
            raise ValueError("Titular deve ser viajante; participantes não podem se repetir.")
        if self.status == "confirmed" and self.confirmed_at is None:
            raise ValueError("Reserva confirmada exige data de confirmação.")
        if self.status == "pending" and self.confirmed_at is not None:
            raise ValueError("Reserva pendente não pode ter confirmação.")
        if self.confirmed_at is not None and self.confirmed_at < self.booked_at:
            raise ValueError("Confirmação anterior à contratação.")
        return self


class PartnerData(Contract):
    id: Id
    name: Text
    route_id: Id
    locality: Text


class AllocationData(Contract):
    id: Id
    departure_id: Id
    partner_id: Id
    locality: Text
    date: date
    category: Category
    capacity: int = Field(gt=0, le=10000)
    confirmed: bool


class CostData(Contract):
    id: Id
    departure_id: Id
    category: Text
    date: date
    budget: Money
    amount: Money
    status: Literal["realized", "estimated"]


class PaymentData(Contract):
    id: Id
    booking_id: Id
    date: date
    amount: Money


class FeedbackData(Contract):
    id: Id
    booking_id: Id
    date: date
    nps: Score
    service: Score
    accommodation: Score
    logistics: Score
    comment: str = Field(max_length=600)


class Dataset(Contract):
    metadata: Metadata
    routes: list[RouteData]
    customers: list[CustomerData]
    leads: list[LeadData]
    departures: list[DepartureData]
    bookings: list[BookingData]
    partners: list[PartnerData]
    allocations: list[AllocationData]
    costs: list[CostData]
    payments: list[PaymentData]
    feedback: list[FeedbackData]

    @model_validator(mode="after")
    def integrity(self) -> Self:
        from app.services.validation import validate_relations

        validate_relations(self)
        return self
