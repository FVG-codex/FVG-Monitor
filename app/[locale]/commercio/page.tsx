import { CommercioPage } from "@/components/CommercioPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/commercio", locale });
}

export default function Page() {
  return <CommercioPage />;
}
