import { TennisPage } from "@/components/TennisPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/tennis", locale });
}

export default function Page() {
  return <TennisPage />;
}
