import { EventiPage } from "@/components/EventiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/eventi", locale });
}

export default function Page() {
  return <EventiPage />;
}
