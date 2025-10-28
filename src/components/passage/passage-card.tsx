import classNames from 'classnames';
import {deviceType} from 'detect-it';
import * as React from 'react';
import {DraggableCoreProps} from 'react-draggable';
import {useTranslation} from 'react-i18next';
import {CardContent} from '../container/card';
import {SelectableCard} from '../container/card/selectable-card';
import {Passage, TagColors, Story} from '../../store/stories';
import {CharacterIconSizePref, usePrefsContext} from '../../store/prefs';
import {TagStripe} from '../tag/tag-stripe';
import {passageIsEmpty} from '../../util/passage-is-empty';
import {DraggableCoreWrapper} from './draggable-core-wrapper';
import {emitNavigateTo} from '../../store/navigation-events';
import './passage-card.css';

interface PassageDimensions {
	height: number;
	width: number;
}

const minDimension = 50;
const gridSize = 25;

export interface PassageCardProps {
	onEdit: (passage: Passage) => void;
	onDeselect: (passage: Passage) => void;
	onDragStart?: DraggableCoreProps['onStart'];
	onDrag?: DraggableCoreProps['onDrag'];
	onDragStop?: DraggableCoreProps['onStop'];
	onSelect: (passage: Passage, exclusive: boolean) => void;
	onResize?: (passage: Passage, size: PassageDimensions) => void;
	passage: Passage;
	story: Story;
	tagColors: TagColors;
	visibleZoom: number;
}

// Needs to fill a large-sized passage card.
const excerptLength = 400;

export const PassageCard: React.FC<PassageCardProps> = React.memo(props => {
	const {
		onDeselect,
		onDrag,
		onDragStart,
		onDragStop,
		onEdit,
		onSelect,
		onResize,
		passage,
		story,
		tagColors,
		visibleZoom
	} = props;
	const {t} = useTranslation();
	const {prefs} = usePrefsContext();
	const container = React.useRef<HTMLDivElement>(null);
	const [resizePreview, setResizePreview] =
		React.useState<PassageDimensions | null>(null);
	const [resizing, setResizing] = React.useState(false);
	const resizeState = React.useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		startSize: PassageDimensions;
	} | null>(null);
	const latestSize = React.useRef<PassageDimensions | null>(null);
	const canResize = React.useMemo(
		() => Boolean(onResize) && passage.story === story.id,
		[onResize, passage.story, story.id]
	);
	const finishResize = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
			if (!resizeState.current || resizeState.current.pointerId !== event.pointerId) {
				return;
			}

			event.stopPropagation();
			event.preventDefault();
			try {
				event.currentTarget.releasePointerCapture(event.pointerId);
			} catch (error) {
				// Ignore if pointer was not captured.
			}

			document.body.classList.remove('resizing-passages');
			setResizing(false);

			const finalSize = latestSize.current;
			const startSize = resizeState.current.startSize;

			if (
				commit &&
				onResize &&
				finalSize &&
				(Math.abs(finalSize.width - startSize.width) >= 1 ||
					Math.abs(finalSize.height - startSize.height) >= 1)
			) {
				onResize(passage, finalSize);
			}

			if (!commit || !finalSize) {
				setResizePreview(null);
			}

			latestSize.current = null;
			resizeState.current = null;
		},
		[onResize, passage]
	);
	const handleResizePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!canResize) {
				return;
			}

			event.stopPropagation();
			event.preventDefault();

			const initialSize: PassageDimensions = {
				height: passage.height,
				width: passage.width
			};

			resizeState.current = {
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				startSize: initialSize
			};
			latestSize.current = initialSize;
			setResizePreview(initialSize);
			setResizing(true);
			document.body.classList.add('resizing-passages');

			try {
				event.currentTarget.setPointerCapture(event.pointerId);
			} catch (error) {
				// Ignore if pointer capture is not supported.
			}
		},
		[canResize, passage.height, passage.width]
	);
	const handleResizePointerMove = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!resizeState.current || resizeState.current.pointerId !== event.pointerId) {
				return;
			}

			event.stopPropagation();
			event.preventDefault();

			const scale = visibleZoom || 1;
			const deltaX =
				(event.clientX - resizeState.current.startX) / scale;
			const deltaY =
				(event.clientY - resizeState.current.startY) / scale;

			const nextWidth = snapDimension(
				resizeState.current.startSize.width + deltaX,
				story.snapToGrid
			);
			const nextHeight = snapDimension(
				resizeState.current.startSize.height + deltaY,
				story.snapToGrid
			);

			const previous = latestSize.current;
			if (
				previous &&
				previous.width === nextWidth &&
				previous.height === nextHeight
			) {
				return;
			}

			const newSize: PassageDimensions = {
				height: nextHeight,
				width: nextWidth
			};

			latestSize.current = newSize;
			setResizePreview(newSize);
		},
		[story.snapToGrid, visibleZoom]
	);
	const handleResizePointerUp = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) =>
			finishResize(event, true),
		[finishResize]
	);
	const handleResizePointerCancel = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) =>
			finishResize(event, false),
		[finishResize]
	);
	React.useEffect(() => {
		if (resizing || !resizePreview) {
			return;
		}

		if (
			Math.abs(resizePreview.width - passage.width) < 1 &&
			Math.abs(resizePreview.height - passage.height) < 1
		) {
			setResizePreview(null);
		}
	}, [passage.height, passage.width, resizePreview, resizing]);

	React.useEffect(() => {
		return () => {
			document.body.classList.remove('resizing-passages');
		};
	}, []);

	// Detect if this is an interlink card (cross-part link)
	const isInterlink = React.useMemo(() => {
		return passage.tags.includes('interlink');
	}, [passage.tags]);

	// Detect if this is a back-reference passage
	const isBackReference = React.useMemo(() => {
		return passage.name.startsWith('← ');
	}, [passage.name]);

	// Extract story part name for display
	const storyPartName = React.useMemo(() => {
		if (isInterlink) {
			// For interlink cards, extract from tags
			const targetStoryTag = passage.tags.find(tag =>
				tag.startsWith('target-story-name:')
			);
			return targetStoryTag ? targetStoryTag.replace('target-story-name:', '') : '';
		} else if (isBackReference) {
			// For backlink cards, extract from the back-reference text
			const backRefMatch = passage.text.match(/Back-reference from (.+):/);
			return backRefMatch ? backRefMatch[1] : '';
		}
		return '';
	}, [isInterlink, isBackReference, passage.tags, passage.text]);

	const className = React.useMemo(
		() =>
			classNames('passage-card', {
				empty: passageIsEmpty(passage),
				selected: passage.selected,
				interlink: isInterlink,
				'back-reference': isBackReference,
				resizing
			}),
		[passage, isInterlink, isBackReference, resizing]
	);
	const excerpt = React.useMemo(() => {
		if (passage.text.length > 0) {
			return passage.text.substring(0, excerptLength);
		}

		return (
			<span className="placeholder">
				{t(
					deviceType === 'touchOnly'
						? 'components.passageCard.placeholderTouch'
						: 'components.passageCard.placeholderClick'
				)}
			</span>
		);
	}, [passage.text, t]);
	// Get character colors for border styling
	const characterBorderStyle = React.useMemo(() => {
		if (!story.characters || story.characters.length === 0) {
			return {};
		}

		// Find character tag
		const characterTag = passage.tags.find(tag =>
			tag.startsWith('characters:')
		);
		if (!characterTag) {
			return {};
		}

		// Parse character IDs
		const characterIds = characterTag
			.replace('characters:', '')
			.split(',')
			.filter(id => id);

		// Get character colors
		const characterColors = characterIds
			.map(id => story.characters?.find(char => char.id === id)?.color)
			.filter(color => color);

		if (characterColors.length === 0) {
			return {};
		}

		// Create border style based on number of characters
		if (characterColors.length === 1) {
			return {
				border: `3px solid ${characterColors[0]}`
			};
		} else {
			// Multiple characters - create gradient border
			const gradientStops = characterColors
				.map(
					(color, index) =>
						`${color} ${(index / (characterColors.length - 1)) * 100}%`
				)
				.join(', ');

			return {
				border: '3px solid',
				borderImage: `linear-gradient(45deg, ${gradientStops}) 1`
			};
		}
	}, [passage.tags, story.characters]);

	const appliedSize = React.useMemo(
		(): PassageDimensions => ({
			height: resizePreview?.height ?? passage.height,
			width: resizePreview?.width ?? passage.width
		}),
		[passage.height, passage.width, resizePreview]
	);
	const characterIconSizePref = React.useMemo<CharacterIconSizePref>(() => {
		const pref = prefs.characterIconSize as unknown;

		if (typeof pref === 'number') {
			return {amount: pref, unit: 'px'};
		}

		if (
			pref &&
			typeof (pref as CharacterIconSizePref).amount === 'number' &&
			((pref as CharacterIconSizePref).unit === 'px' ||
				(pref as CharacterIconSizePref).unit === '%')
		) {
			return pref as CharacterIconSizePref;
		}

		return {amount: 20, unit: 'px'};
	}, [prefs.characterIconSize]);
	const style = React.useMemo<React.CSSProperties>(
		() => ({
			height: appliedSize.height,
			left: passage.left,
			top: passage.top,
			width: appliedSize.width,
			...characterBorderStyle,
			'--character-icon-size': `${Math.max(
				0,
				characterIconSizePref.amount
			)}${characterIconSizePref.unit}`
		}),
		[
			appliedSize.height,
			appliedSize.width,
			passage.left,
			passage.top,
			characterBorderStyle,
			characterIconSizePref.amount,
			characterIconSizePref.unit
		]
	);
	const handleMouseDown = React.useCallback(
		(event: MouseEvent) => {
			// Shift- or control-clicking toggles our selected status, but doesn't
			// affect any other passage's selected status. If the shift or control key
			// was not held down and we were not already selected, we know the user
			// wants to select only this passage.

			if (event.shiftKey || event.ctrlKey) {
				if (passage.selected) {
					onDeselect(passage);
				} else {
					onSelect(passage, false);
				}
			} else if (!passage.selected) {
				onSelect(passage, true);
			}
		},
		[onDeselect, onSelect, passage]
	);
	const handleEdit = React.useCallback(() => {
		// For interlink passages, navigate to the correct tab instead of editing
		if (isInterlink) {
			// Extract target story and passage from tags
			const targetStoryTag = passage.tags.find(tag =>
				tag.startsWith('target-story-name:')
			);
			const targetPassageTag = passage.tags.find(tag =>
				tag.startsWith('target-passage-name:')
			);

			if (targetStoryTag && targetPassageTag) {
				const targetStory = targetStoryTag.replace('target-story-name:', '');
				const targetPassage = targetPassageTag.replace('target-passage-name:', '');

				emitNavigateTo(targetStory, undefined, {
					openEditor: true,
					centerAndHighlight: true,
					fallbackPassageName: targetPassage
				});
			}
		} else if (isBackReference) {
			// For back-reference passages, navigate to the original passage that created the link
			// Extract the source story and passage from the back-reference text
			const backRefMatch = passage.text.match(/Back-reference from (.+):(.+)/);
			if (backRefMatch) {
				const sourceStoryName = backRefMatch[1];
				const sourcePassageName = backRefMatch[2];

				// Navigate to the source story and passage
				emitNavigateTo(sourceStoryName, undefined, {
					openEditor: true,
					centerAndHighlight: true,
					fallbackPassageName: sourcePassageName
				});
			}
		} else {
			onEdit(passage);
		}
	}, [onEdit, passage, isInterlink, isBackReference]);
	const handleSelect = React.useCallback(
		(value: boolean, exclusive: boolean) => {
			onSelect(passage, exclusive);
		},
		[onSelect, passage]
	);

	// For interlink and back-reference passages, we need to handle dragging differently
	// They should be draggable but won't affect the story data
	const dragHandlers =
		isInterlink || isBackReference
			? {
					onStart: onDragStart,
					onDrag: onDrag,
					onStop: onDragStop
			  }
			: {
					onStart: onDragStart,
					onDrag: onDrag,
					onStop: onDragStop
			  };

	return (
		<DraggableCoreWrapper
			nodeRef={container}
			onMouseDown={handleMouseDown}
			onStart={dragHandlers.onStart}
			onDrag={dragHandlers.onDrag}
			onStop={dragHandlers.onStop}
		>
			<div
				className={className}
				ref={container}
				style={style}
				data-passage-tags={passage.tags.join(' ')}
			>
				<SelectableCard
					highlighted={passage.highlighted}
					label={passage.name}
					onDoubleClick={handleEdit}
					onSelect={handleSelect}
					selected={passage.selected}
				>
					<TagStripe tagColors={tagColors} tags={passage.tags} />
					{/* Character thumbnails */}
					{(() => {
						const characterTag = passage.tags.find(tag =>
							tag.startsWith('characters:')
						);
						if (!characterTag || !story.characters) return null;

						const characterIds = characterTag
							.replace('characters:', '')
							.split(',')
							.filter(id => id);

						const assignedCharacters = characterIds
							.map(id => story.characters?.find(char => char.id === id))
							.filter(
								(char): char is NonNullable<typeof char> =>
									char != null && char.image != null
							);

						if (assignedCharacters.length === 0) return null;

						return (
							<div className="passage-character-thumbnails">
								{assignedCharacters.map(character => (
									<img
										key={character.id}
										alt={character.name}
										className="passage-character-thumbnail"
										src={character.image}
										title={character.name}
									/>
								))}
							</div>
						);
					})()}
					{/* Show story part name for interlink and backlink cards */}
					{(isInterlink || isBackReference) && storyPartName && (
						<div className="story-part-name">{storyPartName}</div>
					)}
					<h2>{passage.name}</h2>
					<CardContent>{excerpt}</CardContent>
				</SelectableCard>
				{canResize && (
					<div
						aria-hidden="true"
						className="passage-card__resize-handle"
						onPointerCancel={handleResizePointerCancel}
						onPointerDown={handleResizePointerDown}
						onPointerMove={handleResizePointerMove}
						onPointerUp={handleResizePointerUp}
					/>
				)}
			</div>
		</DraggableCoreWrapper>
	);
});

PassageCard.displayName = 'PassageCard';

function snapDimension(value: number, snapToGrid: boolean) {
	const constrained = Math.max(minDimension, value);

	if (!snapToGrid) {
		return constrained;
	}

	return Math.max(minDimension, Math.round(constrained / gridSize) * gridSize);
}
