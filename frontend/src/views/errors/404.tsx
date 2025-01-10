import notFoundImage from "@/assets/media/page_not_found.svg";
import { Box, Button, Center, Heading, Image } from "@/components";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useLocation, useNavigate } from "react-router";

/**
 * Page component displayed when the requested route cannot be found (full-page view)..
 */
export function NotFoundErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLastLocationExists = location.key !== "default";

  return (
    <Center className="min-h-screen bg-base-200 text-center">
      <Box>
        <Image src={notFoundImage} className="h-72 m-auto" alt="Not Found logo" />
        <Heading className="py-6 font-medium">We are sorry, but the page you are looking for was not found.</Heading>
        <Button className="btn-primary" onClick={() => (isLastLocationExists ? navigate(-1) : navigate("/"))}>
          <ArrowLeftIcon className="h-6 w-6" />
          Take me back
        </Button>
      </Box>
    </Center>
  );
}
