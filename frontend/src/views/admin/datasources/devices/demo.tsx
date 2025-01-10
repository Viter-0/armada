import { Box, Center, Heading, Text } from "@/components";

export function DemoDataSourceNotAllowed() {
  return (
    <Center className="h-full text-center">
      <Box className="max-w-md">
        <Heading as="h1" className="text-3xl font-bold">
          Not Allowed
        </Heading>
        <Text className="py-6">This data source is part of the demo setup and cannot be modified.</Text>
      </Box>
    </Center>
  );
}
