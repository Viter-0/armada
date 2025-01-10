from fastapi import APIRouter

from armada_logs.const import TagsEnum

from . import (
    app_settings,
    assets,
    authentication,
    credential_profiles,
    data_sources,
    identity,
    logs,
    metrics,
    setup,
)

api_router = APIRouter()
api_router.include_router(authentication.router, tags=[TagsEnum.AUTHENTICATION])
api_router.include_router(identity.router, tags=[TagsEnum.IDENTITY])
api_router.include_router(app_settings.router, tags=[TagsEnum.SETTINGS])
api_router.include_router(setup.router, tags=[TagsEnum.SETUP])
api_router.include_router(data_sources.router, tags=[TagsEnum.DATA_SOURCES])
api_router.include_router(credential_profiles.router, tags=[TagsEnum.DATA_SOURCES])
api_router.include_router(logs.router, tags=[TagsEnum.LOGS])
api_router.include_router(assets.router, tags=[TagsEnum.ASSETS])
api_router.include_router(metrics.router, tags=[TagsEnum.METRICS])
