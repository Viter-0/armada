import {
  Anchor,
  Box,
  ContentLoadingError,
  ContentLoadingOverlay,
  Heading,
  HyperLink,
  Modal,
  ModalTitle,
} from "@/components";
import { useModal } from "@/util/hooks";

import { api } from "@/api";
import { paths } from "@/api/schema";
import { GITHUB } from "@/config/const";
import { useQuery } from "@tanstack/react-query";

type AppState = paths["/api/settings/state"]["get"]["responses"]["200"]["content"]["application/json"];

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box className="flex">
      <Box className="w-36">{title}</Box>
      <Box as="span">{children}</Box>
    </Box>
  );
}

function About() {
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["app_state"],
    queryFn: () => {
      return api.get<AppState>("/api/settings/state").then((response) => response.data);
    },
  });

  if (isError) return <ContentLoadingError error={error} />;
  if (isPending) return <ContentLoadingOverlay />;

  return (
    <Box className="prose">
      <Box>
        <Heading as="h4">General</Heading>
        <InfoBox title="Version">{data.version}</InfoBox>
        <InfoBox title="GitHub">
          <HyperLink className="link-primary" href={GITHUB}>
            {GITHUB}
          </HyperLink>
        </InfoBox>
        <InfoBox title="License">
          <HyperLink className="link-primary" href={GITHUB}>
            MIT
          </HyperLink>
        </InfoBox>
      </Box>
      <Box>
        <Heading as="h4">Runtime</Heading>
        <InfoBox title="Broker">{String(data.broker)}</InfoBox>
        <InfoBox title="Environment">{String(data.environment)}</InfoBox>
      </Box>
    </Box>
  );
}

/**
 * Modal with information about the application.
 */
export default function AboutModal() {
  const { isOpen, open, close } = useModal();

  const { isPending, isError, data, error } = useQuery({
    queryKey: ["setupState"],
    queryFn: () => {
      return api.get<AppState>("/api/settings/state").then((response) => response.data);
    },
  });

  if (isError) return <ContentLoadingError error={error} />;
  if (isPending) return <ContentLoadingOverlay />;
  if (!data) return null;

  return (
    <>
      <Anchor onClick={() => open()}>About</Anchor>
      <Modal isOpen={isOpen} close={close}>
        <ModalTitle className="pb-0">About</ModalTitle>
        {!isError ? <About /> : <ContentLoadingError error={error} />}
      </Modal>
    </>
  );
}
