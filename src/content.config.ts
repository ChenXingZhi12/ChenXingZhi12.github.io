import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import path from "node:path";
import { pathToFileURL } from "node:url";

const contentRoot = pathToFileURL(
  `${path.resolve(process.env.SITE_CONTENT_DIR ?? "./src/content")}${path.sep}`,
);
const generateId = ({ entry }: { entry: string }) =>
  entry.replace(/\.md$/i, "");
const common = {
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.coerce.date(),
  tags: z.array(z.string().min(1)).default([]),
  draft: z.boolean().default(true),
};

export const collections = {
  notes: defineCollection({
    loader: glob({
      pattern: "**/*.md",
      base: new URL("notes/", contentRoot),
      generateId,
    }),
    schema: z.object({ ...common, category: z.string().min(1) }),
  }),
  projects: defineCollection({
    loader: glob({
      pattern: "**/*.md",
      base: new URL("projects/", contentRoot),
      generateId,
    }),
    schema: z.object({
      ...common,
      featured: z.boolean().default(false),
      image: z.string().optional(),
      code: z.url({ protocol: /^https?$/ }).optional(),
      demo: z.url({ protocol: /^https?$/ }).optional(),
    }),
  }),
};
