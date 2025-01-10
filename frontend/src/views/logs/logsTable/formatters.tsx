import { api } from "@/api";
import { Box, Input, TableTd } from "@/components";
import { parseAPIError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import { Cell } from "@tanstack/react-table";
import { set } from "lodash-es";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Host, QueryResultRecord } from "../types";
import { isFirewallRuleEntity, isNetwork } from "../util";

// export function FormatGenericValue({ value }: { value: unknown }) {
//   if (typeof value == "string") return value;
//   if (value.name == value.value) return String(value.name);

//   return (
//     <Box className="flex items-center" style={{ overflowWrap: "anywhere" }}>
//       <Box className="text-nowrap me-1">{value.name}</Box>
//       <RevealContent>
//         <Box className="text-xs">{value.value}</Box>
//       </RevealContent>
//     </Box>
//   );
// }

export function FormatNetwork({ value }: { value: unknown }) {
  if (isNetwork(value)) return <FormatAsTableRow name={value.name} value={value.cidr} />;
  return <FormatAsTableRow name={String(value)} value={String(value)} />;
}

export function FormatFirewallRuleResource({ value, is_inverted }: { value: unknown; is_inverted?: boolean }) {
  if (isFirewallRuleEntity(value))
    return (
      <>
        <TableTd className="pe-6 text-nowrap">
          {is_inverted && (
            <Box as="span" className="text-red-600 me-2">
              [NOT]
            </Box>
          )}
          {value.name}
        </TableTd>
        <TableTd className="w-full">{value.value}</TableTd>
      </>
    );
  return <FormatAsTableRow name={String(value)} value={String(value)} />;
}

export function FormatGenericValue({ value }: { value: unknown }) {
  if (typeof value == "string") return value;
  return String(value);
}

export function FormatAsTableRow({ name, value }: { name: React.ReactNode; value: unknown }) {
  return (
    <>
      <TableTd className="pe-6 text-nowrap">{name}</TableTd>
      <TableTd className="w-full">
        <FormatGenericValue value={value} />
      </TableTd>
    </>
  );
}

/**
 * Panel field that can be edited inline.
 *
 * This component uses its own internal state.
 * To ensure proper functionality, the `key` attribute (e.g., `key="unique_id"`) must be used
 * when rendering the component. This allows it to fully remount and reset its internal state
 * whenever its props change.
 */
export function EditablePanelField({ value, onSubmit }: { value?: string; onSubmit: (value: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const onSubmitCallback = useCallback(() => {
    setIsEditing(false);
    if (value != editValue && editValue != undefined) onSubmit(editValue);
  }, [setIsEditing, onSubmit, editValue, value]);

  return (
    <Box className="flex items-center">
      {isEditing ? (
        <Input
          ref={inputRef}
          className="input-sm grow"
          onBlur={() => onSubmitCallback()}
          value={editValue}
          onKeyDown={(e) => (e.key == "Enter" ? onSubmitCallback() : undefined)}
          onChange={(e) => setEditValue(e.target.value)}
        ></Input>
      ) : (
        <>
          {editValue}
          <Box className="ms-auto">
            <PencilSquareIcon className="size-4 hover:stroke-yellow-600" onClick={() => setIsEditing(true)} />
          </Box>
        </>
      )}
    </Box>
  );
}

type HostKeys = "source_device" | "destination_device";

/**
 * Allows inline editing of host-related fields, with support
 * for creating new hosts or updating existing ones. Changes are persisted via
 * an API call and the table data is updated accordingly.
 */
export function FormatHostEdit({
  name,
  value,
  dataKey,
  hostId,
  assetKey,
  cell,
}: {
  name: React.ReactNode;
  value?: unknown;
  assetKey: HostKeys;
  hostId?: Host["id"];
  dataKey: keyof Host;
  cell: Cell<QueryResultRecord, unknown>;
}) {
  const { mutate } = useMutation({
    mutationFn: (data: Partial<Host>) => {
      if (hostId) {
        return api.put(urlJoin("/api/assets/hosts", hostId), data).then((response) => response.data);
      } else {
        return api.post("/api/assets/hosts", data).then((response) => response.data);
      }
    },
    onSuccess: (response) => {
      if (hostId) {
        cell.getContext().table.options.meta?.updateData(updateExistingHostData(response));
      } else {
        cell.getContext().table.options.meta?.updateData(createNewHostData(response));
      }
    },
    onError: (error) => toast.error(`Failed to update host. ${parseAPIError(error).message}`),
  });

  const updateExistingHostData = useCallback((newHost: Host) => {
    function updateHost(row: QueryResultRecord, assetK: HostKeys) {
      const host = row[assetK];
      if (!host || host?.id != newHost.id) return row;
      const updatedRow = { ...row };
      set(updatedRow, assetK, newHost);
      return updatedRow;
    }

    return (prevTableData: QueryResultRecord[]) => {
      return prevTableData.map((row) => {
        const r = updateHost(row, "source_device");
        return updateHost(r, "destination_device");
      });
    };
  }, []);

  const createNewHostData = useCallback((newHost: Host) => {
    function updateHost(row: QueryResultRecord, assetK: HostKeys, ipKey: "source_ip" | "destination_ip") {
      const host = row[assetK];
      if (host || newHost.ip != row[ipKey]) return row;
      const updatedRow = { ...row };
      set(updatedRow, assetK, newHost);
      return updatedRow;
    }

    return (prevTableData: QueryResultRecord[]) => {
      return prevTableData.map((row) => {
        const r = updateHost(row, "source_device", "source_ip");
        return updateHost(r, "destination_device", "destination_ip");
      });
    };
  }, []);

  const onSubmit = useCallback(
    (newValue: string) => {
      const host = cell.row.original[assetKey];
      if (host) {
        mutate({ ...host, [dataKey]: newValue });
      } else {
        const ipKey = assetKey == "source_device" ? "source_ip" : "destination_ip";
        mutate({
          [dataKey]: newValue,
          ip: cell.row.original[ipKey],
        });
      }
    },
    [cell, assetKey, dataKey, mutate]
  );

  if (typeof value == "string" || value == null) {
    return (
      <>
        <TableTd className="pe-6 text-nowrap">{name}</TableTd>
        <TableTd className="w-full">
          <EditablePanelField value={value ?? undefined} onSubmit={onSubmit} />
        </TableTd>
      </>
    );
  } else {
    return <FormatAsTableRow name={name} value={value} />;
  }
}
