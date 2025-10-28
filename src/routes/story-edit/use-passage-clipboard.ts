import {v4 as uuid} from '@lukeed/uuid';
import * as React from 'react';
import {useHotkeys} from 'react-hotkeys-hook';
import {deletePassages, Story} from '../../store/stories';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import {unusedName} from '../../util/unused-name';
import type {TwineElectronWindow} from '../../electron/shared';

const CLIPBOARD_OFFSET = 30;

interface ClipboardPassage {
	height: number;
	left: number;
	name: string;
	tags: string[];
	text: string;
	top: number;
	width: number;
}

interface ClipboardData {
	lastPasteStoryId?: string;
	passages: ClipboardPassage[];
	pasteCount: number;
}

function isEditableElement(element: Element | null): boolean {
	if (!element) {
		return false;
	}

	if (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement
	) {
		return true;
	}

	const htmlElement = element as HTMLElement;

	if (htmlElement.isContentEditable) {
		return true;
	}

	const role = htmlElement.getAttribute('role');

	return role === 'textbox' || role === 'combobox';
}

export function usePassageClipboard(story?: Story) {
	const {dispatch} = useUndoableStoriesContext();
	const clipboardRef = React.useRef<ClipboardData | null>(null);
	const twineElectron =
		typeof window !== 'undefined'
			? (window as TwineElectronWindow).twineElectron
			: undefined;
	const isElectron = Boolean(twineElectron);

	const copySelected = React.useCallback(
		(includeCut = false) => {
			if (!story) {
				return false;
			}

			const selected = story.passages.filter(passage => passage.selected);

			if (selected.length === 0) {
				return false;
			}

			clipboardRef.current = {
				passages: selected.map(passage => ({
					height: passage.height,
					left: passage.left,
					name: passage.name,
					tags: [...passage.tags],
					text: passage.text,
					top: passage.top,
					width: passage.width
				})),
				pasteCount: 0
			};

			if (includeCut) {
				dispatch(
					deletePassages(story, selected),
					selected.length === 1
						? 'undoChange.deletePassage'
						: 'undoChange.deletePassages'
				);
			}

			return true;
		},
		[dispatch, story]
	);

	const pasteFromClipboard = React.useCallback(() => {
		if (!story || !clipboardRef.current || clipboardRef.current.passages.length === 0) {
			return false;
		}

		const clipboard = clipboardRef.current;

		if (clipboard.lastPasteStoryId !== story.id) {
			clipboard.pasteCount = 0;
		}

		const offset = CLIPBOARD_OFFSET * clipboard.pasteCount;

		clipboard.pasteCount += 1;
		clipboard.lastPasteStoryId = story.id;

		const existingNames = [...story.passages.map(passage => passage.name)];
		const newPassages = clipboard.passages.map(passage => {
			let name = passage.name;

			if (existingNames.includes(name)) {
				name = unusedName(name, existingNames);
			}

			existingNames.push(name);

			return {
				height: passage.height,
				id: uuid(),
				left: passage.left + offset,
				name,
				selected: true,
				tags: [...passage.tags],
				text: passage.text,
				top: passage.top + offset,
				width: passage.width
			};
		});

		dispatch(
			{
				props: newPassages,
				storyId: story.id,
				type: 'createPassages'
			},
			'undoChange.newPassage'
		);

		return true;
	}, [dispatch, story]);

	const copyAction = React.useCallback(() => {
		if (isEditableElement(document.activeElement)) {
			return false;
		}

		return copySelected();
	}, [copySelected]);

	const cutAction = React.useCallback(() => {
		if (isEditableElement(document.activeElement)) {
			return false;
		}

		return copySelected(true);
	}, [copySelected]);

	const pasteAction = React.useCallback(() => {
		if (isEditableElement(document.activeElement)) {
			return false;
		}

		return pasteFromClipboard();
	}, [pasteFromClipboard]);

	const handleCopyHotkey = React.useCallback(
		(event: KeyboardEvent) => {
			if (copyAction()) {
				event.preventDefault();
			}
		},
		[copyAction]
	);

	const handleCutHotkey = React.useCallback(
		(event: KeyboardEvent) => {
			if (cutAction()) {
				event.preventDefault();
			}
		},
		[cutAction]
	);

	const handlePasteHotkey = React.useCallback(
		(event: KeyboardEvent) => {
			if (pasteAction()) {
				event.preventDefault();
			}
		},
		[pasteAction]
	);

	useHotkeys(
		'meta+c,ctrl+c',
		handleCopyHotkey,
		{enabled: Boolean(story), keyup: false},
		[handleCopyHotkey, story]
	);
	useHotkeys(
		'meta+x,ctrl+x',
		handleCutHotkey,
		{enabled: Boolean(story), keyup: false},
		[handleCutHotkey, story]
	);
	useHotkeys(
		'meta+v,ctrl+v,shift+insert',
		handlePasteHotkey,
		{enabled: Boolean(story), keyup: false},
		[handlePasteHotkey, story]
	);

	React.useEffect(() => {
		if (!story) {
			return;
		}

		function interceptCopy(event: Event) {
			if (copyAction()) {
				event.preventDefault();
			}
		}

		function interceptCut(event: Event) {
			if (cutAction()) {
				event.preventDefault();
			}
		}

		function interceptPaste(event: Event) {
			if (pasteAction()) {
				event.preventDefault();
			}
		}

		document.addEventListener('copy', interceptCopy, true);
		document.addEventListener('cut', interceptCut, true);
		document.addEventListener('paste', interceptPaste, true);

		return () => {
			document.removeEventListener('copy', interceptCopy, true);
			document.removeEventListener('cut', interceptCut, true);
			document.removeEventListener('paste', interceptPaste, true);
		};
	}, [copyAction, cutAction, pasteAction, story]);

	React.useEffect(() => {
		if (!isElectron || !twineElectron || !story) {
			return;
		}

		const disposers: Array<() => void> = [];

		if (twineElectron.onCopyPassagesShortcut) {
			disposers.push(
				twineElectron.onCopyPassagesShortcut(() => {
					copyAction();
				})
			);
		}

		if (twineElectron.onCutPassagesShortcut) {
			disposers.push(
				twineElectron.onCutPassagesShortcut(() => {
					cutAction();
				})
			);
		}

		if (twineElectron.onPastePassagesShortcut) {
			disposers.push(
				twineElectron.onPastePassagesShortcut(() => {
					pasteAction();
				})
			);
		}

		return () => {
			disposers.forEach(dispose => dispose?.());
		};
	}, [copyAction, cutAction, isElectron, pasteAction, story, twineElectron]);
}
