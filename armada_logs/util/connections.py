import asyncio
import ssl
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

import truststore
from httpx import AsyncClient, Response, codes
from ldap3.core.exceptions import LDAPResponseTimeoutError

if TYPE_CHECKING:
    from ldap3 import Connection


class HttpClientContextManager(ABC):
    """
    Abstract class for managing an httpx.AsyncClient client context.
    """

    def __init__(self):
        super().__init__()
        self.client: AsyncClient | None = None

    @abstractmethod
    def create_client(self) -> AsyncClient:
        """
        Abstract method to create and return an httpx.AsyncClient instance.
        Must be implemented by subclasses.
        """
        pass

    def get_client(self) -> AsyncClient:
        """
        Retrieves the initialized HTTP client instance.

        Raises:
            ValueError: If the HTTP client is not initialized. Ensure this function is called within an async context manager.
        """
        if self.client is None:
            raise ValueError("HTTP client not initialized. Use this function within an async context manager.")
        return self.client

    async def __aenter__(self):
        """
        Async context manager entry. Initializes the HTTP client.
        """
        if self.client is not None:
            return self
        self.client = await self.create_client().__aenter__()
        await self.on_context_enter()
        return self

    async def on_context_enter(self):  # noqa: B027
        """
        Hook method called after the context manager has entered.

        This method is designed to be overridden in subclasses if any custom
        initialization logic is needed upon entering the context.
        """
        pass

    async def on_context_exit(self, exc_type, exc_value, traceback):  # noqa: B027
        """
        Hook method called before the context manager exits.

        This method is intended to be overridden in subclasses to define custom
        cleanup logic when exiting the context.
        """
        pass

    async def __aexit__(self, exc_type, exc_value, traceback):
        """
        Async context manager exit. Closes the HTTP client.
        """
        await self.on_context_exit(exc_type, exc_value, traceback)
        if self.client is not None:
            await self.client.__aexit__(exc_type, exc_value, traceback)
            self.client = None

    @staticmethod
    def get_status_reason_phrase(code: int) -> str:
        """
        Returns the status code and its corresponding reason phrase as a string.
        """
        return f"{code} " + codes.get_reason_phrase(code)

    @staticmethod
    def verify_ssl(verify: bool = True) -> truststore.SSLContext | bool:
        """
        This method generates an SSL context for secure client connections using the
        `truststore` module. If the `verify` parameter is set to `False`, the function
        returns `False`, indicating that SSL verification is disabled.

        Args:
            verify: A flag indicating whether to verify SSL certificates.
        """
        if not verify:
            return False
        return truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)

    @staticmethod
    async def raise_on_4xx_5xx(response: Response):
        if response.is_error:
            await response.aread()
            response.raise_for_status()


async def wait_for_ldap_response(conn: "Connection", msg_id: str, timeout: float = 5.0):
    """
    Waits for the response from the LDAP server with a timeout.

    Args:
        conn: The LDAP connection object.
        msg_id: The message ID to wait for.
        timeout: The maximum time (in seconds) to wait for the response.

    Returns:
        The response from the LDAP server.

    Raises:
        asyncio.TimeoutError: If the response is not received within the specified timeout.
    """

    async def get_response():
        response = None
        while response is None:
            try:
                response, result = conn.get_response(msg_id, timeout=0.001)
            except LDAPResponseTimeoutError:
                await asyncio.sleep(0.05)
        return response

    return await asyncio.wait_for(get_response(), timeout=timeout)
