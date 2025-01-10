from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs.schema.metrics import ORMMetricsActivity


async def log_activity(
    session: AsyncSession,
    user_id: UUID,
    action: str,
    category: str,
    details: str | None = None,
    auto_commit: bool = True,
):
    """
    Logs user activity in the database.
    """
    session.add(ORMMetricsActivity(user_id=user_id, action=action, category=category, details=details))
    if auto_commit:
        await session.commit()
