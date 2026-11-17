import { getTranslations } from "next-intl/server";
import { InArrivoPage } from "@/components/InArrivoPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/galleria", locale });
}

export default async function Page() {
  const tNav = await getTranslations("nav");
  const tPages = await getTranslations("inArrivoPages");
  return <InArrivoPage titolo={tPages("galleria")} backHref="/fvg-in-immagini" backLabel={tNav("immagini")} />;
}
