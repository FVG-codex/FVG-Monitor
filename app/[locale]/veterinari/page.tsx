import { VeterinariPage } from "@/components/VeterinariPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/veterinari", locale });
}

export default function Page() {
  return <VeterinariPage />;
}
