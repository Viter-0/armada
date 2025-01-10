from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Security, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import models, schema
from armada_logs.const import ScopesEnum
from armada_logs.core.security import access_manager
from armada_logs.database import get_db_session, update_database_entry
from armada_logs.schema.base import Base

router = APIRouter(prefix="/assets")


@router.get(path="/hosts", response_model=list[schema.assets.AssetHostResponse])
async def get_hosts(
    query: Annotated[schema.util.PaginationParams, Query()],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a list of hosts.
    """
    result = await db_session.scalars(select(schema.assets.ORMAssetHost).limit(query.limit).offset(query.offset))
    return result.unique()


@router.get(path="/hosts/{id}", response_model=schema.assets.AssetHostResponse)
async def get_host(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a specific host by its UUID.
    """
    return await db_session.get_one(schema.assets.ORMAssetHost, item_id)


@router.put(path="/hosts/{id}", response_model=schema.assets.AssetHostResponse)
async def update_host(
    asset: schema.assets.AssetHostUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Update a specific host identified by its UUID.
    """
    db_asset = await db_session.get_one(schema.assets.ORMAssetHost, item_id)

    asset_with_same_ip = await db_session.scalar(
        select(schema.assets.ORMAssetHost).where(
            (schema.assets.ORMAssetHost.id != item_id) & (schema.assets.ORMAssetHost.ip == str(asset.ip))
        )
    )
    if asset_with_same_ip:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"A host with IP {asset.ip} already exists."
        )

    update_database_entry(db_asset, asset.model_dump())
    db_asset.is_modified_by_user = True
    db_session.add(db_asset)
    await db_session.commit()
    await db_session.refresh(db_asset)
    return db_asset


@router.post(path="/hosts", response_model=schema.assets.AssetHostResponse)
async def add_host(
    asset: schema.assets.AssetHostCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Add a new host asset.
    """
    await models.assets.check_host_uniqueness(session=db_session, asset=asset)

    new_asset = schema.assets.ORMAssetHost(**asset.model_dump(), is_modified_by_user=True)
    db_session.add(new_asset)
    await db_session.commit()
    return new_asset


@router.delete(path="/hosts/{id}")
async def delete_host(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Delete a specific host identified by its UUID.
    """
    db_asset = await db_session.get_one(schema.assets.ORMAssetHost, item_id)
    await db_session.delete(db_asset)
    await db_session.commit()


@router.get(path="/firewall_rules", response_model=list[schema.assets.AssetFirewallRuleResponse])
async def get_firewall_rules(
    query: Annotated[schema.util.PaginationParams, Query()],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a list of firewall rules.
    """
    return await db_session.scalars(select(schema.assets.ORMAssetFirewallRule).limit(query.limit).offset(query.offset))


@router.get(path="/firewall_rules/{id}", response_model=schema.assets.AssetFirewallRuleResponse)
async def get_firewall_rule(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a specific firewall rule by its UUID.
    """
    return await db_session.get_one(schema.assets.ORMAssetFirewallRule, item_id)


@router.get(path="/networks", response_model=list[schema.assets.AssetNetworkResponse])
async def list_networks(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a list of networks.
    """
    return await db_session.scalars(select(schema.assets.ORMAssetNetwork))


@router.get(path="/networks/{id}", response_model=schema.assets.AssetNetworkResponse)
async def get_network(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a specific network identified by its UUID.
    """
    return await db_session.get_one(schema.assets.ORMAssetNetwork, item_id)


@router.put(path="/networks/{id}")
async def update_network(
    asset: schema.assets.AssetNetworkUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Update a specific network identified by its UUID.
    """
    db_asset = await db_session.get_one(schema.assets.ORMAssetNetwork, item_id)

    asset_with_same_cidr = await db_session.scalar(
        select(schema.assets.ORMAssetNetwork).where(
            (schema.assets.ORMAssetNetwork.id != item_id) & (schema.assets.ORMAssetNetwork.cidr == str(asset.cidr))
        )
    )
    if asset_with_same_cidr:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"A network with CIDR {asset.cidr} already exists."
        )

    update_database_entry(db_asset, asset.model_dump())
    db_asset.is_modified_by_user = True
    db_session.add(db_asset)
    await db_session.commit()


@router.post(path="/networks", response_model=schema.assets.AssetNetworkResponse)
async def add_network(
    asset: schema.assets.AssetNetworkCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Add a new network asset.
    """
    await models.assets.check_network_uniqueness(session=db_session, asset=asset)

    new_asset = schema.assets.ORMAssetNetwork(**asset.model_dump(), is_modified_by_user=True)
    db_session.add(new_asset)
    await db_session.commit()
    return new_asset


@router.delete(path="/networks/{id}")
async def delete_network(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Delete a specific network identified by its UUID.
    """
    db_asset = await db_session.get_one(schema.assets.ORMAssetNetwork, item_id)
    await db_session.delete(db_asset)
    await db_session.commit()


@router.get(path="/services", response_model=list[schema.assets.AssetServiceResponse])
async def list_services(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a list of services.
    """
    return await db_session.scalars(select(schema.assets.ORMAssetService))


@router.get(path="/services/{id}", response_model=schema.assets.AssetServiceResponse)
async def get_service(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a specific service identified by its UUID.
    """
    return await db_session.get_one(schema.assets.ORMAssetService, item_id)


@router.put(path="/services/{id}")
async def update_service(
    asset: schema.assets.AssetServiceUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Update a specific service identified by its UUID.
    """
    db_asset = await db_session.get_one(schema.assets.ORMAssetService, item_id)

    update_database_entry(db_asset, asset.model_dump())
    db_asset.is_modified_by_user = True
    db_session.add(db_asset)
    await db_session.commit()


@router.post(path="/services", response_model=schema.assets.AssetServiceResponse)
async def add_service(
    asset: schema.assets.AssetServiceCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Add a new service asset.
    """

    new_asset = schema.assets.ORMAssetService(**asset.model_dump(), is_modified_by_user=True)
    db_session.add(new_asset)
    await db_session.commit()
    return new_asset


@router.delete(path="/services/{id}")
async def delete_service(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_WRITE])],
):
    """
    Delete a specific service identified by its UUID.
    """
    db_asset = await db_session.get_one(schema.assets.ORMAssetService, item_id)
    await db_session.delete(db_asset)
    await db_session.commit()


@router.get(path="/users", response_model=list[schema.assets.AssetUserResponse])
async def list_users(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a list of users.

    These users are considered assets and do not count as application users.
    """
    return await db_session.scalars(select(schema.assets.ORMAssetUser))


@router.get(path="/users/{id}", response_model=schema.assets.AssetUserResponse)
async def get_user(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Get a specific user identified by its UUID.

    This user is considered an asset and does not count as an application user.
    """
    return await db_session.get_one(schema.assets.ORMAssetUser, item_id)


@router.post(path="/references", response_model=list[schema.assets.PolymorphicAssetResponse])
async def resolve_references(
    references: list[schema.util.Reference],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Resolve a list of asset references into detailed entity information.
    """
    response = []

    async def get_asset_info(orm: type[Base], refs: list[schema.util.Reference]):
        ids = set(ref.id for ref in refs)
        result = await db_session.scalars(select(orm).where(orm.id.in_(ids)))
        response.extend(result.all())

    grouped_by_type: dict[str, list[schema.util.Reference]] = {}
    for ref in references:
        if ref.entity_type not in grouped_by_type:
            grouped_by_type[ref.entity_type] = []
        grouped_by_type[ref.entity_type].append(ref)

    for group_type, values in grouped_by_type.items():
        match group_type:
            case "host":
                await get_asset_info(schema.assets.ORMAssetHost, values)
            case _:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Unsupported reference type: `{group_type}`",
                )
    return response
