import { Box } from "./layout";

export interface SettingsOptionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}

export function SettingsOption({ title, description, required, children }: SettingsOptionProps) {
  return (
    <Box className="flex items-center mb-4">
      <Box className="w-1/2">
        <Box className={required ? "form-required" : ""}>{title}</Box>
        <Box className="text-sm text-justify opacity-80 me-6">{description}</Box>
      </Box>
      <Box className="grow flex flex-col justify-center">{children}</Box>
    </Box>
  );
}
