import type { Metadata } from "next";
import { Dashboard } from "./dashboard";
import "../app.css";

export const metadata: Metadata = {
	title: "El mapa del círculo · The Mêlée",
	description: "Cómo usa la IA el círculo de The Mêlée: perfiles, herramientas y temas.",
	alternates: { canonical: "/app/dashboard" },
	robots: { index: false },
};

export default function DashboardPage() {
	return <Dashboard />;
}
