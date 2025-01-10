from asyncio import iscoroutinefunction
from collections.abc import Callable
from functools import wraps
from inspect import signature
from ssl import SSLCertVerificationError
from typing import Any, get_type_hints

from httpx import ConnectError
from pydantic import BaseModel


def parse_pydantic_models(func: Callable) -> Callable:
    """
    Decorator to parse function arguments into Pydantic models based on type hints.
    Compatible with both synchronous and asynchronous functions.

    Args:
        func (Callable): The function to be decorated.

    Returns:
        Callable: The wrapped function with parsed arguments.
    """
    if iscoroutinefunction(func):

        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # Get type hints from the function
            type_hints = get_type_hints(func)
            new_args = []
            for arg, (param_name, _param) in zip(args, signature(func).parameters.items(), strict=True):
                hint = type_hints.get(param_name)
                if hint is not None and isinstance(hint, type) and issubclass(hint, BaseModel):
                    new_args.append(arg if isinstance(arg, hint) else hint.model_validate(arg))
                else:
                    new_args.append(arg)

            # Convert keyword arguments based on type hints
            new_kwargs = {}
            for name, arg in kwargs.items():
                hint = type_hints.get(name)
                if hint is not None and isinstance(hint, type) and issubclass(hint, BaseModel):
                    new_kwargs[name] = arg if isinstance(arg, hint) else hint.model_validate(arg)
                else:
                    new_kwargs[name] = arg

            return await func(*new_args, **new_kwargs)

        return async_wrapper

    else:

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # Get type hints from the function
            type_hints = get_type_hints(func)
            print(type_hints)

            # Convert arguments based on type hints
            new_args = []
            for arg, (param_name, _param) in zip(args, signature(func).parameters.items(), strict=True):
                hint = type_hints.get(param_name)
                if hint is not None and isinstance(hint, type) and issubclass(hint, BaseModel):
                    new_args.append(arg if isinstance(arg, hint) else hint.model_validate(arg))
                else:
                    new_args.append(arg)

            # Convert keyword arguments based on type hints
            new_kwargs = {}
            for name, arg in kwargs.items():
                hint = type_hints.get(name)
                if hint is not None and isinstance(hint, type) and issubclass(hint, BaseModel):
                    new_kwargs[name] = arg if isinstance(arg, hint) else hint.model_validate(arg)
                else:
                    new_kwargs[name] = arg

            return func(*new_args, **new_kwargs)

        return sync_wrapper


def parse_exception_message(e: Exception) -> str:
    """
    Parses the message from an exception and returns it as a string.
    """
    error = str(e)
    if isinstance(e, SSLCertVerificationError):
        error = e.verify_message
    elif isinstance(e, ConnectError):
        error = error.strip('("').strip('",)')

    return error
