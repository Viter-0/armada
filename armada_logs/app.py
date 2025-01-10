from fastapi import FastAPI

from armada_logs import __version__
from armada_logs.lifespan import api_server_lifespan

from .api import api_router
from .const import APP_NAME
from .util.errors import exception_handlers


def create_app(debug: bool = False, **kwargs) -> FastAPI:
    app = FastAPI(
        title=APP_NAME,
        debug=debug,
        version=__version__,
        lifespan=api_server_lifespan,
        exception_handlers=exception_handlers,
        docs_url="/docs" if debug else None,
        redoc_url="/redoc" if debug else None,
        openapi_url="/openapi.json" if debug else None,
        **kwargs,
    )
    app.include_router(api_router, prefix="/api")

    return app


app_prod = create_app()
app_dev = create_app(debug=True)
