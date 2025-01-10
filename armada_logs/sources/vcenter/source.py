from typing import Self
from uuid import UUID

from httpx import AsyncClient, BasicAuth, HTTPStatusError, Response

from armada_logs import schema
from armada_logs.database import get_db_session_context
from armada_logs.logging import get_logger
from armada_logs.util.connections import HttpClientContextManager

from ..resources import SourceBase

logger = get_logger("armada.source.vmware_vcenter")


class ApiClient(HttpClientContextManager):
    def __init__(self, config: schema.data_sources.DataSourceVmwareVCenter):
        super().__init__()
        self.config = config

    def create_client(self) -> AsyncClient:
        return AsyncClient(
            base_url=self.config.host,
            headers={"Content-Type": "application/json"},
            verify=self.verify_ssl(self.config.is_certificate_validation_enabled),
            event_hooks={"response": [self.raise_on_4xx_5xx]},
        )

    async def authorize(self):
        """
        Authenticate with the VMware vCenter (vSphere) API and set the authorization token.
        """
        username = getattr(self.config.credential_profile, "username", None)
        password = getattr(self.config.credential_profile, "password", None)

        if not username or not password:
            raise ValueError("Credential profile has an empty username or password.")

        response = await self.get_client().post("/api/session", auth=BasicAuth(username=username, password=password))
        self.get_client().headers.update({"vmware-api-session-id": response.json()})

    @staticmethod
    async def raise_on_4xx_5xx(response: Response):
        if response.is_error:
            await response.aread()
            logger.error(f"HTTP request failed. Response text: {response.text}")
            try:
                response.raise_for_status()
            except HTTPStatusError as e:
                raise HTTPStatusError(
                    message=ApiClient.parse_error_message(e),
                    request=e.request,
                    response=e.response,
                ) from None

    @staticmethod
    def parse_error_message(error: HTTPStatusError):
        response = error.response.json()
        message = response.get("messages", error.response.text)
        if isinstance(message, list):
            if len(message) > 0:
                message = message[0].get("default_message", error.response.text)
            else:
                message = error.response.text
        return f"{ApiClient.get_status_reason_phrase(error.response.status_code)}. {message}"


class SourceVmwareVCenter(SourceBase):
    """
    Data source implementation for VMware vCenter (vSphere).
    """

    def __init__(self, config: schema.data_sources.DataSourceVmwareVCenter) -> None:
        super().__init__(config=config)
        self.config = config
        self.api_client = ApiClient(config=config)
        self.logger = logger

    async def check_connectivity(self):
        """
        Check the connectivity to the VMware vCenter (vSphere) API.

        This method sends a simple request to verify that the API is reachable and functioning correctly.
        """
        async with self.api_client as connection:
            await connection.authorize()
            await connection.get_client().get("/api/appliance/system/version")

    @classmethod
    async def from_id(cls, source_id: UUID | str) -> Self:
        """
        Create an instance of the data source by using an ORM UUID.
        """
        if isinstance(source_id, str):
            source_id = UUID(source_id)
        async with get_db_session_context() as session:
            config = await session.get_one(schema.data_sources.ORMDataSourceVmwareVCenter, source_id)
            return cls(config=schema.data_sources.DataSourceVmwareVCenter.model_validate(config))
