from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Security, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import models, schema
from armada_logs.const import DataSourceTypesEnum, ScopesEnum
from armada_logs.core.security import access_manager
from armada_logs.database import get_db_session, update_database_entry
from armada_logs.util.errors import ValidationException

router = APIRouter(prefix="/data_sources")


@router.get(path="/sync")
async def sync_assets(
    source_id: UUID,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Trigger an immediate asset synchronization for the given data source.

    Does not wait for the synchronization to complete.
    """
    data_source = await db_session.get_one(schema.data_sources.ORMDataSource, source_id)

    try:
        await models.data_sources.collect_assets_now(data_source=data_source)
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from None


@router.get(path="", response_model=list[schema.data_sources.PolymorphicDataSourceResponse])
async def list_datasources(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a list of all data sources.
    """
    return await db_session.scalars(select(schema.data_sources.ORMDataSource))


@router.get(path="/aria_logs", response_model=list[schema.data_sources.DataSourceAriaLogsResponse])
async def list_aria_logs(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a list of Vmware Aria Operations for logs data sources.
    """
    return await db_session.scalars(select(schema.data_sources.ORMDataSourceAriaLogs))


@router.get(path="/aria_logs/{id}", response_model=schema.data_sources.DataSourceAriaLogsResponse)
async def get_aria_logs(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a specific Vmware Aria Operations for logs data source by its UUID.
    """
    return await db_session.get_one(schema.data_sources.ORMDataSourceAriaLogs, item_id)


@router.post(path="/aria_logs", response_model=schema.data_sources.DataSourceAriaLogsResponse)
async def add_aria_logs(
    data_source: schema.data_sources.DataSourceAriaLogsCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Add a new Vmware Aria Operations for logs data source.
    """
    await models.data_sources.check_datasource_uniqueness(session=db_session, source=data_source)

    new_datasource = schema.data_sources.ORMDataSourceAriaLogs(**data_source.model_dump())
    await models.data_sources.create_datasource(session=db_session, source=new_datasource)
    return new_datasource


@router.put(path="/aria_logs/{id}")
async def update_aria_logs(
    data_source: schema.data_sources.DataSourceAriaLogsUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update a specific Vmware Aria Operations for logs data source.
    """
    db_data_source = await db_session.get_one(schema.data_sources.ORMDataSourceAriaLogs, item_id)
    update_database_entry(db_data_source, data_source.model_dump())
    await models.data_sources.update_datasource(session=db_session, source=db_data_source)


@router.delete(path="/aria_logs/{id}")
async def delete_aria_logs(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Delete a specific Vmware Aria Operations for logs data source by its UUID.
    """
    data_source = await db_session.get_one(schema.data_sources.ORMDataSourceAriaLogs, item_id)
    await models.data_sources.delete_datasource(session=db_session, source=data_source)


@router.post(path="/aria_logs/validate", operation_id="DataSourceAriaLogsValidate")
async def validate_aria_logs(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    config: Annotated[schema.data_sources.DataSourceAriaLogsCreate | None, Body()] = None,
    item_id: Annotated[UUID | None, Body(alias="id")] = None,
) -> None:
    """
    Check if data source is functional.

    There are two options to validate a data source:
    1. Only ID - Check if the source in the database is valid.
    2. Only config - Check if the source you are trying to create is valid.
    """

    await models.data_sources.validate_data_source(
        db_session=db_session,
        item_id=item_id,
        config=config,
        source_schema=schema.data_sources.DataSourceAriaLogs,
        source_type=DataSourceTypesEnum.ARIA_LOGS,
    )


@router.get(path="/aria_networks", response_model=list[schema.data_sources.DataSourceAriaNetworksResponse])
async def list_aria_networks(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a list of Vmware Aria Operations for Networks data sources.
    """
    return await db_session.scalars(select(schema.data_sources.ORMDataSourceAriaNetworks))


@router.get(path="/aria_networks/{id}", response_model=schema.data_sources.DataSourceAriaNetworksResponse)
async def get_aria_networks(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a specific Vmware Aria Operations for Networks data source by its UUID.
    """
    return await db_session.get_one(schema.data_sources.ORMDataSourceAriaNetworks, item_id)


@router.post(path="/aria_networks")
async def add_aria_networks(
    data_source: schema.data_sources.DataSourceAriaNetworksCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Add a new Vmware Aria Operations for Networks data source.
    """
    await models.data_sources.check_datasource_uniqueness(session=db_session, source=data_source)

    new_source = schema.data_sources.ORMDataSourceAriaNetworks(**data_source.model_dump())
    await models.data_sources.create_datasource(session=db_session, source=new_source)
    return new_source


@router.put(path="/aria_networks/{id}")
async def update_aria_networks(
    data_source: schema.data_sources.DataSourceAriaNetworksUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update a specific Vmware Aria Operations for Networks data source.
    """
    db_source = await db_session.get_one(schema.data_sources.ORMDataSourceAriaNetworks, item_id)
    update_database_entry(db_source, data_source.model_dump())
    await models.data_sources.update_datasource(session=db_session, source=db_source)


@router.delete(path="/aria_networks/{id}")
async def delete_aria_networks(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Delete a specific Vmware Aria Operations for Networks data source by its UUID.
    """
    data_source = await db_session.get_one(schema.data_sources.ORMDataSourceAriaNetworks, item_id)
    await models.data_sources.delete_datasource(session=db_session, source=data_source)


@router.post(path="/aria_networks/validate", operation_id="DataSourceAriaNetworksValidate")
async def validate_aria_networks(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    config: Annotated[schema.data_sources.DataSourceAriaNetworksCreate | None, Body()] = None,
    item_id: Annotated[UUID | None, Body(alias="id")] = None,
) -> None:
    """
    Check if data source is functional.

    There are two options to validate a data source:
    1. Only ID - Check if the source in the database is valid.
    2. Only config - Check if the source you are trying to create is valid.
    """

    await models.data_sources.validate_data_source(
        db_session=db_session,
        item_id=item_id,
        config=config,
        source_schema=schema.data_sources.DataSourceAriaNetworks,
        source_type=DataSourceTypesEnum.ARIA_NETWORKS,
    )


@router.get(path="/vmware_nsx", response_model=list[schema.data_sources.DataSourceVmwareNSXResponse])
async def list_vmware_nsx(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a list of Vmware NSX-T data sources.
    """
    return await db_session.scalars(select(schema.data_sources.ORMDataSourceVmwareNSX))


@router.get(path="/vmware_nsx/{id}", response_model=schema.data_sources.DataSourceVmwareNSXResponse)
async def get_vmware_nsx(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a specific Vmware NSX-T data source by its UUID.
    """
    return await db_session.get_one(schema.data_sources.ORMDataSourceVmwareNSX, item_id)


@router.post(path="/vmware_nsx")
async def add_vmware_nsx(
    data_source: schema.data_sources.DataSourceVmwareNSXCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Add a new Vmware NSX-T data source.
    """
    await models.data_sources.check_datasource_uniqueness(session=db_session, source=data_source)

    new_source = schema.data_sources.ORMDataSourceVmwareNSX(**data_source.model_dump())
    await models.data_sources.create_datasource(session=db_session, source=new_source)
    return new_source


@router.put(path="/vmware_nsx/{id}")
async def update_vmware_nsx(
    data_source: schema.data_sources.DataSourceVmwareNSXUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update a specific Vmware NSX-T data source.
    """
    db_source = await db_session.get_one(schema.data_sources.ORMDataSourceVmwareNSX, item_id)
    update_database_entry(db_source, data_source.model_dump())
    await models.data_sources.update_datasource(session=db_session, source=db_source)


@router.delete(path="/vmware_nsx/{id}")
async def delete_vmware_nsx(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Delete a specific Vmware NSX-T data source by its UUID.
    """
    data_source = await db_session.get_one(schema.data_sources.ORMDataSourceVmwareNSX, item_id)
    await models.data_sources.delete_datasource(session=db_session, source=data_source)


@router.post(path="/vmware_nsx/validate", operation_id="DataSourceVmwareNSXValidate")
async def validate_vmware_nsx(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    config: Annotated[schema.data_sources.DataSourceVmwareNSXCreate | None, Body()] = None,
    item_id: Annotated[UUID | None, Body(alias="id")] = None,
) -> None:
    """
    Check if data source is functional.

    There are two options to validate a data source:
    1. Only ID - Check if the source in the database is valid.
    2. Only config - Check if the source you are trying to create is valid.
    """

    await models.data_sources.validate_data_source(
        db_session=db_session,
        item_id=item_id,
        config=config,
        source_schema=schema.data_sources.DataSourceVmwareNSX,
        source_type=DataSourceTypesEnum.VMWARE_NSX,
    )


@router.get(path="/vmware_vcenter", response_model=list[schema.data_sources.DataSourceVmwareVCenterResponse])
async def list_vmware_vcenter(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a list of Vmware vCenter data sources.
    """
    return await db_session.scalars(select(schema.data_sources.ORMDataSourceVmwareVCenter))


@router.get(path="/vmware_vcenter/{id}", response_model=schema.data_sources.DataSourceVmwareVCenterResponse)
async def get_vmware_vcenter(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a specific Vmware vCenter data source by its UUID.
    """
    return await db_session.get_one(schema.data_sources.ORMDataSourceVmwareVCenter, item_id)


@router.post(path="/vmware_vcenter")
async def add_vmware_vcenter(
    data_source: schema.data_sources.DataSourceVmwareVCenterCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Add a new Vmware vCenter data source.
    """
    await models.data_sources.check_datasource_uniqueness(session=db_session, source=data_source)

    new_source = schema.data_sources.ORMDataSourceVmwareVCenter(**data_source.model_dump())
    await models.data_sources.create_datasource(session=db_session, source=new_source)
    return new_source


@router.put(path="/vmware_vcenter/{id}")
async def update_vmware_vcenter(
    data_source: schema.data_sources.DataSourceVmwareVCenterUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update a specific Vmware vCenter data source.
    """
    db_source = await db_session.get_one(schema.data_sources.ORMDataSourceVmwareVCenter, item_id)
    update_database_entry(db_source, data_source.model_dump())
    await models.data_sources.update_datasource(session=db_session, source=db_source)


@router.delete(path="/vmware_vcenter/{id}")
async def delete_vmware_vcenter(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Delete a specific Vmware vCenter data source by its UUID.
    """
    data_source = await db_session.get_one(schema.data_sources.ORMDataSourceVmwareVCenter, item_id)
    await models.data_sources.delete_datasource(session=db_session, source=data_source)


@router.post(path="/vmware_vcenter/validate", operation_id="DataSourceVmwareVCenterValidate")
async def validate_vmware_vcenter(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    config: Annotated[schema.data_sources.DataSourceVmwareVCenterCreate | None, Body()] = None,
    item_id: Annotated[UUID | None, Body(alias="id")] = None,
) -> None:
    """
    Check if data source is functional.

    There are two options to validate a data source:
    1. Only ID - Check if the source in the database is valid.
    2. Only config - Check if the source you are trying to create is valid.
    """

    await models.data_sources.validate_data_source(
        db_session=db_session,
        item_id=item_id,
        config=config,
        source_schema=schema.data_sources.DataSourceVmwareVCenter,
        source_type=DataSourceTypesEnum.VMWARE_VCENTER,
    )


@router.get(path="/demo/{id}", response_model=schema.data_sources.DataSourceDemoResponse)
async def get_demo(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a specific Demo data source by its UUID.
    """
    return await db_session.get_one(schema.data_sources.ORMDataSourceDemo, item_id)


@router.get(path="/ivanti_itsm", response_model=list[schema.data_sources.DataSourceIvantiITSMResponse])
async def list_ivanti_itsm(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a list of Ivanti ITSM data sources.
    """
    return await db_session.scalars(select(schema.data_sources.ORMDataSourceIvantiITSM))


@router.get(path="/ivanti_itsm/{id}", response_model=schema.data_sources.DataSourceIvantiITSMResponse)
async def get_ivanti_itsm(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a specific Ivanti ITSM data source by its UUID.
    """
    return await db_session.get_one(schema.data_sources.ORMDataSourceIvantiITSM, item_id)


@router.post(path="/ivanti_itsm")
async def add_ivanti_itsm(
    data_source: schema.data_sources.DataSourceIvantiITSMCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Add a new Ivanti ITSM data source.
    """
    await models.data_sources.check_datasource_uniqueness(session=db_session, source=data_source)

    new_source = schema.data_sources.ORMDataSourceIvantiITSM(**data_source.model_dump())
    await models.data_sources.create_datasource(session=db_session, source=new_source)
    return new_source


@router.put(path="/ivanti_itsm/{id}")
async def update_ivanti_itsm(
    data_source: schema.data_sources.DataSourceIvantiITSMUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update a specific Ivanti ITSM data source.
    """
    db_source = await db_session.get_one(schema.data_sources.ORMDataSourceIvantiITSM, item_id)
    update_database_entry(db_source, data_source.model_dump())
    await models.data_sources.update_datasource(session=db_session, source=db_source)


@router.delete(path="/ivanti_itsm/{id}")
async def delete_ivanti_itsm(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Delete a specific Ivanti ITSM data source by its UUID.
    """
    data_source = await db_session.get_one(schema.data_sources.ORMDataSourceIvantiITSM, item_id)
    await models.data_sources.delete_datasource(session=db_session, source=data_source)


@router.post(path="/ivanti_itsm/validate", operation_id="DataSourceIvantiITSMValidate")
async def validate_ivanti_itsm(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    config: Annotated[schema.data_sources.DataSourceIvantiITSMCreate | None, Body()] = None,
    item_id: Annotated[UUID | None, Body(alias="id")] = None,
) -> None:
    """
    Check if data source is functional.

    There are two options to validate a data source:
    1. Only ID - Check if the source in the database is valid.
    2. Only config - Check if the source you are trying to create is valid.
    """

    await models.data_sources.validate_data_source(
        db_session=db_session,
        item_id=item_id,
        config=config,
        source_schema=schema.data_sources.DataSourceIvantiITSM,
        source_type=DataSourceTypesEnum.IVANTI_ITSM,
    )


@router.get(path="/qradar", response_model=list[schema.data_sources.DataSourceQRadarResponse])
async def list_qradar(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a list of IBM QRadar data sources.
    """
    return await db_session.scalars(select(schema.data_sources.ORMDataSourceQRadar))


@router.get(path="/qradar/{id}", response_model=schema.data_sources.DataSourceQRadarResponse)
async def get_qradar(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a specific IBM QRadar data source by their UUID.
    """
    return await db_session.get_one(schema.data_sources.ORMDataSourceQRadar, item_id)


@router.post(path="/qradar")
async def add_qradar(
    data_source: schema.data_sources.DataSourceQRadarCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Add a new IBM QRadar data source.
    """
    await models.data_sources.check_datasource_uniqueness(session=db_session, source=data_source)

    new_source = schema.data_sources.ORMDataSourceQRadar(**data_source.model_dump())
    await models.data_sources.create_datasource(session=db_session, source=new_source)
    return new_source


@router.put(path="/qradar/{id}")
async def update_qradar(
    data_source: schema.data_sources.DataSourceQRadarUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update a specific IBM QRadar data source.
    """
    db_source = await db_session.get_one(schema.data_sources.ORMDataSourceQRadar, item_id)
    update_database_entry(db_source, data_source.model_dump())
    await models.data_sources.update_datasource(session=db_session, source=db_source)


@router.delete(path="/qradar/{id}")
async def delete_qradar(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Delete a specific IBM QRadar data source by their UUID.
    """
    data_source = await db_session.get_one(schema.data_sources.ORMDataSourceQRadar, item_id)
    await models.data_sources.delete_datasource(session=db_session, source=data_source)


@router.post(path="/qradar/validate", operation_id="DataSourceQRadarValidate")
async def validate_qradar(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    config: Annotated[schema.data_sources.DataSourceQRadarCreate | None, Body()] = None,
    item_id: Annotated[UUID | None, Body(alias="id")] = None,
) -> None:
    """
    Check if data source is functional.

    There are two options to validate a data source:
    1. Only ID - Check if the source in the database is valid.
    2. Only config - Check if the source you are trying to create is valid.
    """

    await models.data_sources.validate_data_source(
        db_session=db_session,
        item_id=item_id,
        config=config,
        source_schema=schema.data_sources.DataSourceQRadar,
        source_type=DataSourceTypesEnum.QRADAR,
    )
