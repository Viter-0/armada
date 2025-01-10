from typing import Literal

from pydantic import BaseModel


class QRadarIPAddress(BaseModel):
    id: int
    network_id: int
    value: str
    type: Literal["IPV4", "IPV6"]
    ip_addresses: list | None = None
    created: int
    first_seen_scanner: int | None = None
    first_seen_profiler: int | None = None
    last_seen_scanner: int | None = None
    last_seen_profiler: int | None = None


class QRadarInterface(BaseModel):
    id: int
    mac_address: str | None = None
    ip_addresses: list[QRadarIPAddress]
    created: int
    first_seen_scanner: int | None = None
    first_seen_profiler: int | None = None
    last_seen_scanner: int | None = None
    last_seen_profiler: int | None = None


class QRadarUser(BaseModel):
    id: int
    username: str
    first_seen_scanner: int | None = None
    first_seen_profiler: int | None = None
    last_seen_scanner: int | None = None
    last_seen_profiler: int | None = None


class QRadarHostname(BaseModel):
    id: int
    type: Literal["DNS", "NETBIOS", "NETBIOSGROUP"]
    name: str
    first_seen_scanner: int | None = None
    first_seen_profiler: int | None = None
    last_seen_scanner: int | None = None
    last_seen_profiler: int | None = None


class QRadarAsset(BaseModel):
    id: int
    domain_id: int
    vulnerability_count: int
    risk_score_sum: int
    hostnames: list[QRadarHostname]
    interfaces: list[QRadarInterface]
    products: list
    properties: list
    users: list[QRadarUser]


class QRadarSearchResults(BaseModel):
    events: list[dict]


class QRadarNetwork(BaseModel):
    cidr: str
    country_code: str | None = None
    description: str
    domain_id: int
    group: str
    id: int
    location: dict | None = None
    name: str
    network_id: int
