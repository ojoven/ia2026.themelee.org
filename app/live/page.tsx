import type { Metadata } from "next";
import { LivePhone } from "./phone";
import "../app/app.css";
import "./live.css";

export const metadata: Metadata = {
	title: "En directo · The Mêlée",
	description: "Vota desde tu móvil durante The Mêlée.",
	alternates: { canonical: "/live" },
	robots: { index: false },
};

export default function LivePage() {
	return <LivePhone />;
}
