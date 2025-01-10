import importlib
from os.path import sep as path_sep
from pathlib import Path
from typing import ClassVar

from armada_logs.const import DataSourceTypesEnum
from armada_logs.schema.data_sources import DataSource, ORMDataSource, PolymorphicDataSource
from armada_logs.sources.aria_logs.source import SourceAriaLogs
from armada_logs.sources.aria_networks.source import SourceAriaNetworks
from armada_logs.sources.demo.source import SourceDemo
from armada_logs.sources.ivanti.source import SourceIvantiITSM
from armada_logs.sources.nsx.source import SourceVmwareNSX
from armada_logs.sources.qradar.source import SourceQRadar
from armada_logs.sources.vcenter.source import SourceVmwareVCenter

from .logging import logger
from .sources.resources import SourceBase


class DataSourceRegistry:
    """Registry to manage data source classes."""

    _registry: dict[DataSourceTypesEnum, type[SourceBase]] = {
        DataSourceTypesEnum.ARIA_NETWORKS: SourceAriaNetworks,
        DataSourceTypesEnum.DEMO: SourceDemo,
        DataSourceTypesEnum.IVANTI_ITSM: SourceIvantiITSM,
        DataSourceTypesEnum.QRADAR: SourceQRadar,
        DataSourceTypesEnum.ARIA_LOGS: SourceAriaLogs,
        DataSourceTypesEnum.VMWARE_NSX: SourceVmwareNSX,
        DataSourceTypesEnum.VMWARE_VCENTER: SourceVmwareVCenter,
    }

    @classmethod
    def register(cls, name: DataSourceTypesEnum, source_cls: type[SourceBase]):
        if name in cls._registry:
            return
        cls._registry[name] = source_cls
        logger.debug(f"Register data source class: {name}")

    @classmethod
    def get_by_type(cls, source_type: DataSourceTypesEnum | str):
        if isinstance(source_type, str):
            source_type = DataSourceTypesEnum(source_type)
        return cls._registry[source_type]


class TasksRegistry:
    # Static list of task modules that rarely change
    static_task_modules: ClassVar[list[str]] = ["armada_logs.jobs"]

    @classmethod
    def get_app_task_modules(cls) -> list[str]:
        """
        Get all available task modules, both static and dynamically discovered.

        Returns:
            List of module paths as strings
        """

        modules: list[str] = []

        # Static modules
        modules.extend(cls.static_task_modules)

        # Dynamic asset modules
        modules.extend(cls._get_tasks_modules("armada_logs.sources"))

        return modules

    @classmethod
    def import_app_task_modules(cls):
        """
        Import all task modules into the current Python environment.
        Combines both static and dynamically discovered modules.
        """
        modules: list[str] = cls.get_app_task_modules()
        cls._import_tasks_modules(modules)

    @classmethod
    def _get_tasks_modules(cls, package_name: str = "armada_logs", glob_pattern: str = "**/tasks.py") -> list[str]:
        """
        Discover task modules in the specified package.

        Args:
            package_name: The name of the package to search for task modules.
            glob_pattern: The glob pattern to match the task files. Defaults to '**/tasks.py'.

        Returns:
            A list of module paths for the discovered task modules.
        """
        package = importlib.import_module(package_name)
        package_path = Path(package.__path__[0])
        task_files = list(package_path.glob(glob_pattern))

        module_paths = []
        for task_file in task_files:
            relative_path = task_file.relative_to(package_path).with_suffix("")
            module_path = f"{package_name}.{str(relative_path).replace(path_sep, '.')}"
            module_paths.append(module_path)
            logger.debug(f"Discovered task module: {module_path}")
        return module_paths

    @classmethod
    def _import_tasks_modules(cls, modules: list[str]):
        """
        Import modules into the current Python environment.
        This is needed because some task files may be standalone.
        """
        for module_name in modules:
            logger.debug(f"Importing task module into the current Python environment: '{module_name}'")
            importlib.import_module(module_name)


class DataSourceFactory:
    """Factory to create data source instances."""

    @staticmethod
    def from_config(config: ORMDataSource | DataSource) -> SourceBase:
        """
        Create a data source instance from an ORM or Pydantic model.
        """
        cls = DataSourceRegistry.get_by_type(config.entity_type)
        if isinstance(config, DataSource):
            return cls(config=config)
        else:
            return cls(config=PolymorphicDataSource.model_validate(config).root)
