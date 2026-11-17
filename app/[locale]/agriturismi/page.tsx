import { StrutturaTipoPage } from "@/components/StrutturaTipoPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/agriturismi", locale });
}

export default function Page() {
  return <StrutturaTipoPage tipo="agriturismi" />;
}
