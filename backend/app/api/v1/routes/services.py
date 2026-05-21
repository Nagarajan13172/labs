"""Database-as-a-service endpoints (Phase 5)."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.dependencies import CurrentUser
from app.schemas.common import ResponseEnvelope, ok
from app.schemas.services import DatabaseCreate, DatabaseOut, EngineInfo
from app.services import dbaas_service

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("/engines", response_model=ResponseEnvelope[list[EngineInfo]])
async def list_engines(user: CurrentUser) -> ResponseEnvelope[list[EngineInfo]]:
    return ok("Engines", data=[EngineInfo(**e) for e in dbaas_service.list_engines()])


@router.get("/databases", response_model=ResponseEnvelope[list[DatabaseOut]])
async def list_databases(user: CurrentUser) -> ResponseEnvelope[list[DatabaseOut]]:
    dbs = await dbaas_service.list_databases(user)
    return ok("Databases", data=[DatabaseOut.from_doc(d) for d in dbs])


@router.post(
    "/databases", response_model=ResponseEnvelope[DatabaseOut], status_code=status.HTTP_201_CREATED
)
async def create_database(data: DatabaseCreate, user: CurrentUser) -> ResponseEnvelope[DatabaseOut]:
    doc = await dbaas_service.create_database(user, data.engine, data.name)
    return ok("Database created", data=DatabaseOut.from_doc(doc))


@router.delete("/databases/{db_id}", response_model=ResponseEnvelope[None])
async def delete_database(db_id: str, user: CurrentUser) -> ResponseEnvelope[None]:
    await dbaas_service.delete_database(user, db_id)
    return ok("Database deleted")
