import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://chenxingzhi12.github.io",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) =>
        !page.endsWith("/404/") &&
        !page.endsWith("/404.html") &&
        !page.endsWith("/search/"),
    }),
  ],
  markdown: { shikiConfig: { theme: "github-light" } },
  devToolbar: { enabled: false },
});
