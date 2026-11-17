import { SupermercatiPage } from "@/components/SupermercatiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/supermercati", locale });
}

export default function Page() {
  return <SupermercatiPage />;
}
