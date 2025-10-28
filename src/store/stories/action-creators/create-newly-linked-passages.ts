import {Thunk} from 'react-hook-thunk-reducer';
import {
	CreatePassagesAction,
	Passage,
	StoriesState,
	Story
} from '../stories.types';
import {passageDefaults} from '../defaults';
import {rectsIntersect} from '../../../util/geometry';
import {parseLinks, parseCrossPartLinkTarget} from '../../../util/parse-links';

/**
 * Creates newly linked passages from a passage. You shouldn't need to call this
 * directly--it will be invoked automatically by updatePassage() if you change
 * the passage text.
 */
export function createNewlyLinkedPassages(
	story: Story,
	passage: Passage,
	newText: string,
	oldText: string
): Thunk<StoriesState, CreatePassagesAction> {
	if (!story.passages.some(p => p.id === passage.id)) {
		throw new Error('This passage does not belong to this story.');
	}

	return dispatch => {
		const oldLinks = parseLinks(oldText);
		const newLinks = parseLinks(newText);

		// Handle both local links and cross-part links
		const toCreate: Array<{
			name: string;
			isInterlink?: boolean;
			targetStory?: string;
			targetPassage?: string;
		}> = [];

		newLinks.forEach(linkText => {
			// Skip if it was already in old text
			if (oldLinks.includes(linkText)) return;

			// Skip if passage already exists locally
			if (story.passages.some(p => p.name === linkText)) return;

			// Check if this is a cross-part link (contains colon)
			const crossPartTarget = parseCrossPartLinkTarget(`[[${linkText}]]`);
			if (crossPartTarget && crossPartTarget.part) {
				// This is a cross-part link, create an interlink card
				toCreate.push({
					name: linkText,
					isInterlink: true,
					targetStory: crossPartTarget.part,
					targetPassage: crossPartTarget.passage
				});
			} else {
				// This is a local link, create a regular passage
				toCreate.push({name: linkText});
			}
		});

		if (toCreate.length === 0) {
			return;
		}

		const passageDefs = passageDefaults();
		const passageGap = 25;

		let top = passage.top + passage.height + passageGap;
		const newPassagesWidth =
			toCreate.length * passageDefs.width + (toCreate.length - 1) * passageGap;

		// Horizontally center the passages.

		let left = passage.left + (passage.width - newPassagesWidth) / 2;

		// Move them to avoid overlaps.

		const needsMoving = () =>
			story.passages.some(passage =>
				rectsIntersect(passage, {
					left,
					top,
					height: passageDefs.height,
					width: newPassagesWidth
				})
			);

		while (needsMoving()) {
			// Try rightward.

			left += passageDefs.width + passageGap;

			if (!needsMoving()) {
				break;
			}

			// Try leftward.

			left -= 2 * (passageDefs.width + passageGap);

			if (!needsMoving()) {
				break;
			}

			// Move downward and try again.

			left += passageDefs.width + passageGap;
			top += passageDefs.height + passageGap;
		}

		// Actually create them.

		dispatch({
			type: 'createPassages',
			storyId: story.id,
			props: toCreate.map(item => {
				const result = {
					left,
					name: item.name,
					top,
					// Add special tags for interlink cards
					tags: item.isInterlink
						? [
								'interlink',
								`target-story:${item.targetStory}`,
								`target-passage:${item.targetPassage}`
						  ]
						: []
				};

				left += passageDefs.width + passageGap;
				return result;
			})
		});
	};
}
