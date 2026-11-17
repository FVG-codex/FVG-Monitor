import { ColonnineElettrichePage } from "@/components/ColonnineElettrichePage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/colonnine-elettriche", locale });
}

export default function Page() {
  return <ColonnineElettrichePage />;
}
