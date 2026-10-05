import { getTranslations } from "next-intl/server";
import { InArrivoPage } from "@/components/InArrivoPage";

export default async function Page() {
  const tNav = await getTranslations("nav");
  const tPages = await getTranslations("inArrivoPages");
  return <InArrivoPage titolo={tPages("galleria")} backHref="/fvg-in-immagini" backLabel={tNav("immagini")} />;
}
