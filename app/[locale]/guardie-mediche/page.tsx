import { GuardieMedichePage } from "@/components/GuardieMedichePage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/guardie-mediche", locale });
}

export default function Page() {
  return <GuardieMedichePage />;
}
