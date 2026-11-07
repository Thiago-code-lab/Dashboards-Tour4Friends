from datetime import datetime
from typing import Literal

from app.schemas.domain import Contract
from app.schemas.requests import Role


class PublicUser(Contract):
    id: str
    email: str
    name: str
    role: Role
    active: bool
    version: int


class LoginResponse(Contract):
    access_token: str
    token_type: Literal["bearer"]
    expires_at: datetime
    user: PublicUser
