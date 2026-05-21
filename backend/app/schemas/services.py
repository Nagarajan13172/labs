"""DBaaS request/response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.database import ManagedDatabase
from app.services.db_engines import DatabaseEngine


class EngineInfo(BaseModel):
    engine: str
    host: str
    port: int


class DatabaseCreate(BaseModel):
    engine: DatabaseEngine
    name: str

    @field_validator("name")
    @classmethod
    def _valid_name(cls, value: str) -> str:
        value = value.strip()
        if not value or not value.replace("_", "").isalnum() or len(value) > 24:
            raise ValueError("Name must be alphanumeric/underscore, max 24 chars")
        return value


class DatabaseOut(BaseModel):
    id: str
    engine: DatabaseEngine
    name: str
    db_name: str
    username: str
    password: str
    host: str
    port: int
    connection_uri: str
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: ManagedDatabase) -> DatabaseOut:
        if doc.engine == DatabaseEngine.MONGODB:
            uri = (
                f"mongodb://{doc.username}:{doc.password}@{doc.host}:{doc.port}/"
                f"{doc.db_name}?authSource={doc.db_name}"
            )
        else:
            uri = f"mysql://{doc.username}:{doc.password}@{doc.host}:{doc.port}/{doc.db_name}"
        return cls(
            id=str(doc.id),
            engine=doc.engine,
            name=doc.name,
            db_name=doc.db_name,
            username=doc.username,
            password=doc.password,
            host=doc.host,
            port=doc.port,
            connection_uri=uri,
            created_at=doc.created_at,
        )
