import {
  Box,
  Collapse,
  CollapseContent,
  CollapseTitle,
  ListItem,
  OrderedList,
  SectionTitle,
  UnorderedList,
} from "@/components";

export function Information({ children }: { children: React.ReactNode }) {
  return (
    <Collapse className="collapse-arrow" type="checkbox">
      <CollapseTitle>Information</CollapseTitle>
      <CollapseContent className="prose">
        <UnorderedList>{children}</UnorderedList>
      </CollapseContent>
    </Collapse>
  );
}

interface PreparationProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * Container for displaying a preparation section with and a list of ordered items.
 */
export function Preparation({ title = "Data Source preparation", children }: PreparationProps) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <Box className="prose">
        <OrderedList>{children}</OrderedList>
      </Box>
    </>
  );
}

export function InfoItemSSLCertificate() {
  return (
    <ListItem>
      To ensure proper certificate verification for SSL connections, the CA certificate used to sign the server&apos;s
      certificate must be imported into the system&apos;s CA certificate store.
    </ListItem>
  );
}

export function InfoItemSupportedVersion({ min, max, versions }: { min?: string; max?: string; versions?: string }) {
  return (
    <ListItem>
      {versions && (
        <Box>
          Supported versions:
          <Box as="span" className="text-red-600 ms-1">
            {versions}
          </Box>
        </Box>
      )}
      {min && (
        <Box>
          Minimum supported version:
          <Box as="span" className="text-red-600 ms-1">
            {min}
          </Box>
        </Box>
      )}
      {max && (
        <Box>
          Maximum supported version:
          <Box as="span" className="text-red-600 ms-1">
            {max}
          </Box>
        </Box>
      )}
    </ListItem>
  );
}
