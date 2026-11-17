import { AmbientePage } from "@/components/AmbientePage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/ambiente", locale });
}

export default function Page() {
  return <AmbientePage />;
}
