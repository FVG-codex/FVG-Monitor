import { OsmizePage } from "@/components/OsmizePage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/osmize", locale });
}

export default function Page() {
  return <OsmizePage />;
}
