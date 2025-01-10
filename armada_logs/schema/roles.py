from uuid import UUID

from pydantic import BaseModel, ConfigDict, computed_field
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ORMRole(Base):
    """
    Role database schema
    """

    __tablename__ = "roles"

    name: Mapped[str]
    description: Mapped[str]
    is_deletable: Mapped[bool] = mapped_column(default=False)
    scopes: Mapped[str]

    def __repr__(self):
        return (
            f"ORMRole(id={self.id}, name={self.name}, description='{self.description}',"
            f"is_deletable='{self.is_deletable}', scopes='{self.scopes}')"
        )


class Role(BaseModel):
    """
    Data model representing an ORM user role.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    is_deletable: bool
    scopes: str

    @computed_field
    @property
    def scope_list(self) -> list[str]:
        """
        Gets the list of scopes for the role.
        """
        return self.scopes.split(" ")

    @scope_list.setter
    def scope_list(self, scopes: list[str]):
        """
        Sets the scopes for the role.
        """
        self.scopes = " ".join(scopes)


class RoleResponse(Role):
    """
    API output model for a user role.
    """

    pass
