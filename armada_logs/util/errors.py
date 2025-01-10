from collections.abc import Callable, Coroutine
from typing import Any, Union

from fastapi import Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from ldap3.core.exceptions import LDAPInvalidDnError
from sqlalchemy.exc import IntegrityError, NoResultFound

from armada_logs.logging import logger


class ValidationException(Exception):
    pass


class InputValidationError(ValidationException):
    pass


class DataValidationError(ValidationException):
    pass


class NotFoundError(ValidationException):
    pass


class SkipFieldError(Exception):
    pass


class DefinitionValidationError(ValidationException):
    """
    This exception should be used when a query mapping definition does not meet
    the expected criteria.
    """

    pass


class FieldValidationError(ValidationException):
    """
    This exception should be used when a query field does not meet
    the expected criteria.
    """

    pass


class ExpressionValidationError(ValidationException):
    """
    This exception should be used when an expression in a query does
    not conform to the allowed values.
    """

    pass


class ValueValidationError(ValidationException):
    """
    This exception should be used when the query value does not match the expected one.
    """

    pass


class AuthenticationError(Exception):
    """
    Exception raised for authentication failures.
    """

    pass


class InsufficientScopeException(Exception):
    """
    Custom out-of-scope exception, used by fastapi_login
    """

    pass


async def sqlalchemy_not_found_exception_handler(request: Request, exc: NoResultFound) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content=jsonable_encoder({"detail": "Entity not found"}))


async def validation_exception_handler(request: Request, exc: ValidationException) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=jsonable_encoder({"detail": str(exc)}))


async def sqlalchemy_integrity_exception_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    error = str(exc)
    if "FOREIGN KEY constraint failed" in error:
        error = "The record you are attempting to delete has dependencies. Please ensure that any related records are deleted first before attempting to delete this record."
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content=jsonable_encoder({"detail": error}))


async def ldap_invalid_dn_exception_handler(request: Request, exc: LDAPInvalidDnError) -> JSONResponse:
    error = str(exc)

    detailed_error_message = (
        f"The Distinguished Name (DN) provided is invalid: '{error}'. "
        "Possible reasons include:\n"
        "1. Incorrect syntax: Ensure the DN is properly formatted.\n"
        "2. Non-existent attributes.\n"
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=jsonable_encoder({"detail": detailed_error_message})
    )


async def insufficient_scope_exception_handler(request: Request, exc: InsufficientScopeException) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content=jsonable_encoder({"detail": "You do not have the required permissions to perform this action."}),
        headers={"WWW-Authenticate": "Bearer"},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    This will log all unhandled exceptions. Logging only works when debug is disabled.
    Unhandled exceptions are all exceptions that are not HTTPExceptions or RequestValidationErrors.
    """
    host = getattr(getattr(request, "client", None), "host", None)
    port = getattr(getattr(request, "client", None), "port", None)
    url = f"{request.url.path}?{request.query_params}" if request.query_params else request.url.path
    logger.exception(f'{host}:{port} - "{request.method} {url}" 500 Internal Server Error')
    return JSONResponse(
        content=jsonable_encoder({"detail": "Internal Server Error"}), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


# Custom exception handlers
exception_handlers: dict[Union[int, type[Exception]], Callable[[Request, Any], Coroutine[Any, Any, Response]]] = {
    NoResultFound: sqlalchemy_not_found_exception_handler,
    ValidationException: validation_exception_handler,
    IntegrityError: sqlalchemy_integrity_exception_handler,
    LDAPInvalidDnError: ldap_invalid_dn_exception_handler,
    InsufficientScopeException: insufficient_scope_exception_handler,
    Exception: unhandled_exception_handler,
}
