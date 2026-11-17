import { MareePage } from "@/components/MareePage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/maree", locale });
}

export default function Page() {
  return <MareePage />;
}
