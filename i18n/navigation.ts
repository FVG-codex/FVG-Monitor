import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// `createNavigation` (verificato su
// node_modules/next-intl/dist/types/navigation/react-client/createNavigation.d.ts)
// restituisce { Link, usePathname, useRouter, getPathname, redirect,
// permanentRedirect }. `Link` qui sostituisce `next/link` nei
// componenti condivisi (TopHeader, Footer, MenuHamburger): mantiene
// automaticamente il prefisso di lingua corrente quando si naviga tra
// pagine (es. da /en resta su /en/..., invece di tornare all'italiano
// senza prefisso).
export const { Link, usePathname, useRouter, getPathname, redirect, permanentRedirect } =
  createNavigation(routing);
