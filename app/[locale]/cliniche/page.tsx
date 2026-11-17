import { ClinichePage } from "@/components/ClinichePage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/cliniche", locale });
}

export default function Page() {
  return <ClinichePage />;
}
