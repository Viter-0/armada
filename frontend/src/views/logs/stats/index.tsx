import {
  Box,
  Center,
  Collapse,
  CollapseContent,
  CollapseTitle,
  Heading,
  Modal,
  ModalTitle,
  TabContent,
  TableBody,
  TableHead,
  TableNative,
  TableTd,
  TableTh,
  TableTr,
  TabLink,
  TabList,
  Text,
  ToolTip,
} from "@/components";
import { useModal } from "@/util/hooks";
import { twClassJoin } from "@/util/twMerge";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { useMemo, useState } from "react";
import { QueryResult } from "../types";

export interface StatusIndicatorProps extends React.ComponentPropsWithoutRef<"div"> {
  type?: "error" | "warning" | "success";
}
export function StatusIndicator({ type, className = "", ...props }: StatusIndicatorProps) {
  const textClassName = useMemo(() => {
    switch (type) {
      case "error":
        return "text-error";
      case "warning":
        return "text-warning";
      default:
        return "";
    }
  }, [type]);

  return (
    <Box {...props} className={twClassJoin("relative", type ? "cursor-pointer" : "opacity-30", className)}>
      <ToolTip message="Query statistics">
        {!["success", undefined].includes(type) && (
          <ChartBarIcon className={twClassJoin("w-8 h-8 ms-2 shrink-0 animate-ping absolute", textClassName)} />
        )}
        <ChartBarIcon className={twClassJoin("w-8 h-8 ms-2 shrink-0", textClassName)} />
      </ToolTip>
    </Box>
  );
}

export function QueryErrorList({ errors }: { errors: Required<SearchStatisticsProps>["errors"] }) {
  return errors.map((item, idx) => (
    <Collapse className="collapse-plus bg-none text-none max-w-5xl" key={idx}>
      <CollapseTitle className=" flex items-center">
        <ExclamationTriangleIcon className="size-5 me-2 text-error" />
        <Box className="max-w-4xl">
          <Box className="font-semibold text-sm truncate text-error">{item.name}</Box>
          <Text className="text-xs truncate">{item.message}</Text>
        </Box>
      </CollapseTitle>
      <CollapseContent className="text-xs ms-7">{item.message}</CollapseContent>
    </Collapse>
  ));
}

function ErrorStatsTab({ errors }: { errors: SearchStatisticsProps["errors"] }) {
  if (errors == undefined || errors.length == 0)
    return (
      <Center className="h-32">
        <Heading as="h1" className="text-2xl">
          The query contains no errors.
        </Heading>
      </Center>
    );

  return (
    <Box className="pt-4">
      <QueryErrorList errors={errors} />
    </Box>
  );
}

function MetadataStatsTab({ meta }: { meta: SearchStatisticsProps["meta"] }) {
  if (!meta)
    return (
      <Center className="h-32">
        <Heading as="h1" className="text-2xl">
          Metadata for the query could not be found.
        </Heading>
      </Center>
    );

  return (
    <TableNative className="mt-2 table table-sm">
      <TableHead>
        <TableTr>
          <TableTh>Name</TableTh>
          <TableTh>Target</TableTh>
          <TableTh>Duration (seconds)</TableTh>
        </TableTr>
      </TableHead>
      <TableBody>
        {Object.values(meta.execution_durations).map((entity) => (
          <TableTr key={entity.name + entity.target}>
            <TableTd className="pe-6">{entity.name}</TableTd>
            <TableTd className="pe-6">{entity.target}</TableTd>
            <TableTd>{entity.duration}</TableTd>
          </TableTr>
        ))}
      </TableBody>
    </TableNative>
  );
}

export interface SearchStatisticsProps {
  errors?: QueryResult["errors"];
  meta?: QueryResult["meta"];
  isSuccess?: QueryResult["is_success"];
}
export function SearchStatistics({ errors, meta, isSuccess }: SearchStatisticsProps) {
  const modal = useModal();
  const tabs = useMemo(
    () => [
      { name: "Errors", key: "errors", content: <ErrorStatsTab errors={errors} /> },
      { name: "Execution Time", key: "execution", content: <MetadataStatsTab meta={meta} /> },
    ],
    [errors, meta]
  );
  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const type: StatusIndicatorProps["type"] = isSuccess ? ((errors?.length ?? 0) > 0 ? "warning" : "success") : "error";
  const isDisabled = !errors && !meta;

  return (
    <>
      <StatusIndicator type={isDisabled ? undefined : type} onClick={() => !isDisabled && modal.open()} />
      <Modal {...modal} className="rounded-none w-11/12 max-w-5xl min-h-96 max-h-4/5">
        <ModalTitle>Current query statistics</ModalTitle>
        <TabList className="tabs-bordered">
          {tabs.map((item) => (
            <TabLink
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={activeTab === item.key ? "!border-secondary" : ""}
            >
              {item.name}
            </TabLink>
          ))}
          <TabContent isActive>{tabs.find((item) => item.key == activeTab)?.content}</TabContent>
        </TabList>
      </Modal>
    </>
  );
}
