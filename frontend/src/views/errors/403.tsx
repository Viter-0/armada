import { Box, Button, Center, Heading, Text } from "@/components";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useLocation, useNavigate } from "react-router";

/**
 * Page component displayed when the user lacks the necessary permissions (full-page view).
 */
export function ForbiddenErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLastLocationExists = location.key !== "default";

  return (
    <Center className="min-h-screen bg-base-200 text-center">
      <Box>
        <Heading className="text-5xl font-bold">Forbidden</Heading>
        <Text className="py-6">We are sorry, but you don&apos;t have the required permissions to access this page</Text>
        <Button className="btn-primary" onClick={() => (isLastLocationExists ? navigate(-1) : navigate("/"))}>
          <ArrowLeftIcon className="h-6 w-6" />
          Take me back
        </Button>
      </Box>
    </Center>
  );
}
