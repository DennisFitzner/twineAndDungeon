import {fakePassage, fakeStory} from '../../../../test-util';
import {StoriesDispatch, StoriesState, Story} from '../../stories.types';
import {createNewlyLinkedPassages} from '../create-newly-linked-passages';

describe('createNewlyLinkedPassages action creator', () => {
	let dispatch: StoriesDispatch;
	let dispatchMock: jest.Mock;
	let getState: () => StoriesState;
	let story: Story;

	beforeEach(() => {
		dispatch = jest.fn();
		dispatchMock = dispatch as jest.Mock;
		story = fakeStory(1);
		getState = () => [story];
	});

        describe('The thunk it returns', () => {
		it('returns a createPassages action to create all passages', () => {
			story.passages[0].text = '';
			createNewlyLinkedPassages(
				story,
				story.passages[0],
				'[[test link]]',
				''
			)(dispatch, getState);
			expect(dispatchMock.mock.calls).toEqual([
				[
					{
						type: 'createPassages',
						props: [expect.objectContaining({name: 'test link'})],
						storyId: story.id
					}
				]
			]);
		});

		it('takes no action if no links were added', () => {
			createNewlyLinkedPassages(
				story,
				story.passages[0],
				story.passages[0].text + 'not a link',
				story.passages[0].text
			)(dispatch, getState);

			expect(dispatchMock.mock.calls).toEqual([]);
		});

		it('takes no action if the newly-linked passage already exists', () => {
			story = fakeStory(2);
			createNewlyLinkedPassages(
				story,
				story.passages[0],
				story.passages[0].text + `[[${story.passages[1].name}]]`,
				story.passages[0].text
			)(dispatch, getState);

			expect(dispatchMock.mock.calls).toEqual([]);
		});

		it('takes no action if the broken link was already present', () => {
			story.passages[0].text = '[[broken link]]';
			createNewlyLinkedPassages(
				story,
				story.passages[0],
				story.passages[0].text + 'not a link',
				story.passages[0].text
			)(dispatch, getState);

			expect(dispatchMock.mock.calls).toEqual([]);
		});

                it("throws an error if the passage doesn't belong to the story", () =>
                        expect(() =>
                                createNewlyLinkedPassages(
                                        story,
                                        {...story.passages[0], id: 'nonexistent'},
                                        story.passages[0].text,
                                        story.passages[0].text
                                )(dispatch, getState)
                        ).toThrow());

                it('creates backlinks inside dialog stories when linking to a dialog summary', () => {
                        const dialogStory = fakeStory(1);
                        dialogStory.partName = 'Dialog Part';
                        dialogStory.startPassage = dialogStory.passages[0].id;

                        const dialogSummary = fakePassage({
                                dialogStoryIfid: dialogStory.ifid,
                                isDialog: true,
                                name: 'Dialog Summary',
                                story: story.id,
                                text: ''
                        });
                        story.passages.push(dialogSummary);

                        const updatedText = `[[${dialogSummary.name}]]`;

                        getState = () => [story, dialogStory];

                        createNewlyLinkedPassages(
                                story,
                                story.passages[0],
                                updatedText,
                                ''
                        )(dispatch, getState);

                        expect(dispatchMock).toHaveBeenCalledWith({
                                type: 'createPassages',
                                storyId: dialogStory.id,
                                props: [
                                        expect.objectContaining({
                                                name: `\u2190 ${story.name}:${story.passages[0].name}`,
                                                tags: expect.arrayContaining([
                                                        'backlink',
                                                        `source-story-ifid:${story.ifid}`,
                                                        `target-story-ifid:${dialogStory.ifid}`
                                                ]),
                                                text: expect.stringContaining(story.passages[0].name)
                                        })
                                ]
                        });
                });

                it('mirrors outgoing links from dialog summaries as interlinks', () => {
                        const dialogStory = fakeStory(1);
                        dialogStory.partName = 'Dialog Part';
                        dialogStory.startPassage = dialogStory.passages[0].id;

                        const dialogSummary = fakePassage({
                                dialogStoryIfid: dialogStory.ifid,
                                isDialog: true,
                                name: 'Dialog Summary',
                                story: story.id,
                                text: ''
                        });
                        const targetPassage = fakePassage({
                                name: 'Target',
                                story: story.id,
                                text: ''
                        });
                        story.passages.push(dialogSummary, targetPassage);

                        getState = () => [story, dialogStory];

                        createNewlyLinkedPassages(
                                story,
                                dialogSummary,
                                '[[Target]]',
                                ''
                        )(dispatch, getState);

                        expect(dispatchMock).toHaveBeenCalledWith({
                                type: 'createPassages',
                                storyId: dialogStory.id,
                                props: [
                                        expect.objectContaining({
                                                name: `\u2192 ${story.name}:${targetPassage.name}`,
                                                tags: expect.arrayContaining([
                                                        'interlink',
                                                        `source-story-ifid:${dialogStory.ifid}`,
                                                        `target-passage-name:${targetPassage.name}`
                                                ]),
                                                text: ''
                                        })
                                ]
                        });
                });

                it('creates a new passage and interlink when dialog summaries link to new passages', () => {
                        const dialogStory = fakeStory(1);
                        dialogStory.partName = 'Dialog Part';
                        dialogStory.startPassage = dialogStory.passages[0].id;

                        story.name = 'MainStory';
                        story.partName = 'MainStory';

                        const dialogSummary = fakePassage({
                                dialogStoryIfid: dialogStory.ifid,
                                isDialog: true,
                                name: 'Dialog Summary',
                                story: story.id,
                                text: ''
                        });
                        story.passages.push(dialogSummary);

                        getState = () => [story, dialogStory];

                        createNewlyLinkedPassages(
                                story,
                                dialogSummary,
                                '[[New Note]]',
                                ''
                        )(dispatch, getState);

                        expect(dispatchMock.mock.calls[0][0]).toEqual(
                                expect.objectContaining({
                                        type: 'createPassages',
                                        storyId: story.id
                                })
                        );
                        expect(dispatchMock.mock.calls[0][0].props[0]).toEqual(
                                expect.objectContaining({name: 'New Note'})
                        );
                        expect(dispatchMock.mock.calls[0][0].props[0]).not.toHaveProperty('text');

                        expect(dispatchMock.mock.calls[1][0]).toEqual(
                                expect.objectContaining({
                                        type: 'createPassages',
                                        storyId: dialogStory.id
                                })
                        );
                        expect(dispatchMock.mock.calls[1][0].props[0]).toEqual(
                                expect.objectContaining({
                                        name: '→ MainStory:New Note',
                                        text: ''
                                })
                        );
                });
        });
});
