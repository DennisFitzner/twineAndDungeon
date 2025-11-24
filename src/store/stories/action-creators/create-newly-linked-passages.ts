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

                const toCreate: Array<{
                        name: string;
			isInterlink?: boolean;
                        targetStory?: string;
                        targetPassage?: string;
                        targetStoryIfid?: string;
                }> = [];

                const dialogCreations = new Map<
                        string,
                        {
                                story: Story;
                                root: Passage;
                                items: Array<{
                                        name: string;
                                        text?: string;
                                        tags?: string[];
                                }>;
                        }
                >();

                const queueDialogCreation = (
                        targetStory: Story,
                        rootPassage: Passage,
                        item: {name: string; text?: string; tags?: string[]}
                ) => {
                        const existingPassage = targetStory.passages.find(
                                p => p.name === item.name
                        );

                        const existingQueue = dialogCreations.get(targetStory.id);
                        if (existingPassage || existingQueue?.items.some(p => p.name === item.name)) {
                                return;
                        }

                        if (!existingQueue) {
                                dialogCreations.set(targetStory.id, {
                                        story: targetStory,
                                        root: rootPassage,
                                        items: [item]
                                });
                                return;
                        }

                        dialogCreations.set(targetStory.id, {
                                ...existingQueue,
                                items: [...existingQueue.items, item]
                        });
                };

                // Get all stories for cross-link validation
                const stories = allStories || getState();

                const dialogStory =
                        passage.isDialog && passage.dialogStoryIfid
                                ? stories.find(s => s.ifid === passage.dialogStoryIfid)
                                : undefined;
                const dialogRootPassage = dialogStory
                        ? dialogStory.passages.find(p => p.id === dialogStory.startPassage) ||
                          dialogStory.passages[0]
                        : undefined;

                newLinks.forEach(linkText => {
                        // Skip if it was already in old text
                        if (oldLinks.includes(linkText)) return;

                        const crossPartTarget = parseCrossPartLinkTarget(`[[${linkText}]]`);
                        const existingLocal = story.passages.some(p => p.name === linkText);

                        if (!existingLocal) {
                                // Check if this is a cross-part link (contains colon)
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
                                        } else {
                                                // Skip when validation fails; nothing to create for unresolved cross-part link.
                                        }
                                } else {
                                        // This is a local link, create a regular passage
                                        toCreate.push({name: linkText});
                                }
                        }

                        // For links pointing at dialogs, create backlinks inside the dialog story
                        const targetDialog = stories
                                .map(s => ({
                                        story: s,
                                        dialog: s.passages.find(
                                                p => p.name === linkText && p.isDialog
                                        )
                                }))
                                .find(result => result.dialog);

                        if (targetDialog?.dialog?.dialogStoryIfid) {
                                const dialogTargetStory = stories.find(
                                        s => s.ifid === targetDialog.dialog?.dialogStoryIfid
                                );
                                const dialogTargetRoot = dialogTargetStory
                                        ?.passages.find(p => p.id === dialogTargetStory.startPassage) ||
                                        dialogTargetStory?.passages[0];

                                if (dialogTargetStory && dialogTargetRoot) {
                                        const backlinkName = `\u2190 ${(story.partName || story.name)}:${
                                                passage.name
                                        }`;

                                        queueDialogCreation(dialogTargetStory, dialogTargetRoot, {
                                                name: backlinkName,
                                                text: `Back-reference from ${
                                                        story.partName || story.name
                                                }:${passage.name}`,
                                                tags: generateCrossLinkTags(
                                                        story,
                                                        passage,
                                                        'backlink',
                                                        dialogTargetStory,
                                                        dialogTargetRoot
                                                )
                                        });
                                }
                        }

                        // For dialog summaries, mirror outgoing links as interlinks in the dialog story
                        if (dialogStory && dialogRootPassage) {
                                let targetStory: Story | undefined;
                                let targetPassageName = linkText;
                                let targetStoryIdentifier = crossPartTarget?.part;

                                if (crossPartTarget && crossPartTarget.part) {
                                        const validation = validateCrossLinkTarget(
                                                stories,
                                                crossPartTarget.part,
                                                crossPartTarget.passage
                                        );

                                        targetStory = validation.story;
                                        targetPassageName = validation.passage
                                                ? validation.passage.name
                                                : crossPartTarget.passage;
                                        targetStoryIdentifier = crossPartTarget.part;
                                } else {
                                        targetStory =
                                                story.passages.some(p => p.name === linkText)
                                                        ? story
                                                        : stories.find(s =>
                                                                  s.passages.some(p => p.name === linkText)
                                                          );
                                        targetStoryIdentifier =
                                                targetStory?.partName || targetStory?.name || targetStoryIdentifier;
                                }

                                const interlinkName = targetStoryIdentifier
                                        ? `\u2192 ${targetStoryIdentifier}:${targetPassageName}`
                                        : `\u2192 ${targetPassageName}`;

                                queueDialogCreation(dialogStory, dialogRootPassage, {
                                        name: interlinkName,
                                        tags: generateCrossLinkTags(
                                                dialogStory,
                                                dialogRootPassage,
                                                'interlink',
                                                undefined,
                                                undefined,
                                                targetStory?.ifid,
                                                targetStoryIdentifier,
                                                targetPassageName
                                        ),
                                        text: ''
                                });
                        }
                });

                if (toCreate.length === 0 && dialogCreations.size === 0) {
                        return;
                }

                const passageDefs = passageDefaults();
                const passageGap = 25;

                let top = passage.top + passage.height + passageGap;
                const newPassagesWidth =
                        toCreate.length > 0
                                ? toCreate.length * passageDefs.width +
                                  (toCreate.length - 1) * passageGap
                                : 0;

		// Horizontally center the passages.

		let left = passage.left + (passage.width - newPassagesWidth) / 2;

		// Move them to avoid overlaps.

                const needsMoving = () =>
                        toCreate.length > 0 &&
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

                if (toCreate.length > 0) {
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

                                        left += passageDefs.width + passageGap;
                                        return result;
                                })
                        });
                }

                dialogCreations.forEach(({items, root, story: dialogTargetStory}) => {
                        let dialogTop = root.top + root.height + passageGap;
                        const dialogWidth =
                                items.length * passageDefs.width + (items.length - 1) * passageGap;
                        let dialogLeft = root.left + (root.width - dialogWidth) / 2;

                        const dialogNeedsMoving = () =>
                                dialogTargetStory.passages.some(existing =>
                                        rectsIntersect(existing, {
                                                left: dialogLeft,
                                                top: dialogTop,
                                                height: passageDefs.height,
                                                width: dialogWidth
                                        })
                                );

                        while (dialogNeedsMoving()) {
                                dialogLeft += passageDefs.width + passageGap;

                                if (!dialogNeedsMoving()) {
                                        break;
                                }

                                dialogLeft -= 2 * (passageDefs.width + passageGap);

                                if (!dialogNeedsMoving()) {
                                        break;
                                }

                                dialogLeft += passageDefs.width + passageGap;
                                dialogTop += passageDefs.height + passageGap;
                        }

                        dispatch({
                                type: 'createPassages',
                                storyId: dialogTargetStory.id,
                                props: items.map(item => {
                                        const result = {
                                                left: dialogLeft,
                                                name: item.name,
                                                top: dialogTop,
                                                tags: item.tags ?? [],
                                                text: item.text ?? ''
                                        };

                                        dialogLeft += passageDefs.width + passageGap;
                                        return result;
                                })
                        });
                });
        };
}
