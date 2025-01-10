from secrets import token_hex

from fastapi_login import LoginManager

from armada_logs.settings import app as app_settings
from armada_logs.util.errors import InsufficientScopeException

TOKEN_URL = "/api/auth/token"


def get_access_secret() -> str:
    """
    Retrieve the access JWT secret. If it is not set, generate a new one.
    """
    if app_settings.ACCESS_JWT_SECRET != "":
        return app_settings.ACCESS_JWT_SECRET
    app_settings.upsert_env_variables(variables={"ACCESS_JWT_SECRET": token_hex(64)})
    return app_settings.ACCESS_JWT_SECRET


def get_refresh_secret() -> str:
    """
    Retrieve the refresh JWT secret. If it is not set, generate a new one.
    """
    if app_settings.REFRESH_JWT_SECRET != "":
        return app_settings.REFRESH_JWT_SECRET
    app_settings.upsert_env_variables(variables={"REFRESH_JWT_SECRET": token_hex(64)})
    return app_settings.REFRESH_JWT_SECRET


access_manager = LoginManager(
    secret=get_access_secret(),
    token_url=TOKEN_URL,
    use_cookie=False,
    use_header=True,
    out_of_scope_exception=InsufficientScopeException,
)

refresh_manager = LoginManager(
    secret=get_refresh_secret(),
    token_url=TOKEN_URL,
    use_cookie=True,
    use_header=False,
    cookie_name="x-refresh-token",
    out_of_scope_exception=InsufficientScopeException,
)
