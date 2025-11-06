import {Passage, Story} from '../store/stories';
import {processLinksWithPrefix} from './twee';

export interface PreparedStory {
        story: Story;
        passageIdMap: Map<string, string>;
}

const CROSS_LINK_TAGS = new Set(['interlink', 'backlink']);

type TagMap = Map<string, string>;

function normaliseCrossLinkKey(value: string): string {
        const trimmed = value.trim();

        if (trimmed.startsWith('→')) {
                return `→ ${trimmed.slice(1).trim()}`;
        }

        if (trimmed.startsWith('←')) {
                return `← ${trimmed.slice(1).trim()}`;
        }

        return trimmed;
}

function isCrossLinkCard(passage: Passage): boolean {
        return (
                passage.tags.some(tag => CROSS_LINK_TAGS.has(tag)) ||
                passage.name.startsWith('→ ') ||
                passage.name.startsWith('← ')
        );
}

function createTagMap(tags: string[]): TagMap {
        return tags.reduce<TagMap>((map, tag) => {
                const [key, ...rest] = tag.split(':');

                if (key && rest.length > 0) {
                        map.set(key, rest.join(':').trim());
                }

                return map;
        }, new Map());
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

function findRelatedStory(
        stories: Story[],
        identifier?: string
): Story | undefined {
        if (!identifier) {
                return undefined;
        }

        const trimmed = identifier.trim();
        const lower = trimmed.toLowerCase();

        return (
                stories.find(candidate => candidate.ifid === trimmed) ||
                stories.find(candidate => storyPartIdentifier(candidate) === trimmed) ||
                stories.find(candidate => storyPartIdentifier(candidate).toLowerCase() === lower) ||
                stories.find(candidate => (candidate.partName || '').trim() === trimmed) ||
                stories.find(candidate => (candidate.partName || '').trim().toLowerCase() === lower) ||
                stories.find(candidate => candidate.name.trim() === trimmed) ||
                stories.find(candidate => candidate.name.trim().toLowerCase() === lower)
        );
}

function extractInterlinkTarget(
        passage: Passage,
        relatedStories: Story[],
        tags: TagMap
): string | undefined {
        const tagTargetIdentifier =
                tags.get('target-story-ifid') || tags.get('target-story-name');
        let targetStory = findRelatedStory(relatedStories, tagTargetIdentifier);
        let targetPassage = tags.get('target-passage-name')?.trim();

        const rawName = passage.name.replace(/^→ /, '').trim();
        if (rawName) {
                const colonIndex = rawName.indexOf(':');

                if (colonIndex !== -1) {
                        const potentialStoryIdentifier = rawName.slice(0, colonIndex).trim();
                        const potentialPassage = rawName.slice(colonIndex + 1).trim();

                        if (!targetStory) {
                                targetStory = findRelatedStory(
                                        relatedStories,
                                        potentialStoryIdentifier
                                );
                        }

                        if (!targetPassage) {
                                targetPassage = potentialPassage;
                        }
                } else if (!targetPassage) {
                        targetPassage = rawName;
                }
        }

        if (!targetStory) {
                const sourceIdentifier =
                        tags.get('source-story-ifid') || tags.get('source-story-name');
                targetStory = findRelatedStory(relatedStories, sourceIdentifier);
        }

        if (!targetStory || !targetPassage) {
                return undefined;
        }

        return `${storyPartIdentifier(targetStory)}:${targetPassage}`;
}

function extractBacklinkTarget(
        passage: Passage,
        relatedStories: Story[],
        tags: TagMap
): string | undefined {
        const sourceIdentifier =
                tags.get('source-story-ifid') || tags.get('source-story-name');
        let targetStory = findRelatedStory(relatedStories, sourceIdentifier);
        let targetPassage = tags.get('source-passage-name')?.trim();

        const rawName = passage.name.replace(/^← /, '').trim();
        if (rawName) {
                const colonIndex = rawName.indexOf(':');

                if (colonIndex !== -1) {
                        const potentialStoryIdentifier = rawName.slice(0, colonIndex).trim();
                        const potentialPassage = rawName.slice(colonIndex + 1).trim();

                        if (!targetStory) {
                                targetStory = findRelatedStory(
                                        relatedStories,
                                        potentialStoryIdentifier
                                );
                        }

                        if (!targetPassage) {
                                targetPassage = potentialPassage;
                        }
                } else if (!targetPassage) {
                        targetPassage = rawName;
                }
        }

        if (!targetStory) {
                const fallbackIdentifier =
                        tags.get('target-story-ifid') || tags.get('target-story-name');
                targetStory = findRelatedStory(relatedStories, fallbackIdentifier);
        }

        if (!targetStory || !targetPassage) {
                return undefined;
        }

        return `${storyPartIdentifier(targetStory)}:${targetPassage}`;
}

function buildCrossLinkRedirects(
        stories: Story[]
): Map<string, string> {
        const redirects = new Map<string, string>();

        stories.forEach(part => {
                part.passages.forEach(passage => {
                        if (!isCrossLinkCard(passage)) {
                                return;
                        }

                        const tags = createTagMap(passage.tags);

                        let target: string | undefined;
                        if (passage.tags.includes('interlink') || passage.name.startsWith('→ ')) {
                                target = extractInterlinkTarget(passage, stories, tags);
                        } else if (
                                passage.tags.includes('backlink') ||
                                passage.name.startsWith('← ')
                        ) {
                                target = extractBacklinkTarget(passage, stories, tags);
                        }

                        if (target) {
                                redirects.set(normaliseCrossLinkKey(passage.name), target);
                        }
                });
        });

        return redirects;
}

/**
 * Combines all story parts that belong to the same folder into a single story that can
 * be published or played. Passages are renamed using the story part identifier as a
 * prefix, local links are updated to reference the prefixed names and editing-only
 * passages (interlink/backlink cards) are removed entirely.
 */
export function prepareStoryForPublishing(
        story: Story,
        allStories: Story[]
): PreparedStory {
        const folderName = (story.storyFolderName || story.name).trim();
        const relatedStories = allStories.filter(candidate => {
                const candidateFolder = (candidate.storyFolderName || candidate.name).trim();
                return candidateFolder === folderName;
        });

        if (relatedStories.length <= 1) {
                const identityMap = new Map<string, string>();

                story.passages.forEach(passage => {
                        identityMap.set(passage.id, passage.id);
                });

                identityMap.set(story.startPassage, story.startPassage);

                return {
                        story,
                        passageIdMap: identityMap
                };
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
                const identityMap = new Map<string, string>();

                story.passages.forEach(passage => {
                        identityMap.set(passage.id, passage.id);
                });

                identityMap.set(story.startPassage, story.startPassage);

                return {
                        story,
                        passageIdMap: identityMap
                };
        }

        const combinedPassages: Passage[] = [];
        const idMap = new Map<string, string>();
        const redirects = buildCrossLinkRedirects(relatedStories);

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
                                text: processLinksWithPrefix(passage.text, prefix, redirects)
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

        const combinedStory: Story = {
                ...story,
                name: folderName,
                passages: combinedPassages,
                startPassage,
                script: combinedScript,
                stylesheet: combinedStylesheet,
                tags: combinedTags,
                tagColors: combinedTagColors
        };

        return {
                story: combinedStory,
                passageIdMap: idMap
        };
}
