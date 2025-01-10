from pydantic import BaseModel

# Maximum number of events supported per query
MAX_LOG_COUNT = 20000


class EventsResponse(BaseModel):
    complete: bool
    duration: float
    results: list[dict]
    numResults: int
