"""initial

Revision ID: dc8bdb03eb0a
Revises:
Create Date: 2025-01-09 20:10:09.756871

"""

from collections.abc import Sequence
from typing import Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

import armada_logs.schema.base
from armada_logs.const import IdentityProviderTypesEnum, RolesEnum, ScopesEnum

# revision identifiers, used by Alembic.
revision: str = "dc8bdb03eb0a"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("group", sa.String(), nullable=False, comment="Category or grouping for the setting"),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_table(
        "asset_hosts",
        sa.Column("ip", sa.String(), nullable=False),
        sa.Column("vrf", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("domain", sa.String(), nullable=True),
        sa.Column("mac_address", sa.String(), nullable=True),
        sa.Column("vendor", sa.String(), nullable=True),
        sa.Column("owner", sa.String(), nullable=True),
        sa.Column("is_vm", sa.Boolean(), nullable=False),
        sa.Column("entity_type", sa.Enum("host", native_enum=False), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("is_modified_by_user", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ip"),
    )
    op.create_table(
        "asset_networks",
        sa.Column("cidr", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("entity_type", sa.Enum("network", native_enum=False), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("is_modified_by_user", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "asset_services",
        sa.Column("port", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("protocol", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("entity_type", sa.Enum("service", native_enum=False), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("is_modified_by_user", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("port"),
    )
    op.create_table(
        "asset_users",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("department", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("telephone_number", sa.String(), nullable=True),
        sa.Column("manager", sa.String(), nullable=True),
        sa.Column("job_title", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("upn", sa.String(), nullable=True, comment="User Principal Name"),
        sa.Column("samaccountname", sa.String(), nullable=True, comment="SAM Account Name"),
        sa.Column("entity_type", sa.Enum("asset_user", native_enum=False), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("asset_users", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_asset_users_email"), ["email"], unique=False)
        batch_op.create_index("ix_asset_users_identity_search", ["email", "upn", "samaccountname"], unique=False)
        batch_op.create_index(batch_op.f("ix_asset_users_samaccountname"), ["samaccountname"], unique=False)
        batch_op.create_index(batch_op.f("ix_asset_users_upn"), ["upn"], unique=False)

    op.create_table(
        "credential_profiles",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("entity_type", sa.String(), nullable=True),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("password", armada_logs.schema.base.EncryptedStringType(key=""), nullable=True),
        sa.Column("token", armada_logs.schema.base.EncryptedStringType(key=""), nullable=True),
        sa.Column("domain", sa.String(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "metrics_task",
        sa.Column("time", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("task", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=True),
        sa.Column("origin", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("execution_time", sa.Float(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("metrics_task", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_metrics_task_time"), ["time"], unique=False)

    providers = op.create_table(
        "providers",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("is_deletable", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("password", armada_logs.schema.base.EncryptedStringType(key=""), nullable=True),
        sa.Column("user", sa.String(), nullable=True),
        sa.Column("cn", sa.String(), nullable=True),
        sa.Column("search_filter", sa.String(), nullable=True),
        sa.Column("base", sa.String(), nullable=True),
        sa.Column("is_connection_secure", sa.Boolean(), nullable=True),
        sa.Column("port", sa.Integer(), nullable=True),
        sa.Column("server", sa.String(), nullable=True),
        sa.Column("is_certificate_validation_enabled", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    roles = op.create_table(
        "roles",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("is_deletable", sa.Boolean(), nullable=False),
        sa.Column("scopes", sa.String(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "util_esxi_nsx_mapping",
        sa.Column("host", sa.String(), nullable=False),
        sa.Column("nsx_manager", sa.String(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("host"),
    )
    op.create_table(
        "data_sources",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("host", sa.String(), nullable=True),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("is_assets_supported", sa.Boolean(), nullable=False),
        sa.Column("is_logs_supported", sa.Boolean(), nullable=False),
        sa.Column("credential_profile_id", sa.Uuid(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("is_log_fetching_enabled", sa.Boolean(), nullable=False),
        sa.Column("is_certificate_validation_enabled", sa.Boolean(), nullable=False),
        sa.Column("asset_collection_interval", sa.Integer(), nullable=False),
        sa.Column("is_asset_collection_enabled", sa.Boolean(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["credential_profile_id"],
            ["credential_profiles.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "users",
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("password_hash", sa.LargeBinary(), nullable=True),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["providers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "asset_firewall_rules",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("rule_id", sa.String(), nullable=False),
        sa.Column("sources", sa.JSON(), nullable=False),
        sa.Column("destinations", sa.JSON(), nullable=False),
        sa.Column("source_zones", sa.JSON(), nullable=False),
        sa.Column("destination_zones", sa.JSON(), nullable=False),
        sa.Column("source_interfaces", sa.JSON(), nullable=False),
        sa.Column("destination_interfaces", sa.JSON(), nullable=False),
        sa.Column("services", sa.JSON(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("is_source_inverted", sa.Boolean(), nullable=False),
        sa.Column("is_destination_inverted", sa.Boolean(), nullable=False),
        sa.Column("direction", sa.String(), nullable=True),
        sa.Column("entity_type", sa.Enum("firewall_rule", native_enum=False), nullable=False),
        sa.Column("source_identifier", sa.String(), nullable=False),
        sa.Column("source_identifier_alt", sa.String(), nullable=True),
        sa.Column("data_source_id", sa.Uuid(), nullable=False),
        sa.Column("manager", sa.String(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["data_source_id"], ["data_sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_identifier"),
        sa.UniqueConstraint("source_identifier_alt"),
    )
    op.create_table(
        "asset_hosts_references",
        sa.Column("data_source_id", sa.Uuid(), nullable=False),
        sa.Column("source_identifier", sa.String(), nullable=False),
        sa.Column("host_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["data_source_id"], ["data_sources.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["host_id"], ["asset_hosts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("data_source_id", "host_id", name="unique_host_reference"),
    )
    op.create_table(
        "metrics_activity",
        sa.Column("time", armada_logs.schema.base.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("details", sa.String(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("_sentinel", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("metrics_activity", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_metrics_activity_time"), ["time"], unique=False)
        batch_op.create_index(batch_op.f("ix_metrics_activity_user_id"), ["user_id"], unique=False)

    op.bulk_insert(
        roles,
        [
            {
                "id": uuid4(),
                "name": RolesEnum.ADMIN,
                "description": "Full access to all features and functionalities",
                "is_deletable": False,
                "scopes": " ".join(
                    [ScopesEnum.ADMIN_READ, ScopesEnum.ADMIN_WRITE, ScopesEnum.USER_READ, ScopesEnum.USER_WRITE]
                ),
            },
            {
                "id": uuid4(),
                "name": RolesEnum.USER,
                "description": "Basic access for app usage, allowing reading and writing user-related data",
                "is_deletable": False,
                "scopes": " ".join([ScopesEnum.USER_READ, ScopesEnum.USER_WRITE]),
            },
            {
                "id": uuid4(),
                "name": RolesEnum.AUDIT,
                "description": "Read-only access",
                "is_deletable": False,
                "scopes": " ".join([ScopesEnum.USER_READ, ScopesEnum.ADMIN_READ]),
            },
        ],
    )

    op.bulk_insert(
        providers,
        [
            {
                "id": uuid4(),
                "name": "LOCAL",
                "entity_type": IdentityProviderTypesEnum.LOCAL,
                "description": "Authenticate users using LOCAL database",
                "is_deletable": False,
                "is_enabled": True,
            }
        ],
    )


def downgrade() -> None:
    with op.batch_alter_table("metrics_activity", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_metrics_activity_user_id"))
        batch_op.drop_index(batch_op.f("ix_metrics_activity_time"))

    op.drop_table("metrics_activity")
    op.drop_table("asset_hosts_references")
    op.drop_table("asset_firewall_rules")
    op.drop_table("users")
    op.drop_table("data_sources")
    op.drop_table("util_esxi_nsx_mapping")
    op.drop_table("roles")
    op.drop_table("providers")
    with op.batch_alter_table("metrics_task", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_metrics_task_time"))

    op.drop_table("metrics_task")
    op.drop_table("credential_profiles")
    with op.batch_alter_table("asset_users", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_asset_users_upn"))
        batch_op.drop_index(batch_op.f("ix_asset_users_samaccountname"))
        batch_op.drop_index("ix_asset_users_identity_search")
        batch_op.drop_index(batch_op.f("ix_asset_users_email"))

    op.drop_table("asset_users")
    op.drop_table("asset_services")
    op.drop_table("asset_networks")
    op.drop_table("asset_hosts")
    op.drop_table("app_settings")
