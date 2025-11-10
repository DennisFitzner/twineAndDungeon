import {fireEvent, render, screen} from '@testing-library/react';
import {axe} from 'jest-axe';
import * as React from 'react';
import {
        FakeStateProvider,
        FakeStateProviderProps,
        fakeLoadedStoryFormat,
        fakeStory,
        StoryInspector
} from '../../../../../test-util';
import {i18n} from '../../../../../util/i18n';
import {
        CreatePassageButton,
        CreatePassageButtonProps,
        prepareCreatePassageAction
} from '../create-passage-button';
import type {TwineElectronWindow} from '../../../../../electron/shared/electron-shared.types';

describe('<CreatePassageButton>', () => {
	function renderComponent(
		props?: Partial<CreatePassageButtonProps>,
		contexts?: FakeStateProviderProps
	) {
		return render(
			<FakeStateProvider {...contexts}>
				<CreatePassageButton
					getCenter={() => ({top: 0, left: 0})}
					story={fakeStory()}
					{...props}
				/>
				<StoryInspector />
			</FakeStateProvider>
		);
	}

        it('creates a new passage at the center of the view when clicked', () => {
                const getCenter = () => ({top: 100, left: 200});
                const story = fakeStory(0);
                const format = fakeLoadedStoryFormat();
                story.storyFormat = format.name;
                story.storyFormatVersion = format.version;

                renderComponent({getCenter, story}, {stories: [story], storyFormats: [format]});
                fireEvent.click(screen.getByRole('button', {name: 'common.new'}));

		const passageDivs = screen
			.getByTestId('story-inspector-default')
			.querySelectorAll('div[data-testid^="passage"]');

		expect(passageDivs.length).toBe(1);
		expect((passageDivs[0] as HTMLElement).dataset.left).toBe('150');
		expect((passageDivs[0] as HTMLElement).dataset.top).toBe('50');
	});

        it('is accessible', async () => {
                const {container} = renderComponent();

                expect(await axe(container)).toHaveNoViolations();
        });

        it('creates a link from the selected passage to the new passage', () => {
                const story = fakeStory(1);
                const existingPassage = story.passages[0];
                const format = fakeLoadedStoryFormat();

                existingPassage.selected = true;
                existingPassage.text = 'Existing text';
                existingPassage.name = 'Existing';
                story.passages = [existingPassage];
                story.storyFormat = format.name;
                story.storyFormatVersion = format.version;

                renderComponent({story}, {stories: [story], storyFormats: [format]});
                fireEvent.click(screen.getByRole('button', {name: 'common.new'}));

                const passageDiv = screen.getByTestId(`passage-${existingPassage.id}`);
                const defaultName = i18n.t('store.passageDefaults.name');
                expect(passageDiv).toHaveTextContent(`Existing text [[${defaultName}]]`);
        });

        it('includes the requested character tag when preparing an action', () => {
                const story = fakeStory(0);
                story.characters = [
                        {id: 'alice', name: 'Alice'}
                ];

                const action = prepareCreatePassageAction(story, 10, 10, 'alice');

                expect(action.props.tags).toEqual(['characters:alice']);
        });

        describe('electron shortcuts', () => {
                let originalTwineElectron: TwineElectronWindow['twineElectron'];
                function mockElectron(onCreatePassageShortcut: jest.Mock) {
                        (window as TwineElectronWindow).twineElectron = {
                                onCreatePassageShortcut
                        } as unknown as TwineElectronWindow['twineElectron'];
                }

                beforeEach(() => {
                        originalTwineElectron = (window as TwineElectronWindow).twineElectron;
                });

                afterEach(() => {
                        (window as TwineElectronWindow).twineElectron = originalTwineElectron;
                });

                it('creates a new passage when the accelerator fires without a character index', () => {
                        const story = fakeStory(0);
                        const format = fakeLoadedStoryFormat();
                        story.storyFormat = format.name;
                        story.storyFormatVersion = format.version;

                        const onCreatePassageShortcut = jest.fn().mockReturnValue(jest.fn());
                        mockElectron(onCreatePassageShortcut);

                        renderComponent({story}, {stories: [story], storyFormats: [format]});

                        expect(onCreatePassageShortcut).toHaveBeenCalledTimes(1);

                        const handler = onCreatePassageShortcut.mock.calls[0][0];
                        handler();

                        const passageDivs = screen
                                .getByTestId('story-inspector-default')
                                .querySelectorAll('div[data-testid^="passage"]');

                        expect(passageDivs.length).toBe(1);
                });

                it('creates a character-tagged passage when the accelerator fires with an index', () => {
                        const story = fakeStory(0);
                        const format = fakeLoadedStoryFormat();

                        story.characters = [
                                {id: 'char-1', name: 'Character One'},
                                {id: 'char-2', name: 'Character Two'}
                        ];
                        story.partCharacterIds = story.characters.map(character => character.id);
                        story.storyFormat = format.name;
                        story.storyFormatVersion = format.version;

                        const onCreatePassageShortcut = jest.fn().mockReturnValue(jest.fn());
                        mockElectron(onCreatePassageShortcut);

                        renderComponent({story}, {stories: [story], storyFormats: [format]});

                        const handler = onCreatePassageShortcut.mock.calls[0][0];
                        handler(1);

                        const passageDivs = screen
                                .getByTestId('story-inspector-default')
                                .querySelectorAll('div[data-testid^="passage"]');

                        expect(passageDivs.length).toBe(1);
                        expect((passageDivs[0] as HTMLElement).dataset.tags).toBe(
                                'characters:char-2'
                        );
                });
        });
});
