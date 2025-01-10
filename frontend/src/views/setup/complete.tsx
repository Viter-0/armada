import setupLogo from "@/assets/media/setup_logo.svg";
import { Anchor, Box, Card, Center, Heading, Image, Progress, Text } from "@/components";
import { APP_NAME, GITHUB } from "@/config/const";
import { urlJoin } from "@/util/helpers";
import { Link } from "react-router";

/**
 * Displays the setup completion screen.
 */
export function SetupComplete({ progress }: { progress: string | number }) {
  const adminDashboardRoute = "/admin";

  return (
    <Center className="min-h-screen bg-base-200">
      <Card className="mx-auto max-w-lg shadow-none bg-base-none">
        <Box className="py-16 px-10 shadow-xl bg-base-100 rounded-xl">
          <Box className="text-center">
            <Image src={setupLogo} className="mb-2 h-32 m-auto" alt="Setup logo"></Image>
            <Heading className="text-3xl font-semibold mb-2 ">Setup is complete!</Heading>
            <Text>You are now ready to explore the full potential of {APP_NAME}!</Text>
          </Box>
          <Box className="divider uppercase text-xs">What&apos;s Next?</Box>
          <Box className="mb-3">
            <Box className="mb-2">
              <Anchor className="link link-primary" href={GITHUB}>
                Check out the documentation
              </Anchor>
            </Box>
            <Text>
              For an in-depth understanding of the features and capabilities, check out the documentation on GitHub.
            </Text>
          </Box>
          <Box>
            <Box className="mb-2">
              <Link className="link link-primary" to={urlJoin(adminDashboardRoute, "/datasources/devices")}>
                Configure Your Data Sources
              </Link>
            </Box>
            <Text>Add your firewalls, IPAM and SIEM to gain a full understanding of the network.</Text>
          </Box>
        </Box>
        <Box className="flex items-center mt-4">
          <Box className="flex-1">
            <Progress className="progress-primary w-36" value={progress} max="100"></Progress>
          </Box>
          <Link className="btn btn-primary" to={adminDashboardRoute}>
            Admin Dashboard
          </Link>
        </Box>
      </Card>
    </Center>
  );
}
