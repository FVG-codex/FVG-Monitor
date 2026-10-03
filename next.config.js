// `require("next-intl/plugin")` — verificato sul package.json di
// next-intl 4.14.9: la condizione "./plugin" è la SOLA tra gli entry
// point del pacchetto ad avere un ramo "require" (CJS) oltre a
// "import" (ESM), proprio perché next.config.js è caricato da Next.js
// con require() nativo di Node, non con un bundler — tutti gli altri
// entry (., ./server, ./routing, ./navigation...) sono ESM-only e
// vanno importati solo da file che Next.js stesso compila (i18n/*.ts,
// middleware.ts), non da qui.
// Il file dist/cjs/development/plugin.cjs fa
// `module.exports = createNextIntlPlugin` (nessun wrapping in
// `.default`), quindi l'import CJS sotto restituisce direttamente la
// funzione, senza bisogno di `.default`.
const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withNextIntl(nextConfig);
