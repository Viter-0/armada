from armada_logs import models
from armada_logs.core.tasks import tasks_broker
from armada_logs.database.dependencies import get_db_session_context


@tasks_broker.task(schedule=[{"cron": "0 1 * * *"}])
async def task_purge_stale_assets():
    """
    Scheduled task to purge stale assets from the database.

    Runs every day as per the cron schedule.
    """
    async with get_db_session_context() as session:
        await models.assets.purge_stale_networks(session=session)
