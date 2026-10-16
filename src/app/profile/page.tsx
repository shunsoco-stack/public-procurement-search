import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { PageHeading } from "@/components/ui";

export const metadata: Metadata = { title: "自分の条件" };
export default function ProfilePage() { return <><PageHeading eyebrow="YOUR WORK PROFILE" title="自分の条件" description="得意なことと確認したい条件を、仕事探しの手がかりに。" /><ProfileForm /></>; }
