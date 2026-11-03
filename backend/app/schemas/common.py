from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema that rejects unknown fields on mutation payloads."""

    model_config = ConfigDict(extra="forbid")


class BaseORMModel(BaseModel):
    """Base schema for database entity representations."""

    model_config = ConfigDict(from_attributes=True)
