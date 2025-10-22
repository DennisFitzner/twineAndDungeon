/**
 * Utility functions for IFID-based cross-link management
 */

import {Passage, Story} from '../store/stories/stories.types';

/**
 * Find a story by its IFID
 */
export function findStoryByIfid(
	stories: Story[],
	ifid: string
): Story | undefined {
	return stories.find(story => story.ifid === ifid);
}

/**
 * Find a story by its name (fallback for legacy support)
 */
export function findStoryByName(
	stories: Story[],
	name: string
): Story | undefined {
	return stories.find(
		story => story.name === name || (story.partName && story.partName === name)
	);
}

/**
 * Find a passage by name within a story
 */
export function findPassageByName(
	story: Story,
	passageName: string
): Passage | undefined {
	return story.passages.find(passage => passage.name === passageName);
}

/**
 * Find a story that contains a specific passage name
 */
export function findStoryWithPassage(
	stories: Story[],
	passageName: string
): Story | undefined {
	return stories.find(story =>
		story.passages.some(passage => passage.name === passageName)
	);
}

/**
 * Validate that a cross-link target exists
 */
export function validateCrossLinkTarget(
	stories: Story[],
	targetStoryIdentifier: string,
	targetPassageName: string
): {story?: Story; passage?: Passage; isValid: boolean} {
	// First try to find by IFID
	let targetStory = findStoryByIfid(stories, targetStoryIdentifier);

	// If not found by IFID, try by name (legacy support)
	if (!targetStory) {
		targetStory = findStoryByName(stories, targetStoryIdentifier);
	}

	if (!targetStory) {
		return {isValid: false};
	}

	const targetPassage = findPassageByName(targetStory, targetPassageName);

	return {
		story: targetStory,
		passage: targetPassage,
		isValid: !!targetPassage
	};
}

/**
 * Extract IFID from a story identifier (handles both IFID and name)
 */
export function resolveStoryIdentifier(
	stories: Story[],
	identifier: string
): string | null {
	// If it looks like an IFID (contains hyphens and is uppercase), use as-is
	if (
		identifier.match(
			/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i
		)
	) {
		return identifier.toUpperCase();
	}

	// Otherwise, try to find the story by name and return its IFID
	const story = findStoryByName(stories, identifier);
	return story ? story.ifid : null;
}

/**
 * Generate cross-link tags using IFID-based identification
 */
export function generateCrossLinkTags(
	sourceStory: Story,
	sourcePassage: Passage,
	linkType: 'interlink' | 'backlink',
	targetStory?: Story, // For backlinks, this is the current story
	targetPassage?: Passage, // For backlinks, this is the current passage
	interlinkTargetStoryIfid?: string, // For interlinks, the target story IFID
	interlinkTargetStoryName?: string, // For interlinks, the target story name
	interlinkTargetPassageName?: string // For interlinks, the target passage name
): string[] {
	const tags: string[] = [linkType];

	if (linkType === 'backlink') {
		// Backlink tags: source is the other story, target is the current story
		tags.push(`source-story-ifid:${sourceStory.ifid}`);
		tags.push(`source-passage-name:${sourcePassage.name}`);
		tags.push(`source-story-name:${sourceStory.name}`);
		if (targetStory) {
			tags.push(`target-story-ifid:${targetStory.ifid}`);
			tags.push(`target-story-name:${targetStory.name}`);
		}
		if (targetPassage) {
			tags.push(`target-passage-name:${targetPassage.name}`);
		}
	} else if (linkType === 'interlink') {
		// Interlink tags: source is the current story, target is the other story
		tags.push(`source-story-ifid:${sourceStory.ifid}`);
		tags.push(`source-passage-name:${sourcePassage.name}`);
		tags.push(`source-story-name:${sourceStory.name}`);
		if (interlinkTargetStoryIfid) {
			tags.push(`target-story-ifid:${interlinkTargetStoryIfid}`);
		}
		if (interlinkTargetStoryName) {
			tags.push(`target-story-name:${interlinkTargetStoryName}`);
		}
		if (interlinkTargetPassageName) {
			tags.push(`target-passage-name:${interlinkTargetPassageName}`);
		}
	}

	return tags;
}
