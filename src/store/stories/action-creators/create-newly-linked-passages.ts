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
import {storyPartsLogger} from '../../../util/story-parts-logger';
import {validateCrossLinkTarget, generateCrossLinkTags} from '../../../util/ifid-cross-link-utils';

/**
 * Creates newly linked passages from a passage. You shouldn't need to call this
 * directly--it will be invoked automatically by updatePassage() if you change
 * the passage text.
 */
export function createNewlyLinkedPassages(
	story: Story,
	passage: Passage,
	newText: string,
	oldText: string,
	allStories?: Story[]
): Thunk<StoriesState, CreatePassagesAction> {
	if (!story.passages.some(p => p.id === passage.id)) {
		throw new Error('This passage does not belong to this story.');
	}

	return (dispatch, getState) => {
		const oldLinks = parseLinks(oldText);
		const newLinks = parseLinks(newText);

		// Log link parsing
		storyPartsLogger.logStoryParts({
			storyId: story.id,
			storyName: story.name,
			partName: story.partName,
			operation: 'parse_links',
			details: {
				passageName: passage.name,
				oldLinksCount: oldLinks.length,
				newLinksCount: newLinks.length,
				oldLinks,
				newLinks
			}
		});

		// Handle both local links and cross-part links
		const toCreate: Array<{
			name: string;
			isInterlink?: boolean;
			targetStory?: string;
			targetPassage?: string;
			targetStoryIfid?: string;
		}> = [];

		let interlinkCount = 0;
		let localLinkCount = 0;

		// Get all stories for cross-link validation
		const stories = allStories || getState();

		newLinks.forEach(linkText => {
			// Skip if it was already in old text
			if (oldLinks.includes(linkText)) return;

			// Skip if passage already exists locally
			if (story.passages.some(p => p.name === linkText)) return;

			// Check if this is a cross-part link (contains colon)
			const crossPartTarget = parseCrossPartLinkTarget(`[[${linkText}]]`);
			if (crossPartTarget && crossPartTarget.part) {
				// Validate the cross-link target using IFID-based lookup
				const validation = validateCrossLinkTarget(
					stories, // Pass all stories for validation
					crossPartTarget.part,
					crossPartTarget.passage
				);

				if (validation.isValid && validation.story && validation.passage) {
					// This is a valid cross-part link, create an interlink card
					// Use a special name format to avoid conflicts with actual passages
					toCreate.push({
						name: `→ ${crossPartTarget.part}:${crossPartTarget.passage}`,
						isInterlink: true,
						targetStory: crossPartTarget.part,
						targetPassage: crossPartTarget.passage,
						targetStoryIfid: validation.story.ifid
					});
					interlinkCount++;

					// Log interlink detection
					storyPartsLogger.logCrossLink({
						sourceStoryId: story.id,
						sourceStoryName: story.name,
						targetStoryName: crossPartTarget.part,
						linkType: 'interlink',
						passageName: passage.name,
						operation: 'detect_interlink',
						details: {
							linkText,
							targetPassage: crossPartTarget.passage,
							sourcePassage: passage.name,
							targetStoryIfid: validation.story.ifid,
							validationMethod: 'ifid-based'
						}
					});
				} else {
					// Log invalid cross-link
					storyPartsLogger.logCrossLink({
						sourceStoryId: story.id,
						sourceStoryName: story.name,
						linkType: 'interlink',
						passageName: passage.name,
						operation: 'invalid_cross_link',
						details: {
							linkText,
							targetStory: crossPartTarget.part,
							targetPassage: crossPartTarget.passage,
							reason: 'target_not_found'
						}
					});
				}
			} else {
				// This is a local link, create a regular passage
				toCreate.push({name: linkText});
				localLinkCount++;
			}
		});

		// Log link creation summary
		storyPartsLogger.logStoryParts({
			storyId: story.id,
			storyName: story.name,
			partName: story.partName,
			operation: 'create_links_summary',
			details: {
				passageName: passage.name,
				totalToCreate: toCreate.length,
				interlinkCount,
				localLinkCount,
				interlinkNames: toCreate
					.filter(item => item.isInterlink)
					.map(item => item.name),
				localLinkNames: toCreate
					.filter(item => !item.isInterlink)
					.map(item => item.name)
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

		// Log final passage creation
		storyPartsLogger.logStoryParts({
			storyId: story.id,
			storyName: story.name,
			partName: story.partName,
			operation: 'create_passages',
			details: {
				passageName: passage.name,
				passageCount: toCreate.length,
				position: {left, top},
				passageNames: toCreate.map(item => item.name),
				interlinkCards: toCreate
					.filter(item => item.isInterlink)
					.map(item => ({
						name: item.name,
						targetStory: item.targetStory,
						targetPassage: item.targetPassage
					}))
			}
		});

		dispatch({
			type: 'createPassages',
			storyId: story.id,
			props: toCreate.map(item => {
				const result = {
					left,
					name: item.name,
					top,
					// Add special tags for interlink cards using IFID-based identification
					tags: item.isInterlink
						? generateCrossLinkTags(
								story, // Source story is the current story
								passage, // Source passage is the current passage
								'interlink',
								undefined, // Target story is not the current story for interlinks
								undefined, // Target passage is not in the current story for interlinks
								item.targetStoryIfid, // Pass target IFID
								item.targetStory, // Pass target story name
								item.targetPassage // Pass target passage name
						  )
						: [],
					// Add explicit empty text for interlink cards to prevent them from being parsed as links
					text: item.isInterlink ? '' : undefined
				};

				// Log individual passage creation
				if (item.isInterlink) {
					storyPartsLogger.logCrossLink({
						sourceStoryId: story.id,
						sourceStoryName: story.name,
						targetStoryName: item.targetStory,
						linkType: 'interlink',
						passageName: item.name,
						operation: 'create_interlink_card',
						details: {
							targetPassage: item.targetPassage,
							position: {left, top},
							sourcePassage: passage.name,
							targetStoryIfid: item.targetStoryIfid,
							validationMethod: 'ifid-based'
						}
					});
				}

				left += passageDefs.width + passageGap;
				return result;
			})
		});
	};
}
