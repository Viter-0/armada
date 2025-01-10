from typing import Self
from uuid import UUID

from httpx import AsyncClient
from pydantic import ValidationError

from armada_logs.database.dependencies import get_db_session_context
from armada_logs.logging import get_logger
from armada_logs.schema.data_sources import DataSourceIvantiITSM, ORMDataSourceIvantiITSM
from armada_logs.util.connections import HttpClientContextManager
from armada_logs.util.helpers import ObjectTracker

from ..resources import SourceBase
from .data_structures import CI

logger = get_logger("armada.source.ivanti_itsm")


class ApiClient(HttpClientContextManager):
    def __init__(self, config: DataSourceIvantiITSM):
        super().__init__()
        self.config = config

    def create_client(self) -> AsyncClient:
        token = getattr(self.config.credential_profile, "token", None)
        name = self.config.credential_profile.name if self.config.credential_profile else "None"
        if not token:
            raise ValueError(f"The credential profile '{name}' does not contain a valid token.")

        return AsyncClient(
            base_url=self.config.host,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"rest_api_key={token}",
            },
            verify=self.verify_ssl(verify=self.config.is_certificate_validation_enabled),
            event_hooks={"response": [self.raise_on_4xx_5xx]},
        )

    def _parse_ci(self, entity: dict) -> CI:
        """
        Parses an individual entity dictionary into a CI model.
        """
        return CI(**entity)

    async def get_CIs(self) -> list[CI]:
        """
        Retrieves a list of Configuration Items (CIs) from the Ivanti API.
        """
        response = await self.get_client().get("/api/odata/businessobject/CIs")
        object_count = response.json()["@odata.count"]
        if not object_count:
            return []

        chunk = 100  # Max chunk size supported by Ivanti is 100
        request_inter = 0

        ci_objects = []

        # Get all objects
        while request_inter < object_count:
            if request_inter + chunk > object_count:
                request_size = object_count - request_inter
            else:
                request_size = chunk

            url = f"/api/odata/businessobject/CIs?$top={request_size}&$skip={request_inter}"
            request_inter = request_inter + request_size
            response = await self.get_client().get(url)
            result = response.json()

            for entity in result["value"]:
                try:
                    ci_objects.append(self._parse_ci(entity))
                except ValidationError as e:
                    logger.warning(e)
        return ci_objects


class SourceIvantiITSM(SourceBase):
    def __init__(self, config: DataSourceIvantiITSM) -> None:
        super().__init__(config=config)
        self.config = config
        self.api_client = ApiClient(config=config)
        self.object_tracker = ObjectTracker()

    async def check_connectivity(self):
        """
        Check the connectivity to the Ivanti ITSM API.

        This method sends a simple request to verify that the API is reachable and functioning correctly.
        """
        async with self.api_client as connection:
            await connection.get_client().get("/api/odata/businessobject/CIs?$top=1")

    @classmethod
    async def from_id(cls, source_id: UUID | str) -> Self:
        """
        Create an instance of the data source by using ORM UUID
        """
        if isinstance(source_id, str):
            source_id = UUID(source_id)
        async with get_db_session_context() as session:
            config = await session.get_one(ORMDataSourceIvantiITSM, source_id)
            return cls(config=DataSourceIvantiITSM.model_validate(config))
