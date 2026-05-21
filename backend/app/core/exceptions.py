"""Domain exceptions and global handlers.

All error responses use the same envelope as success responses:
``{"message": ..., "status": false, "data": null}``. Internal details are
never leaked to clients in production.
"""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("exception")


class AppError(Exception):
    """Base class for expected, client-facing application errors."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    message: str = "Something went wrong"

    def __init__(self, message: str | None = None, status_code: int | None = None) -> None:
        if message is not None:
            self.message = message
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    message = "Resource not found"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    message = "Resource already exists"


class AuthError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    message = "Authentication failed"


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    message = "Not permitted"


class ValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    message = "Invalid input"


def _envelope(message: str, status_code: int, data: object = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"message": message, "status": False, "data": data},
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        log.warning("app.error", message=exc.message, status_code=exc.status_code)
        return _envelope(exc.message, exc.status_code)

    @app.exception_handler(StarletteHTTPException)
    async def _http_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _envelope(str(exc.detail), exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        # exc.errors() may embed exception objects (in "ctx") that are not
        # JSON-serializable; expose only safe primitive fields.
        details = [
            {"loc": list(err.get("loc", [])), "msg": err.get("msg"), "type": err.get("type")}
            for err in exc.errors()
        ]
        return _envelope(
            "Invalid input",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            data=details if not settings.is_production else None,
        )

    @app.exception_handler(Exception)
    async def _unhandled_handler(_: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled.error")
        message = "Internal server error" if settings.is_production else str(exc)
        return _envelope(message, status.HTTP_500_INTERNAL_SERVER_ERROR)
