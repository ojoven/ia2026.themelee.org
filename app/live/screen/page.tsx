import type { Metadata } from "next";
import { Monitor } from "./monitor";
import "../live.css";

export const metadata: Metadata = {
	title: "Pantalla · The Mêlée",
	alternates: { canonical: "/live/screen" },
	robots: { index: false },
};

export default function ScreenPage() {
	return <Monitor />;
}
