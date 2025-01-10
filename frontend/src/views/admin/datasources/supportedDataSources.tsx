import { Image } from "@/components";
import { DataSourceTypesEnum } from "@/config/const";
import { AriaLogsDataSourceCreate, AriaLogsDataSourceUpdate } from "./devices/ariaLogs";
import { AriaNetworksDataSourceCreate, AriaNetworksDataSourceUpdate } from "./devices/ariaNetworks";
import { DataSourceCreateComponent, DataSourceUpdateComponent } from "./types";

import device_aria_networks from "@/assets/media/device_aria_logs.png";
import device_aria_logs from "@/assets/media/device_aria_networks.png";
import device_ivanti_itsm from "@/assets/media/device_ivanti_itsm.png";
import device_nsx from "@/assets/media/device_nsx.png";
import device_qradar from "@/assets/media/device_qradar.webp";
import device_vcenter from "@/assets/media/device_vcenter.png";

import { urlJoin } from "@/util/helpers";
import { DemoDataSourceNotAllowed } from "./devices/demo";
import { IvantiITSMDataSourceCreate, IvantiITSMDataSourceUpdate } from "./devices/ivanti_itsm";
import { VmwareNSXDataSourceCreate, VmwareNSXDataSourceUpdate } from "./devices/nsx";
import { QRadarDataSourceCreate, QRadarDataSourceUpdate } from "./devices/qradar";
import { VmwareVCenterDataSourceCreate, VmwareVCenterDataSourceUpdate } from "./devices/vCenter";

const iconClasses = "h-10 w-10";

/**
 * Represents the structure of a data source that the application can handle.
 */
export interface SupportedDataSource {
  id: string; // URL-safe string
  name: string;
  description: string;
  type: string;
  vendor: string;
  icon: React.ReactNode;
  // Whether this source is displayed in the creation window
  isVisible?: boolean;
  create: {
    component: DataSourceCreateComponent;
    route: string;
  };
  get: {
    component: undefined;
    route: string;
  };
  delete: {
    component: undefined;
    route: string;
  };
  update: {
    component: DataSourceUpdateComponent;
    route: string;
  };
  validate: {
    component: undefined;
    route: string;
  };
}

/**
 * Helper function to create CRUD operations with defaults
 */
function createCRUDOperations(
  baseRoute: string,
  createComponent: DataSourceCreateComponent,
  updateComponent: DataSourceUpdateComponent
): Pick<SupportedDataSource, "get" | "delete" | "create" | "update" | "validate"> {
  return {
    get: { route: baseRoute, component: undefined },
    delete: { route: baseRoute, component: undefined },
    create: { route: baseRoute, component: createComponent },
    update: { route: baseRoute, component: updateComponent },
    validate: {
      component: undefined,
      route: urlJoin(baseRoute, "validate"),
    },
  };
}

/**
 * A list of supported data source types with detailed configurations for each type.
 */
export const supportedDataSourceTypes: SupportedDataSource[] = [
  {
    id: DataSourceTypesEnum.ARIA_LOGS,
    name: "VMware Aria Operations for Logs",
    description:
      "Provides unified visibility across IT environments through robust log aggregation, analytics, and faster root cause determination",
    type: "Log Management",
    vendor: "VMware",
    ...createCRUDOperations("/api/data_sources/aria_logs", AriaLogsDataSourceCreate, AriaLogsDataSourceUpdate),
    icon: <Image className={iconClasses} src={device_aria_logs}></Image>,
  },
  {
    id: DataSourceTypesEnum.ARIA_NETWORKS,
    name: "VMware Aria Operations for Networks",
    description:
      "Network monitoring and troubleshooting tool that helps you build an optimized, highly available and secure network infrastructure across your VMware Cloud Foundation and NSX environments",
    type: "Log Management",
    vendor: "VMware",
    ...createCRUDOperations(
      "/api/data_sources/aria_networks",
      AriaNetworksDataSourceCreate,
      AriaNetworksDataSourceUpdate
    ),
    icon: <Image className={iconClasses} src={device_aria_networks}></Image>,
  },
  {
    id: DataSourceTypesEnum.IVANTI_ITSM,
    name: "Ivanti Neurons (HEAT) for ITSM",
    description:
      "Ivanti Neurons for ITSM is a IT service management platform that automates workflows, streamlines IT operations",
    type: "Service Management",
    vendor: "Ivanti",
    ...createCRUDOperations("/api/data_sources/ivanti_itsm", IvantiITSMDataSourceCreate, IvantiITSMDataSourceUpdate),
    icon: <Image className={iconClasses} src={device_ivanti_itsm}></Image>,
  },
  {
    id: DataSourceTypesEnum.DEMO,
    name: "Demo",
    description: "Demo with sample data",
    type: "Log Management",
    vendor: "Armada",
    ...createCRUDOperations("/api/data_sources/demo", DemoDataSourceNotAllowed, DemoDataSourceNotAllowed),
    icon: "",
    isVisible: false,
  },
  {
    id: DataSourceTypesEnum.QRADAR,
    name: "IBM QRadar",
    description:
      "IBM QRadar is a network security management platform that provides situational awareness and compliance support. QRadar uses a combination of flow-based network knowledge, security event correlation, and asset-based vulnerability assessment.",
    type: "SIEM",
    vendor: "IBM",
    ...createCRUDOperations("/api/data_sources/qradar", QRadarDataSourceCreate, QRadarDataSourceUpdate),
    icon: <Image className={iconClasses} src={device_qradar}></Image>,
  },
  {
    id: DataSourceTypesEnum.VMWARE_NSX,
    name: "VMware NSX-T",
    description:
      "VMware NSX is a network virtualization and security platform that enables a software-defined approach to networking that extends across data centers, clouds, and application frameworks",
    type: "Firewall",
    vendor: "VMware",
    ...createCRUDOperations("/api/data_sources/vmware_nsx", VmwareNSXDataSourceCreate, VmwareNSXDataSourceUpdate),
    icon: <Image className={iconClasses} src={device_nsx}></Image>,
  },
  {
    id: DataSourceTypesEnum.VMWARE_VCENTER,
    name: "VMware vCenter (vSphere)",
    description:
      "vCenter Server Appliance is the centralized management utility for VMware, and is used to manage virtual machines, multiple ESXi hosts, and all dependent components from a single centralized location",
    type: "Infra Management",
    vendor: "VMware",
    ...createCRUDOperations(
      "/api/data_sources/vmware_vcenter",
      VmwareVCenterDataSourceCreate,
      VmwareVCenterDataSourceUpdate
    ),
    icon: <Image className={iconClasses} src={device_vcenter}></Image>,
  },
];

/**
 * Utility object to manage data sources.
 */
export const dataSourceManager = {
  getDataSourceByType(type: string): SupportedDataSource | undefined {
    return supportedDataSourceTypes.find((item) => item.id === type);
  },

  getAllDataSources(): SupportedDataSource[] {
    return supportedDataSourceTypes;
  },
};
