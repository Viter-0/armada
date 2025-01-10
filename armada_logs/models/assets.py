import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from armada_logs import schema
from armada_logs.const import DEFAULT_STALE_ASSET_RETENTION
from armada_logs.database import (
    compare_model_with_orm,
    get_model_and_orm_diff,
)
from armada_logs.database.query import update_or_insert_bulk
from armada_logs.logging import logger
from armada_logs.settings import app_settings
from armada_logs.util.helpers import ObjectTracker, get_project_root

from .util import get_database_settings_value, update_database_settings_value


async def check_network_uniqueness(
    session: AsyncSession, asset: "schema.assets.AssetNetwork | schema.assets.AssetNetworkCreate"
):
    """
    Validates that a network asset with the same CIDR does not already exist in the database.

    Raises:
        HTTPException: If a network with the same CIDR already exists, raises an HTTP 400 error.
    """
    db_asset = await session.scalar(
        select(schema.assets.ORMAssetNetwork).where(schema.assets.ORMAssetNetwork.cidr == str(asset.cidr))
    )

    if db_asset:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Network with the same CIDR already exists")


async def check_host_uniqueness(
    session: AsyncSession, asset: "schema.assets.AssetHost | schema.assets.AssetHostCreate"
):
    """
    Validates that a host asset with the same unique id does not already exist in the database.

    Raises:
        HTTPException: If a host with the same unique id already exists, raises an HTTP 400 error.
    """
    db_asset = await session.scalar(
        select(schema.assets.ORMAssetHost).where(schema.assets.ORMAssetHost.ip == str(asset.ip))
    )

    if db_asset:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host with the same IP already exists")


async def purge_stale_networks(session: AsyncSession):
    """
    Remove stale network assets from the database.

    Note:
        - Only deletes networks where is_modified_by_user is False
        - Assets that haven't been updated within the retention period
    """

    retention_time = (
        await get_database_settings_value(session=session, key="stale_asset_retention", value_type=int)
        or DEFAULT_STALE_ASSET_RETENTION
    )
    stale_date = datetime.now(UTC) - timedelta(days=retention_time)

    await session.execute(
        delete(schema.assets.ORMAssetNetwork).where(
            (schema.assets.ORMAssetNetwork.is_modified_by_user == False)  # noqa: E712
            & (schema.assets.ORMAssetNetwork.updated_at < stale_date)
        )
    )

    await session.commit()


def create_partial_update_payload(existing_asset, updated_asset) -> dict | None:
    """
    Create a partial update payload only for the fields that the current asset does not have.

    Args:
        existing_asset: Current object in database (ORM model)
        updated_asset: New object to compare against (Pydantic model)

    """
    partial = {}
    for key, value in updated_asset.model_dump().items():
        if value is None:
            continue
        if hasattr(existing_asset, key) and getattr(existing_asset, key) is not None:
            continue
        partial[key] = value
    if not partial:
        return None
    partial["id"] = existing_asset.id
    return partial


def create_full_update_payload(existing_asset, updated_asset, ignore_values: list | None = None) -> dict:
    """
    Create a full update payload.

    Args:
        existing_asset: Current object in database (ORM model)
        updated_asset: Pydantic model
        ignore_values: Values to ignore during comparison
    """
    if ignore_values is None:
        ignore_values = []
    obj = {k: v for k, v in updated_asset.model_dump().items() if v not in ignore_values}
    obj["id"] = existing_asset.id
    return obj


def create_confidence_based_update(
    existing_asset, updated_asset, ignore_keys: list[str] | None = None, ignore_values: list | None = None
) -> dict | None:
    """
    Create an update payload based on confidence score comparison.

    Args:
        existing_asset: Current object in database (ORM model)
        updated_asset: New object to compare against (Pydantic model)
        ignore_keys: Keys to ignore during comparison
        ignore_values: Values to ignore during comparison

    Raises:
        ValueError: If either the existing or updated asset does not implement `current_confidence_score`.

    Notes:
        - Both `existing_asset` and `updated_asset` must have a `current_confidence_score` method.
        - If the `existing_asset` is marked as modified by the user, no update is performed.
        - The returned payload can be directly applied to the ORM object for updates.
    """

    # Skip update if the existing asset has been modified by the user.
    if getattr(existing_asset, "is_modified_by_user", False):
        return

    is_identical = compare_model_with_orm(
        updated_asset, existing_asset, ignore_keys=ignore_keys, ignore_values=ignore_values
    )
    if is_identical:
        return

    if not hasattr(existing_asset, "current_confidence_score") or not hasattr(
        updated_asset, "current_confidence_score"
    ):
        raise ValueError(
            "Both the existing and updated assets must implement the `current_confidence_score` method. "
            "Ensure that both objects are compatible with this function."
        )

    current_confidence = existing_asset.current_confidence_score()
    new_confidence = updated_asset.current_confidence_score()

    if new_confidence >= current_confidence:
        return create_full_update_payload(existing_asset=existing_asset, updated_asset=updated_asset)
    else:
        return create_partial_update_payload(existing_asset=existing_asset, updated_asset=updated_asset)


async def process_and_add_networks(session: AsyncSession, asset_data: list[schema.assets.AssetNetworkCreate]):
    """
    Process networks and update or insert them into the database.

    Args:
        session: The database session for executing queries.
        asset_data: A list of networks to process.

    """
    object_tracker = ObjectTracker()
    assets_to_insert: list[dict] = []
    assets_to_update: list[dict] = []

    if not asset_data:
        return

    query = select(schema.assets.ORMAssetNetwork).where(
        schema.assets.ORMAssetNetwork.cidr.in_([str(x.cidr) for x in asset_data])
    )

    existing_assets = await session.scalars(query)
    existing_assets_map = {item.cidr: item for item in existing_assets}

    for new_asset in asset_data:
        key = str(new_asset.cidr)
        if not object_tracker.is_unique(key):
            logger.warning(f"Skipping duplicate network with CIDR: {key}")
            continue

        if key not in existing_assets_map:
            assets_to_insert.append(new_asset.model_dump())
            logger.debug(f"Inserting new network: {new_asset}")
            continue

        current_asset = existing_assets_map[key]

        update_payload = create_confidence_based_update(
            existing_asset=current_asset,
            updated_asset=new_asset,
            ignore_keys=["confidence_score"],
            ignore_values=[None],
        )
        if not update_payload:
            continue

        assets_to_update.append(update_payload)
        changes = get_model_and_orm_diff(new_asset, current_asset, ignore_keys=["confidence_score"])
        logger.debug(f"Updating network with ID {current_asset.id}. Changes detected (new, current): {changes}")

    if assets_to_insert:
        await session.execute(insert(schema.assets.ORMAssetNetwork), assets_to_insert)
    if assets_to_update:
        await session.execute(update(schema.assets.ORMAssetNetwork), assets_to_update)
    await session.commit()


async def process_and_add_users(session: AsyncSession, asset_data: list[schema.assets.AssetUserCreate]):
    """
    Process users and update or insert them into the database.

    Args:
        session: The database session for executing queries.
        asset_data: A list of users to process.

    """
    # WIP
    pass


async def process_host_reference_payloads(
    session: AsyncSession, asset_data: list[tuple[schema.assets.AssetHostCreate, schema.assets.ORMAssetHost]]
):
    """
    Process the host references and update or insert them into the database.
    """

    ref_to_insert = []
    ref_to_update = []

    def create_payload(ref: schema.assets.AssetHostReferenceCreate, host_id: UUID) -> dict:
        ref.host_id = host_id
        ref_object = ref.model_dump()
        return ref_object

    if not asset_data:
        return

    for updated_asset, existing_asset in asset_data:
        if updated_asset.references:
            continue

        if not existing_asset.references:
            ref_to_insert.extend([create_payload(ref, existing_asset.id) for ref in updated_asset.references])
            continue

        for new_ref in updated_asset.references:
            current_ref = next(
                (
                    current_ref
                    for current_ref in existing_asset.references
                    if current_ref.data_source_id == new_ref.data_source_id
                ),
                None,
            )
            if not current_ref:
                host_ref = create_payload(new_ref, existing_asset.id)
                ref_to_insert.append(host_ref)
                logger.debug(f"Inserting new host reference: {host_ref}")
                continue

            if current_ref.source_identifier != new_ref.source_identifier:
                new_ref_payload = create_payload(new_ref, existing_asset.id)
                new_ref_payload["id"] = current_ref.id
                ref_to_update.append(new_ref_payload)
                logger.debug(
                    f"Updating host reference with ID {current_ref.id}. "
                    f"Changes detected (new, current): [{new_ref.source_identifier}, {current_ref.source_identifier}]"
                )

    if ref_to_insert:
        await session.execute(insert(schema.assets.ORMAssetHostReference), ref_to_insert)
    if ref_to_update:
        await session.execute(update(schema.assets.ORMAssetHostReference), ref_to_update)


async def insert_hosts_into_database(session: AsyncSession, host_to_insert: list[schema.assets.AssetHostCreate]):
    inserted_hosts = await session.execute(
        insert(schema.assets.ORMAssetHost).returning(schema.assets.ORMAssetHost.id),
        [x.model_dump() for x in host_to_insert],
    )
    references_to_insert = []
    for asset_id_tuple, original_data in zip(inserted_hosts, host_to_insert, strict=True):
        asset_id = asset_id_tuple[0]
        if original_data.references:
            for ref in original_data.references:
                ref.host_id = asset_id
                logger.debug(f"Inserting new host reference: {ref}")
                references_to_insert.append(ref.model_dump())

    if references_to_insert:
        await session.execute(insert(schema.assets.ORMAssetHostReference), references_to_insert)


async def process_and_add_hosts(session: AsyncSession, asset_data: list[schema.assets.AssetHostCreate]):
    """
    Process the host data and update or insert it into the database.

    Args:
        session: The database session for executing queries.
        asset_data: A list of host data to process.
                    Each host can contain nested structures that represent ORM relationship data

    """

    object_tracker = ObjectTracker()

    assets_to_insert: list[schema.assets.AssetHostCreate] = []
    assets_to_update = []
    refs_to_process = []

    if not asset_data:
        return

    query = (
        select(schema.assets.ORMAssetHost)
        .where(schema.assets.ORMAssetHost.ip.in_([x.ip for x in asset_data]))
        .options(selectinload(schema.assets.ORMAssetHost.references))
    )
    existing_assets = await session.scalars(query)
    existing_assets_map = {item.ip: item for item in existing_assets}

    for updated_asset in asset_data:
        key = updated_asset.ip

        if not object_tracker.is_unique(key):
            logger.warning(f"Skipping duplicate host with IP: {key}")
            continue

        if key not in existing_assets_map:
            assets_to_insert.append(updated_asset)
            logger.debug(f"Inserting new host: {updated_asset}")
            continue

        existing_asset = existing_assets_map[key]

        if updated_asset.references:
            refs_to_process.append(
                (updated_asset, existing_asset),
            )

        update_payload = create_confidence_based_update(
            existing_asset=existing_asset,
            updated_asset=updated_asset,
            ignore_keys=["confidence_score", "references"],
            ignore_values=[None],
        )
        if not update_payload:
            continue

        assets_to_update.append(update_payload)
        changes = get_model_and_orm_diff(updated_asset, existing_asset, ignore_keys=["confidence_score", "references"])
        logger.debug(f"Updating host with ID {existing_asset.id}. Changes detected (new, current): {changes}")

    if assets_to_insert:
        await insert_hosts_into_database(session=session, host_to_insert=assets_to_insert)
    if assets_to_update:
        await session.execute(update(schema.assets.ORMAssetHost), assets_to_update)

    await process_host_reference_payloads(session=session, asset_data=refs_to_process)

    await session.commit()


async def process_and_add_firewall_rules(
    session: AsyncSession, asset_data: list[schema.assets.AssetFirewallRuleCreate]
):
    """
    Process the firewall rule data and update or insert it into the database.

    Args:
        session: The database session for executing queries.
        asset_data: A list of firewall rule data to process.
    """
    object_tracker = ObjectTracker()
    assets_to_insert: list[dict] = []
    assets_to_update: list[dict] = []

    if not asset_data:
        return

    query = select(schema.assets.ORMAssetFirewallRule).where(
        schema.assets.ORMAssetFirewallRule.source_identifier.in_([x.source_identifier for x in asset_data])
    )

    existing_assets = await session.scalars(query)
    existing_assets_map = {item.source_identifier: item for item in existing_assets}

    for updated_asset in asset_data:
        key = updated_asset.source_identifier
        if not object_tracker.is_unique(key):
            logger.warning(f"Skipping duplicate firewall rule with source identifier: {key}")
            continue

        if key not in existing_assets_map:
            assets_to_insert.append(updated_asset.model_dump())
            logger.debug(f"Inserting new firewall rule: {updated_asset}")
            continue

        existing_asset = existing_assets_map[key]

        is_identical = compare_model_with_orm(
            updated_asset,
            existing_asset,
        )
        if is_identical:
            continue

        update_payload = create_full_update_payload(existing_asset=existing_asset, updated_asset=updated_asset)

        assets_to_update.append(update_payload)
        changes = get_model_and_orm_diff(updated_asset, existing_asset)
        logger.debug(f"Updating firewall rule with ID {existing_asset.id}. Changes detected (new, current): {changes}")

    if assets_to_insert:
        await session.execute(insert(schema.assets.ORMAssetFirewallRule), assets_to_insert)
    if assets_to_update:
        await session.execute(update(schema.assets.ORMAssetFirewallRule), assets_to_update)
    await session.commit()


async def import_service_definitions(session: AsyncSession):
    """
    Load and import service definitions from the 'services.json' file into the database.
    """
    services_file = get_project_root() / "resources/services.json"

    if not app_settings.IMPORT_SERVICE_DEFINITIONS:
        logger.debug("Import of predefined service assets is disabled in the application settings.")
        return

    current_service_version = await get_database_settings_value(
        session=session, key="service_definition_version", value_type=int
    )

    with open(services_file) as file:
        services = json.load(file)

    if not isinstance(services, dict):
        raise TypeError(f"service definition JSON file must be of type 'dict'. Current type: {type(services)}.")
    if services["version"] == current_service_version:
        return

    user_modified_ports = await session.scalars(
        select(schema.assets.ORMAssetService.port).where(
            schema.assets.ORMAssetService.port.in_([x["port"] for x in services["services"]])
            & schema.assets.ORMAssetService.is_modified_by_user
        )
    )

    user_modified_ports = list(user_modified_ports)

    # Filter out services modified by the user to avoid overwriting their changes
    services_to_import = [service for service in services["services"] if service["port"] not in user_modified_ports]

    logger.debug("Inserting service definitions into the database.")
    await update_or_insert_bulk(
        session=session,
        orm_schema=schema.assets.ORMAssetService,
        objects=services_to_import,
        unique_attribute=schema.assets.ORMAssetService.port,
        auto_commit=False,
    )

    await update_database_settings_value(
        session=session, key="service_definition_version", value=services["version"], group="assets", autocommit=False
    )
    await session.commit()
