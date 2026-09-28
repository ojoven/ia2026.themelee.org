"use client";

import { DragDropProvider, KeyboardSensor, PointerSensor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { Icon } from "@/components/icon";
import { topics } from "@/lib/onboarding.mjs";
import { topicIcons } from "./icons";

type Topic = (typeof topics)[number];

function SortableTopic({
	topic,
	index,
	count,
	onMove,
}: {
	topic: Topic;
	index: number;
	count: number;
	onMove: (index: number, direction: -1 | 1) => void;
}) {
	const { ref, handleRef, isDragging, isDropTarget } = useSortable({
		id: topic.id,
		index,
		transition: { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)", idle: true },
	});

	return (
		<li
			ref={ref}
			className={`${isDragging ? "is-dragging" : ""} ${isDropTarget ? "is-drop-target" : ""}`}
		>
			<span className="ob-topic-rank">{String(index + 1).padStart(2, "0")}</span>
			<span className="ob-option-icon">
				<Icon name={topicIcons[topic.id]} />
			</span>
			<span className="ob-option-text">
				<small>{topic.tag}</small>
				<strong>{topic.label}</strong>
			</span>
			<span className="ob-topic-actions">
				<button
					ref={handleRef}
					type="button"
					className="ob-drag-handle"
					aria-label={`Arrastrar ${topic.label} para cambiar su prioridad`}
					title="Arrastrar para ordenar"
				>
					<span aria-hidden="true">⠿</span>
				</button>
				<button
					type="button"
					disabled={index === 0}
					aria-label={`Subir ${topic.label}`}
					onClick={() => onMove(index, -1)}
				>
					↑
				</button>
				<button
					type="button"
					disabled={index === count - 1}
					aria-label={`Bajar ${topic.label}`}
					onClick={() => onMove(index, 1)}
				>
					↓
				</button>
			</span>
		</li>
	);
}

export function TopicSort({
	order,
	onChange,
	onMove,
}: {
	order: string[];
	onChange: (order: string[]) => void;
	onMove: (index: number, direction: -1 | 1) => void;
}) {
	return (
		<DragDropProvider
			// The default touch sensor waits 250 ms and cancels on a short move.
			// This dedicated handle can start immediately without blocking page scroll elsewhere.
			sensors={[PointerSensor.configure({ activationConstraints: [] }), KeyboardSensor]}
			onDragEnd={(event) => {
				if (event.canceled || !isSortable(event.operation.source)) return;
				const { initialIndex, index } = event.operation.source;
				if (initialIndex === index || initialIndex < 0 || index < 0 || index >= order.length) return;
				const next = [...order];
				const [moved] = next.splice(initialIndex, 1);
				next.splice(index, 0, moved);
				onChange(next);
			}}
		>
			<ol className="ob-topic-sort" aria-label="Temas ordenados por prioridad">
				{order.map((id, index) => {
					const topic = topics.find((item) => item.id === id);
					return topic ? (
						<SortableTopic
							key={id}
							topic={topic}
							index={index}
							count={order.length}
							onMove={onMove}
						/>
					) : null;
				})}
			</ol>
		</DragDropProvider>
	);
}
