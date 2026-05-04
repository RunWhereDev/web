import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = process.env.PUBLIC_SITE_URL || "https://runwhere.dev";

export default defineConfig({
  site,
  trailingSlash: "always",
  integrations: [sitemap()]
});
