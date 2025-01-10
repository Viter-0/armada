from pydantic import BaseModel


class CI(BaseModel):
    RecId: str
    IPAddress: str | None = None
    Name: str
    Description: str | None = None
    DomainName: str | None = None
    Status: str | None = None
    CIType: str | None = None
    Owner: str | None = None
    OwnerEmailAddress: str | None = None
    Administrator: str | None = None
    Manufacturer: str | None = None
    SerialNumber: str | None = None

    def split_ips(self) -> list[str] | set[str]:
        """
        Split a string containing multiple IP addresses.

        :return: A list or set of individual IP addresses.
        """
        separators = [";", ","]
        if self.IPAddress is None:
            return []
        for sep in separators:
            if sep in self.IPAddress:
                return set(ip.strip() for ip in self.IPAddress.split(sep))
        return [self.IPAddress.strip()]
