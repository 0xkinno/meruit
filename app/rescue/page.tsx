import type { Metadata } from "next";
import { Rescue } from "@/components/Rescue";

export const metadata: Metadata = { title: "Get my money back" };
export default function Page() {
  return <Rescue />;
}
