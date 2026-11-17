import { DentistiPage } from "@/components/DentistiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/dentisti", locale });
}

export default function Page() {
  return <DentistiPage />;
}
