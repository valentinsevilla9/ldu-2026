import type { Metadata } from "next";
import { APP_NAME } from "@/lib/site";
import { IDEA } from "./content";
import { IdeaView } from "./idea-view";

export const metadata: Metadata = { title: "La idea", description: IDEA.tagline };

export default function IdeaPage() {
  return (
    <IdeaView name={APP_NAME} content={IDEA} showHoles={process.env.NODE_ENV === "development"} />
  );
}
