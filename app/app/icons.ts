import type { IconName } from "@/components/icon";

export const roleIcons: Record<string, IconName> = {
	dev: "code",
	lead: "compass",
	product: "layers",
	design: "pen",
	data: "chart",
	consulting: "bulb",
	business: "megaphone",
	student: "cap",
	other: "more",
};

export const levelIcons: Record<string, IconName> = {
	curious: "sprout",
	weekly: "layers",
	daily: "compass",
	core: "bolt",
	agents: "bot",
};

export const topicIcons: Record<string, IconName> = {
	daily: "code",
	roles: "layers",
	adoption: "compass",
	future: "star",
	agents: "bot",
	trust: "shield",
};
