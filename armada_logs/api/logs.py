import asyncio
from time import perf_counter
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Security, status
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import models, schema
from armada_logs.const import DEFAULT_SEARCH_QUERY_TIMEOUT, ScopesEnum
from armada_logs.core.security import access_manager
from armada_logs.database import get_db_session
from armada_logs.logging import get_logger
from armada_logs.registry import DataSourceFactory

router = APIRouter()

logger = get_logger("armada.search")


async def fetch_logs(
    config: schema.data_sources.ORMDataSource, query: schema.logs.SearchQuery
) -> schema.logs.FetchResult:
    """
    Fetch logs from a specified data source.
    """
    result = schema.logs.FetchResult(
        execution_time=schema.logs.ExecutionTime(name="Fetch logs", target=config.name, duration=0)
    )
    start_time = perf_counter()
    try:
        source = DataSourceFactory.from_config(config=config)
        result.records = await source.fetch_logs(query=query)
    except Exception as e:
        logger.exception(e)
        result.errors.append(
            schema.logs.QueryError(
                name=f"An error occurred while fetching logs from the data source `{config.name}`", message=str(e)
            )
        )
        result.is_success = False

    result.execution_time.duration = perf_counter() - start_time
    return result


@router.post(path="/logs/search", response_model=schema.logs.SearchQueryResponse)
async def logs_search(
    query: schema.logs.SearchQueryRequest,
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Search for logs based on the provided query.
    """
    if query.is_empty():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search requires at least one filter",
        )

    await models.metrics.log_activity(session=db_session, user_id=user.id, category="logs", action="search")
    log_sources = await models.logs.get_log_data_sources(session=db_session, source_ids=query.sources)

    if not log_sources:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one data source is required for the search functionality to work",
        )

    search_query = await models.logs.create_search_query(session=db_session, query=query)
    logger.debug(f"Search query: {search_query}")

    try:
        async with asyncio.timeout(DEFAULT_SEARCH_QUERY_TIMEOUT):
            results: list[schema.logs.FetchResult] = await asyncio.gather(
                *[fetch_logs(source, search_query) for source in log_sources]
            )
    except TimeoutError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The search operation took too long to complete and was timed out. Please try again with a smaller query or check your network connection.",
        ) from e

    metadata = schema.logs.QueryMetadata()

    response = schema.logs.SearchQueryResponse(meta=metadata, is_success=any(result.is_success for result in results))

    for result in results:
        metadata.execution_durations.append(result.execution_time)
        response.errors.extend(result.errors)
        response.results.extend(result.records)

    # Resolve references
    await models.logs.ReferenceResolver.resolve_asset_references(db_session, response)

    # Populate Asset Information
    await models.logs.AssetResolver.populate_assets(db_session, response)

    return response


@router.get(path="/logs/sources", response_model=list[schema.logs.SearchCapableDataSource])
async def log_sources(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Return a list of data sources that are capable of log search.
    """
    return await models.logs.get_log_data_sources(session=db_session)
