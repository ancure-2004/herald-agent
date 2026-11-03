"""
Custom Application Exceptions & Global Handlers (`app/core/exceptions.py`)
"""

from typing import Any, Dict, Optional

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .logging import logger


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: Optional[Any] = None):
        msg = f"{resource} '{identifier}' not found." if identifier is not None else resource
        super().__init__(
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND",
        )


class ConflictError(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            details=details,
        )


class MethodNotAllowedError(AppException):
    def __init__(self, message: str = "Method not allowed."):
        super().__init__(
            message=message,
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            error_code="METHOD_NOT_ALLOWED",
        )


class GoneError(AppException):
    def __init__(self, message: str = "Resource has expired or is gone."):
        super().__init__(
            message=message,
            status_code=status.HTTP_410_GONE,
            error_code="RESOURCE_GONE",
        )


class UnprocessableEntityError(AppException):
    def __init__(self, message: str = "Validation or invariant failure.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="UNPROCESSABLE_ENTITY",
            details=details,
        )


class InvariantViolationError(AppException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="INVARIANT_VIOLATION",
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "Access forbidden."):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
        )


class RateLimitExceededError(AppException):
    def __init__(self, message: str = "Rate limit exceeded. Please slow down."):
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    req_id = getattr(request.state, "request_id", "-")
    logger.warning(f"[{req_id}] AppException: {exc.error_code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "request_id": req_id,
            },
            "detail": exc.message,  # Legacy detail key for frontend compatibility
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    req_id = getattr(request.state, "request_id", "-")
    errors = []
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err.get("loc", []))
        errors.append({"field": field, "message": err.get("msg")})

    logger.info(f"[{req_id}] Validation error on {request.url.path}: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request body or parameters.",
                "details": errors,
                "request_id": req_id,
            },
            "detail": errors,  # Legacy detail key for frontend compatibility
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    req_id = getattr(request.state, "request_id", "-")
    logger.exception(f"[{req_id}] Unhandled server exception: {exc}")
    # Never expose stack traces or internal errors to the client
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please contact the administrator.",
                "request_id": req_id,
            },
            "detail": "An unexpected error occurred.",
        },
    )
