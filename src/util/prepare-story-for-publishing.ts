import {Passage, Story} from '../store/stories';
import {processLinksWithPrefix} from './twee';

const CROSS_LINK_TAGS = new Set(['interlink', 'backlink']);

function isCrossLinkCard(passage: Passage): boolean {
        return (
                passage.tags.some(tag => CROSS_LINK_TAGS.has(tag)) ||
                passage.name.startsWith('→ ') ||
                passage.name.startsWith('← ')
        );
}

function sanitiseTags(tags: string[]): string[] {
        return tags.filter(tag => {
                if (CROSS_LINK_TAGS.has(tag)) {
                        return false;
                }

                return (
                        !tag.startsWith('source-story-') &&
                        !tag.startsWith('source-passage-') &&
                        !tag.startsWith('target-story-') &&
                        !tag.startsWith('target-passage-')
                );
        });
}

function storyPartIdentifier(part: Story): string {
        const identifier = part.partName || part.name;
        return identifier.trim();
}

/**
 * Combines all story parts that belong to the same folder into a single story that can
 * be published or played. Passages are renamed using the story part identifier as a
 * prefix, local links are updated to reference the prefixed names and editing-only
 * passages (interlink/backlink cards) are removed entirely.
 */
export function prepareStoryForPublishing(story: Story, allStories: Story[]): Story {
        const folderName = (story.storyFolderName || story.name).trim();
        const relatedStories = allStories.filter(candidate => {
                const candidateFolder = (candidate.storyFolderName || candidate.name).trim();
                return candidateFolder === folderName;
        });

        if (relatedStories.length <= 1) {
                return story;
        }

        const hasAdditionalPart = relatedStories.some(candidate => {
                if (candidate.id === story.id) {
                        return false;
                }

                if (candidate.partName && candidate.partName.trim() !== '') {
                        return true;
                }

                return (candidate.name || '').trim() !== folderName;
        });

        if (!hasAdditionalPart) {
                return story;
        }

        const combinedPassages: Passage[] = [];
        const idMap = new Map<string, string>();

        relatedStories.forEach(part => {
                const prefix = storyPartIdentifier(part);

                part.passages.forEach(passage => {
                        if (isCrossLinkCard(passage)) {
                                return;
                        }

                        const newId = `${part.id}:${passage.id}`;
                        idMap.set(passage.id, newId);

                        combinedPassages.push({
                                ...passage,
                                id: newId,
                                story: story.id,
                                name: `${prefix}:${passage.name}`,
                                tags: sanitiseTags(passage.tags),
                                text: processLinksWithPrefix(passage.text, prefix)
                        });
                });
        });

        const combinedTags = Array.from(
                new Set(relatedStories.flatMap(part => part.tags))
        );

        const combinedTagColors = relatedStories.reduce<Story['tagColors']>((result, part) => ({
                ...result,
                ...part.tagColors
        }), {});

        const combinedScript = relatedStories
                .map(part => part.script.trim())
                .filter(Boolean)
                .join('\n\n');

        const combinedStylesheet = relatedStories
                .map(part => part.stylesheet.trim())
                .filter(Boolean)
                .join('\n\n');

        const startPassage = idMap.get(story.startPassage) ?? story.startPassage;

        return {
                ...story,
                name: folderName,
                passages: combinedPassages,
                startPassage,
                script: combinedScript,
                stylesheet: combinedStylesheet,
                tags: combinedTags,
                tagColors: combinedTagColors
        };
}
