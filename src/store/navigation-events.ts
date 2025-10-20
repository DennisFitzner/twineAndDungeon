type NavigateOptions = {
	openEditor?: boolean;
	centerAndHighlight?: boolean;
	fallbackPassageName?: string;
};

type NavigateHandler = (
	targetPartId: string,
	targetPassageId: string | undefined,
	options: NavigateOptions
) => void;

const listeners = new Set<NavigateHandler>();

export function onNavigateTo(handler: NavigateHandler): () => void {
	listeners.add(handler);
	return () => {
		listeners.delete(handler);
	};
}

export function emitNavigateTo(
	targetPartId: string,
	targetPassageId: string | undefined,
	options: NavigateOptions = {}
) {
	listeners.forEach(cb => cb(targetPartId, targetPassageId, options));
}
