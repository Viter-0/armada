# Armada

[![PyPI - Version](https://img.shields.io/pypi/v/armada-logs?label=pypi%20package&color=blue)](https://github.com/Viter-0/armada)
[![PyPI - Python Version](https://img.shields.io/pypi/pyversions/armada-logs?color=blue)](https://github.com/Viter-0/armada)

Armada is a lightweight tool designed for centralized network log viewing across multiple data sources. It provides quick and detailed insights into network flows enriched with metadata.

Originally created to analyze VMware NSX logs, its broader goal is to become a versatile tool for general network log analysis.

## Features

- Simple setup process. There is no need for complex configurations or additional servers;
- Search query suggestions and autocompletion;
- Log correlation with relevant asset data;
- Current Data Source Support:
  - VMware Aria Operations for Logs
  - VMware Aria Operations for Networks
  - Ivanti Neurons (HEAT) for ITSM
  - IBM QRadar

## Screenshots

## Demo Access

You can explore Armada by accessing our demo environment. Please wait for the demo environment to start.

URL: [Demo](https://armada-pida.onrender.com/)

Login Credentials:

- Username: `demo@demo.lan`

- Password: `demo`

## Getting Started

Use pip to install Armada:

```console
pip install armada-logs
```

Run the application to launch the web server.

```console
armada run prod
```

Open the web interface in your browser. By default, it will start on <http://localhost:8000>

Create an initial user account.

Add at least one data source to start collecting logs and assets.

## Roadmap

Armada is continuously evolving with new features and integrations. Below are some of the planned enhancements. Have ideas or feature requests? Feel free to contribute or open an issue!

New Data Sources

- Palo Alto Firewall
- FortiGate Firewall
- Switches and Routers: Cisco, Fortinet, Aruba, Juniper
- Network Access Control (NAC): Cisco ISE, Aruba ClearPass

New Features

- Ability to view UTM logs such as Antivirus, Web-filter and IPS;
- Support for ARP and Security Groups as new asset types;
- Enhance asset data with user-defined attributes for more flexibility;
- Query data sources using user-defined attributes;

## Contributing

If you want to suggest features, report bugs, or contribute code, don't hesitate to reach out or create an issue.
