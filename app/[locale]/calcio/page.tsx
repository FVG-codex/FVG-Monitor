import { CalcioPage } from "@/components/CalcioPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/calcio", locale });
}

export default function Page() {
  return <CalcioPage />;
}
