import type { Metadata } from "next";
import { Tab } from "@/components/Tab";

export const metadata: Metadata = { title: "Tab" };
export default function Page() {
  return <Tab />;
}
