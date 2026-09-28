import type { Metadata } from "next";
import { Onboarding } from "./onboarding";
import "./app.css";

export const metadata: Metadata = {
	title: "Calentamos motores · The Mêlée",
	description:
		"Cuatro pasos para compartir cómo trabajas con IA y ordenar los temas de conversación de The Mêlée.",
	alternates: { canonical: "/app" },
	robots: { index: false },
};

export default function OnboardingPage() {
	return <Onboarding />;
}
