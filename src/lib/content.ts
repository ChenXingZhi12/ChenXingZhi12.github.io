import { getCollection } from "astro:content";

export async function publishedNotes() {
  return (await getCollection("notes", ({ data }) => !data.draft)).sort(
    (a, b) =>
      b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export async function publishedProjects() {
  return (await getCollection("projects", ({ data }) => !data.draft)).sort(
    (a, b) =>
      b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export const contentUrl = (collection: "notes" | "projects", id: string) =>
  `/${collection}/${id.split("/").map(encodeURIComponent).join("/")}/`;

export const noteFilterUrl = (key: "category" | "tag", value: string) =>
  `/notes/?${key}=${encodeURIComponent(value)}`;

export const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(date);

export const yearLabel = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(date);
