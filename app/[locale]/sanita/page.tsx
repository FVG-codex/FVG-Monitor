import { SanitaPage } from "@/components/SanitaPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/sanita", locale });
}

export default function Page() {
  return <SanitaPage />;
}
