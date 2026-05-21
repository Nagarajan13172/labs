"""Aggregate all v1 routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import auth, jobs, labs, network, services, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(labs.router)
api_router.include_router(network.router)
api_router.include_router(services.router)
api_router.include_router(jobs.router)
