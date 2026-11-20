from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base schema that rejects unknown fields on mutation payloads."""

    model_config = ConfigDict(extra="forbid")


class BaseORMModel(BaseModel):
    """Base schema for database entity representations."""

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard pagination envelope."""

    items: List[T]
    next_cursor: Optional[int] = None
    total: int
