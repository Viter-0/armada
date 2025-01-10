from time import perf_counter
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute, selectinload

from armada_logs import schema
from armada_logs.util.errors import InputValidationError, NotFoundError
from armada_logs.util.helpers import validate_mac_address

"""
Dictionary mapping query fields to their resolution logic. If no mapping exists for a query field, the original value
is used without modification.
"""
QUERY_FIELD_MAPPING = {
    "source_device_name": {
        "resolver": {
            "func": "_resolve_query_filter_assets",
            "params": {
                "orm_model": schema.assets.ORMAssetHost,
                "orm_field": schema.assets.ORMAssetHost.name,
                "asset_field": "ip",
                "resolved_field": "source_ip",
            },
        }
    },
    "destination_device_name": {
        "resolver": {
            "func": "_resolve_query_filter_assets",
            "params": {
                "orm_model": schema.assets.ORMAssetHost,
                "orm_field": schema.assets.ORMAssetHost.name,
                "asset_field": "ip",
                "resolved_field": "destination_ip",
            },
        }
    },
    "source_device_mac": {
        "formatter": "_format_query_filter_mac_address",
        "resolver": {
            "func": "_resolve_query_filter_assets",
            "params": {
                "orm_model": schema.assets.ORMAssetHost,
                "orm_field": schema.assets.ORMAssetHost.mac_address,
                "asset_field": "ip",
                "resolved_field": "source_ip",
            },
        },
    },
    "destination_device_mac": {
        "formatter": "_format_query_filter_mac_address",
        "resolver": {
            "func": "_resolve_query_filter_assets",
            "params": {
                "orm_model": schema.assets.ORMAssetHost,
                "orm_field": schema.assets.ORMAssetHost.mac_address,
                "asset_field": "ip",
                "resolved_field": "destination_ip",
            },
        },
    },
}


ARRAY_EXPRESSIONS = ["in", "nin"]

# Maps non-standard expressions (e.g., expressions used by assets) to expressions supported by standard log fields.
ATTRIBUTE_COMPATIBILITY_EXPRESSIONS = {
    "in": "in",
    "nin": "nin",
    "eq": "eq",
    "neq": "neq",
}

# Special mapping of filter expressions for compatibility with array-based queries
ATTRIBUTE_COMPATIBILITY_ARRAY_EXPRESSIONS = {
    "eq": "in",
    "neq": "nin",
}


def is_array_expression(expr: str) -> bool:
    return expr in ARRAY_EXPRESSIONS


class QueryMapper:
    @classmethod
    def _create_orm_select_filter(cls, orm_field: InstrumentedAttribute, expression: str, value: list[str] | str):
        """
        Constructs a SQLAlchemy query filter based on the provided expression and value.
        """
        match expression:
            case "in":
                if not isinstance(value, list):
                    raise InputValidationError("'in' expression requires a list of values")
                return orm_field.in_(value)
            case "nin":
                if not isinstance(value, list):
                    raise InputValidationError("'nin' expression requires a list of values")
                # Note: Using in_ here as negation is handled at a higher query-building level
                return orm_field.in_(value)
            case "eq":
                if isinstance(value, list):
                    raise InputValidationError("'eq' expression requires a single value")
                return orm_field == value
            case "neq":
                if isinstance(value, list):
                    raise InputValidationError("'neq' expression requires a single value")
                # Note: Using == here as negation is handled at a higher query-building level
                return orm_field == value
            case _:
                raise InputValidationError(
                    f"Unsupported expression: {expression}. The provided expression is not supported by QueryResolver"
                )

    @classmethod
    async def _get_orm_assets(
        cls, session: AsyncSession, query_filter: schema.logs.QueryFilter, orm_model, orm_field: InstrumentedAttribute
    ):
        """
        Retrieve ORM assets
        """
        stmt = select(orm_model).where(
            cls._create_orm_select_filter(
                orm_field=orm_field,
                expression=query_filter.expression,
                value=query_filter.value,
            )
        )
        return await session.scalars(stmt)

    @classmethod
    def _transform_asset_filter(
        cls,
        original_filter: schema.logs.QueryFilter,
        assets: list[schema.assets.PolymorphicAsset],
        asset_field: str,
        resolved_field: str,
    ) -> schema.logs.QueryFilter:
        """
        Transforms an Asset QueryFilter to be compatible with an entity_type="log".
        """

        # Map the original filter expression to a log-compatible expression
        new_expression = ATTRIBUTE_COMPATIBILITY_EXPRESSIONS.get(original_filter.expression)
        if not new_expression:
            raise NotFoundError(
                f"No compatible expression found for {original_filter.expression}. The provided expression is not supported by QueryResolver"
            )

        # Extract values from the resolved assets
        try:
            new_value = [getattr(asset, asset_field) for asset in assets]
        except AttributeError as e:
            raise NotFoundError(f"Could not extract {asset_field} from assets: {str(e)}") from None

        if not new_value:
            raise NotFoundError(
                f"Failed to resolve assets. The provided asset values '{original_filter.value}' "
                "were not found and cannot be used in the query. Please verify the input and ensure the assets exist."
            )

        if not is_array_expression(new_expression):
            if len(new_value) == 1:
                new_value = new_value[0]
            else:
                # Convert single value expression into array-compatible
                old_expression = new_expression
                new_expression = ATTRIBUTE_COMPATIBILITY_ARRAY_EXPRESSIONS.get(new_expression)
                if not new_expression:
                    raise InputValidationError(
                        f"The expression '{old_expression}' requires a single value, but multiple values were resolved: {new_value} "
                        "and there's no alternative expression available."
                    )

        return schema.logs.QueryFilter(
            expression=new_expression, field=resolved_field, entity_type="log", value=new_value
        )

    @classmethod
    async def _resolve_query_filter_assets(
        cls,
        session: AsyncSession,
        query_filter: schema.logs.QueryFilter,
        orm_model,
        orm_field: InstrumentedAttribute,
        asset_field: str,
        resolved_field: str,
    ) -> schema.logs.QueryFilterResolved:
        """
        Resolves a query filter by mapping it to assets retrieved from the database.
        This function is designed to work with any asset type.

        Args:
            orm_field: The ORM field to filter the database query on.
            asset_field: The attribute in the resolved assets to use for constructing the new filter.
            resolved_field: The field in the transformed filter that will be updated based on the resolved assets.

        """
        result = await cls._get_orm_assets(
            session=session, query_filter=query_filter, orm_model=orm_model, orm_field=orm_field
        )
        result = [schema.assets.PolymorphicAsset.model_validate(entity) for entity in result]
        resolved_assets = None
        if len(result) == 1:
            resolved_assets = result[0]
        elif len(result) > 1:
            resolved_assets = result

        transformed_filter = cls._transform_asset_filter(
            original_filter=query_filter, asset_field=asset_field, assets=result, resolved_field=resolved_field
        )

        return schema.logs.QueryFilterResolved(
            original=query_filter, resolved=transformed_filter, assets=resolved_assets
        )

    @classmethod
    async def _format_query_filter_mac_address(
        cls, session: AsyncSession, query_filter: schema.logs.QueryFilter
    ) -> schema.logs.QueryFilter:
        if isinstance(query_filter.value, list):
            query_filter.value = [validate_mac_address(x) for x in query_filter.value if x is not None]
        else:
            query_filter.value = validate_mac_address(query_filter.value)

        return query_filter

    @classmethod
    async def resolve_query_filter(
        cls, session: AsyncSession, query_filter: schema.logs.QueryFilter
    ) -> schema.logs.QueryFilterResolved:
        """
        Resolves a query filter into a log-compatible format using custom logic.

        Raises:
            ValueError: If the resolver function is not callable or improperly defined.

        Notes:
            - Resolver function must be async and accept params: session, query_filter.
        """

        field_config = QUERY_FIELD_MAPPING.get(query_filter.field)

        # Return the original query filter if no resolution logic is defined
        if not field_config or not field_config.get("resolver"):
            return schema.logs.QueryFilterResolved(original=query_filter)

        resolver = field_config["resolver"]

        resolve_func = resolver["func"]
        if not callable(resolve_func):
            resolve_func = getattr(cls, resolve_func, None)
        if not callable(resolve_func):
            raise ValueError(f"Resolver function for field '{query_filter.field}' is not callable.")

        return await resolve_func(session=session, query_filter=query_filter, **resolver.get("params", {}))

    @classmethod
    async def format_query_filter(
        cls, session: AsyncSession, query_filter: schema.logs.QueryFilter
    ) -> schema.logs.QueryFilter:
        """
        Formats a query filter using a custom formatter function.

        Notes:
            - Formatter function must be async and accept params: session, query_filter.
        """
        field_config = QUERY_FIELD_MAPPING.get(query_filter.field)

        # Return the original query filter if no resolution logic is defined
        if not field_config or not field_config.get("formatter"):
            return query_filter

        formatter_func = field_config["formatter"]
        if not callable(formatter_func):
            formatter_func = getattr(cls, formatter_func, None)
        if not callable(formatter_func):
            raise ValueError(f"Formatter function for field '{query_filter.field}' is not callable.")

        try:
            return await formatter_func(session=session, query_filter=query_filter)
        except Exception as e:
            raise InputValidationError(str(e)) from e


async def create_search_query(session: AsyncSession, query: schema.logs.SearchQueryRequest) -> schema.logs.SearchQuery:
    """
    Resolve query assets fields and create a search query
    """

    resolved_filters = []
    for query_filter in query.filter:
        new_filter = await QueryMapper.format_query_filter(session=session, query_filter=query_filter)
        new_filter = await QueryMapper.resolve_query_filter(session=session, query_filter=new_filter)
        resolved_filters.append(new_filter)

    return schema.logs.SearchQuery(
        time_interval=query.time_interval,
        log_count=query.log_count,
        filter=resolved_filters,
    )


async def get_log_data_sources(
    session: AsyncSession, source_ids: list[UUID] | None = None
) -> list[schema.data_sources.ORMDataSource]:
    """
    Returns a list of log sources that are capable of log search.
    """
    query = select(schema.data_sources.ORMDataSource).where(
        (schema.data_sources.ORMDataSource.is_logs_supported) & (schema.data_sources.ORMDataSource.is_enabled)
    )
    if source_ids:
        query = query.where(schema.data_sources.ORMDataSource.id.in_(source_ids))

    result = await session.scalars(query)
    return [entity for entity in result if getattr(entity, "is_log_fetching_enabled", False)]


class ReferenceResolver:
    @classmethod
    async def _resolve_hosts(cls, session: AsyncSession, response: schema.logs.SearchQueryResponse):
        start_time = perf_counter()

        source_identifiers: set[str] = set()

        for record in response.results:
            if isinstance(record.source_device, schema.util.AssetReference):
                source_identifiers.add(record.source_device.source_identifier)
            if isinstance(record.destination_device, schema.util.AssetReference):
                source_identifiers.add(record.destination_device.source_identifier)

        refs = await session.scalars(
            select(schema.assets.ORMAssetHostReference)
            .options(selectinload(schema.assets.ORMAssetHostReference.host))
            .where(schema.assets.ORMAssetHostReference.source_identifier.in_(source_identifiers))
        )
        refs_map = {ref.source_identifier: schema.assets.AssetHostResponse.model_validate(ref.host) for ref in refs}

        for record in response.results:
            if isinstance(record.source_device, schema.util.AssetReference):
                record.source_device = refs_map.get(record.source_device.source_identifier)
            if isinstance(record.destination_device, schema.util.AssetReference):
                record.destination_device = refs_map.get(record.destination_device.source_identifier)

        response.meta.execution_durations.append(
            schema.logs.ExecutionTime(name="Resolve references", target="hosts", duration=perf_counter() - start_time)
        )

    @classmethod
    async def _resolve_firewall_rules(cls, session: AsyncSession, response: schema.logs.SearchQueryResponse):
        start_time = perf_counter()

        source_identifiers: set[str] = set()

        for record in response.results:
            if isinstance(record.firewall_rule, schema.util.AssetReference):
                source_identifiers.add(record.firewall_rule.source_identifier)

        rules = await session.scalars(
            select(schema.assets.ORMAssetFirewallRule).where(
                schema.assets.ORMAssetFirewallRule.source_identifier.in_(source_identifiers)
                | schema.assets.ORMAssetFirewallRule.source_identifier_alt.in_(source_identifiers)
            )
        )
        rules_map: dict[str, schema.assets.AssetFirewallRuleResponse] = {}
        for rule in rules:
            rule_model = schema.assets.AssetFirewallRuleResponse.model_validate(rule)
            rules_map[rule.source_identifier] = rule_model
            if rule.source_identifier_alt is not None:
                rules_map[rule.source_identifier_alt] = rule_model

        for record in response.results:
            if isinstance(record.firewall_rule, schema.util.AssetReference):
                if record.firewall_rule.source_identifier in rules_map:
                    record.firewall_rule = rules_map.get(record.firewall_rule.source_identifier)
                else:
                    record.firewall_rule = None

        response.meta.execution_durations.append(
            schema.logs.ExecutionTime(
                name="Resolve references", target="firewall_rules", duration=perf_counter() - start_time
            )
        )

    @classmethod
    async def resolve_asset_references(cls, session: AsyncSession, response: schema.logs.SearchQueryResponse):
        """
        Resolve asset references in the search query response.
        """
        await cls._resolve_hosts(session, response)
        await cls._resolve_firewall_rules(session, response)


class AssetResolver:
    @classmethod
    async def _populate_networks(cls, session: AsyncSession, response: schema.logs.SearchQueryResponse):
        start_time = perf_counter()
        networks = await session.scalars(select(schema.assets.ORMAssetNetwork))
        networks = [schema.assets.AssetNetworkResponse.model_validate(network) for network in networks]
        _cache = {}

        for record in response.results:
            src_ip_str = str(record.source_ip)
            if src_ip_str in _cache:
                record.source_networks = _cache[src_ip_str]
            else:
                _cache[src_ip_str] = [net for net in networks if net.contains(record.source_ip)]
                record.source_networks = _cache[src_ip_str]

            dst_ip_str = str(record.destination_ip)
            if dst_ip_str in _cache:
                record.destination_networks = _cache[dst_ip_str]
            else:
                _cache[dst_ip_str] = [net for net in networks if net.contains(record.destination_ip)]
                record.destination_networks = _cache[dst_ip_str]

        response.meta.execution_durations.append(
            schema.logs.ExecutionTime(name="Populate assets", target="networks", duration=perf_counter() - start_time)
        )

    @classmethod
    async def _populate_hosts(cls, session: AsyncSession, response: schema.logs.SearchQueryResponse):
        start_time = perf_counter()

        _hosts_ips = set()

        for record in response.results:
            if record.source_device is None:
                _hosts_ips.add(str(record.source_ip))
            if record.destination_device is None:
                _hosts_ips.add(str(record.destination_ip))

        if _hosts_ips:
            hosts = await session.scalars(
                select(schema.assets.ORMAssetHost).where(schema.assets.ORMAssetHost.ip.in_(_hosts_ips))
            )
            host_map = {host.ip: schema.assets.AssetHostResponse.model_validate(host) for host in hosts}

            for record in response.results:
                src_ip = str(record.source_ip)
                dst_ip = str(record.destination_ip)
                if record.source_device is None and src_ip in host_map:
                    record.source_device = host_map[src_ip]
                if record.destination_device is None and dst_ip in host_map:
                    record.destination_device = host_map[dst_ip]

        response.meta.execution_durations.append(
            schema.logs.ExecutionTime(name="Populate assets", target="hosts", duration=perf_counter() - start_time)
        )

    @classmethod
    async def populate_assets(cls, session: AsyncSession, response: schema.logs.SearchQueryResponse):
        await cls._populate_networks(session, response)
        await cls._populate_hosts(session, response)
