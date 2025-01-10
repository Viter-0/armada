from datetime import UTC, datetime
from typing import Annotated, Literal, Optional
from uuid import UUID

from fastapi import Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, DateTimeUTC
from .util import Reference, TimeInterval


class ORMMetricsTask(Base):
    """
    This table stores task execution statistics.
    """

    __tablename__ = "metrics_task"

    time: Mapped[datetime] = mapped_column(DateTimeUTC(timezone=True), default=lambda: datetime.now(UTC), index=True)
    name: Mapped[str]
    task: Mapped[str]
    message: Mapped[Optional[str]]
    origin: Mapped[Optional[str]]
    status: Mapped[str]
    execution_time: Mapped[float]

    def __repr__(self):
        return (
            f"ORMMetricsTask(id={self.id}, time={self.time}, name='{self.name}', task='{self.task}', "
            f"message='{self.message}', origin='{self.origin}', status='{self.status}', "
            f"execution_time={self.execution_time})"
        )


class ORMMetricsActivity(Base):
    """
    This table stores user activity metrics.
    """

    __tablename__ = "metrics_activity"

    time: Mapped[datetime] = mapped_column(DateTimeUTC(timezone=True), default=lambda: datetime.now(UTC), index=True)
    user_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    category: Mapped[str]
    action: Mapped[str]
    details: Mapped[Optional[str]]

    def __repr__(self):
        return (
            f"ORMMetricsActivity(id={self.id}, time={self.time}, user_id='{self.user_id}', category='{self.category}', action='{self.action}', "
            f"details='{self.details}')"
        )


class MetricsTask(BaseModel):
    """
    Model representing an ORM task metrics.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    time: datetime
    name: str
    task: str = Field(..., description="The internal or programmatic identifier for the task")
    origin: str | None = Field(
        default=None, description="The origin or source of the task, such as module or data source id"
    )
    message: str | None = Field(
        default=None, description="Any message or log related to the task execution, such as error or success details"
    )
    status: str = Field(..., description="The status of the task, indicating whether it succeeded or failed")
    execution_time: float = Field(..., description="The total time taken to execute the task in seconds")


class MetricsTaskResponse(MetricsTask):
    """
    API output model for task metrics.
    """

    """Add `Reference` to simplify frontend data handling."""
    source: Reference | None = None


class MetricsActivity(BaseModel):
    """
    Model representing an ORM activity metrics.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    time: datetime
    category: str
    action: str
    user_id: UUID | None = None
    details: str | None = None


class MetricsActivityResponse(MetricsActivity):
    """
    API output model for activity metrics.
    """

    # Add `Reference` to simplify frontend data handling.
    user: Reference | None = None


class TaskQueueResponse(BaseModel):
    """
    API output model for task queue metrics.
    """

    size: int = Field(description="The number of tasks currently in the queue")


class BaseMetricsQueryParams(BaseModel):
    """
    Base API Query parameters
    """

    interval: Annotated[TimeInterval, Depends()]


class TasksQueryParams(BaseMetricsQueryParams):
    """
    Tasks API Query parameters
    """

    origin: str | None = None
    status: Literal["error", "success"] | None = None


class ActivityQueryParams(BaseMetricsQueryParams):
    """
    Activity API Query parameters
    """

    user_id: UUID | None = None
    category: str | None = None
