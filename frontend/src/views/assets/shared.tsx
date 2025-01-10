import { Badge, Box, InformationTooltip } from "@/components";
import { twClassJoin } from "@/util/twMerge";

/**
 * Displays a status indicating whether an asset is locked.
 */
export function AssetLockStatus({ isLocked = false }: { isLocked?: boolean }) {
  return (
    <>
      <Box className="flex justify-end items-center">
        <Badge className={twClassJoin("badge-outline mx-2", isLocked ? "badge-error" : "badge-success")}>
          {isLocked ? "Locked" : "Unlocked"}
        </Badge>
        <InformationTooltip
          iconClassName="stroke-sky-400"
          className="ms-2"
          message="Modifying this asset will lock it, preventing any future updates from data sources.  
            To remove the lock, you will need to delete the asset."
        />
      </Box>
    </>
  );
}
