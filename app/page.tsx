import { APP_NAME } from "@/lib/site";
import { IDEA } from "./idea/content";
import { IdeaView } from "./idea/idea-view";
export default function HomePage() {
  return (
    <IdeaView name={APP_NAME} content={IDEA} showHoles={process.env.NODE_ENV === "development"} />
  );
}
