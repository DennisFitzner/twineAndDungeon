import classNames from 'classnames';
import {deviceType} from 'detect-it';
import * as React from 'react';
import {DraggableCoreProps} from 'react-draggable';
import {useTranslation} from 'react-i18next';
import {CardContent} from '../container/card';
import {SelectableCard} from '../container/card/selectable-card';
import {Passage, TagColors, Story} from '../../store/stories';
import {TagStripe} from '../tag/tag-stripe';
import {passageIsEmpty} from '../../util/passage-is-empty';
import {DraggableCoreWrapper} from './draggable-core-wrapper';
import {emitNavigateTo} from '../../store/navigation-events';
import './passage-card.css';

export interface PassageCardProps {
	onEdit: (passage: Passage) => void;
	onDeselect: (passage: Passage) => void;
	onDragStart?: DraggableCoreProps['onStart'];
	onDrag?: DraggableCoreProps['onDrag'];
	onDragStop?: DraggableCoreProps['onStop'];
	onSelect: (passage: Passage, exclusive: boolean) => void;
	passage: Passage;
	story: Story;
	tagColors: TagColors;
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
		passage,
		story,
		tagColors
	} = props;
	const {t} = useTranslation();
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
				'back-reference': isBackReference
			}),
		[passage, isInterlink, isBackReference]
	);
	const container = React.useRef<HTMLDivElement>(null);
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

	const style = React.useMemo(
		() => ({
			height: passage.height,
			left: passage.left,
			top: passage.top,
			width: passage.width,
			...characterBorderStyle
		}),
		[
			passage.height,
			passage.left,
			passage.top,
			passage.width,
			characterBorderStyle
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
			</div>
		</DraggableCoreWrapper>
	);
});

PassageCard.displayName = 'PassageCard';
