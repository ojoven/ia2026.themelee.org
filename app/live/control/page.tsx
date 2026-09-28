import type { Metadata } from "next";
import { LiveControl } from "../control";
import "../../app/app.css";
import "../live.css";

export const metadata: Metadata = {
	title: "Sala de control · The Mêlée",
	alternates: { canonical: "/live/control" },
	robots: { index: false },
};

export default function ControlPage() {
	return <LiveControl />;
}
