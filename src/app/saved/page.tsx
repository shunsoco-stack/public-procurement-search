import type { Metadata } from "next";
import { SavedNotices } from "@/components/saved-notices";
import { PageHeading } from "@/components/ui";

export const metadata: Metadata = { title: "保存した案件", robots: { index: false } };
export default function SavedPage() { return <><PageHeading eyebrow="YOUR SHORTLIST" title="保存した案件" description="気になる仕事を集めて、じっくり確認。" /><SavedNotices /></>; }
