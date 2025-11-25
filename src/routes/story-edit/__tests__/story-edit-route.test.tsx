import {act, render, screen, within} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {axe} from 'jest-axe';
import * as React from 'react';
import {Helmet} from 'react-helmet';
import {Route, Router} from 'react-router-dom';
import {Story, useStoriesContext} from '../../../store/stories';
import {
        fakeLoadedStoryFormat,
        FakeStateProvider,
        FakeStateProviderProps,
        fakeStory,
        StoryInspector
} from '../../../test-util';
import {InnerStoryEditRoute} from '../story-edit-route';
import {useZoomShortcuts} from '../use-zoom-shortcuts';
import {emitNavigateTo} from '../../../store/navigation-events';
import {addTab, getActiveTab, getOpenTabs, setActiveTab} from '../../../util/tab-state-manager';
import {fakePassage} from '../../../test-util/fakes';

jest.mock('../toolbar/story-edit-toolbar');
jest.mock('../use-zoom-shortcuts');
jest.mock('../../../components/passage/passage-map/passage-map');
jest.mock('../../../util/tab-state-manager', () => {
        const actual = jest.requireActual('../../../util/tab-state-manager');

        return {
                ...actual,
                addTab: jest.fn(),
                getActiveTab: jest.fn(() => undefined),
                getOpenTabs: jest.fn(() => []),
                removeTab: jest.fn(),
                setActiveTab: jest.fn(),
                setOpenTabs: jest.fn()
        };
});

const TestStoryEditRoute: React.FC = () => {
        const {stories} = useStoriesContext();
        const historyRef = React.useRef<ReturnType<typeof createMemoryHistory>>();

        if (!historyRef.current && stories[0]) {
                historyRef.current = createMemoryHistory({
                        initialEntries: [`/stories/${stories[0].id}`]
                });
        }

        if (!historyRef.current || stories.length === 0) {
                return null;
        }

        return (
                <Router history={historyRef.current}>
                        <Route path="/stories/:storyId">
                                <InnerStoryEditRoute />
                                {stories.map(story => (
                                        <StoryInspector key={story.id} id={story.id} />
                                ))}
                        </Route>
                </Router>
        );
};

describe('<StoryEditRoute>', () => {
        const useZoomShortcutsMock = useZoomShortcuts as jest.Mock;
        const getOpenTabsMock = getOpenTabs as jest.Mock;
        const getActiveTabMock = getActiveTab as jest.Mock;

        async function renderComponent(
                story: Story,
                contexts?: FakeStateProviderProps & {storiesOverride?: Story[]}
        ) {
                const format = fakeLoadedStoryFormat();

                format.name = story.storyFormat;
                format.version = story.storyFormatVersion;

                jest.useFakeTimers();

                const result = render(
                        <FakeStateProvider
                                {...contexts}
                                stories={contexts?.storiesOverride ?? [story]}
                                storyFormats={[format]}
                        >
                                <TestStoryEditRoute />
                        </FakeStateProvider>
                );

		act(() => {
			jest.runAllTimers();
		});

		jest.useRealTimers();

		// Need this because of <PromptButton>
		await act(async () => Promise.resolve());
                return result;
        }

        beforeEach(() => {
                jest.clearAllMocks();
                jest.useRealTimers();
                getOpenTabsMock.mockReturnValue([]);
                getActiveTabMock.mockReturnValue(undefined);
        });

        beforeAll(() => {
                Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
                        value: jest.fn(),
                        writable: true
                });
        });

	it('sets the document title to the story name', async () => {
		const story = fakeStory();

		await renderComponent(story);
		expect(Helmet.peek().title).toBe(story.name);
	});

	it('displays the toolbar', async () => {
		await renderComponent(fakeStory());
		expect(screen.getByTestId('mock-story-edit-toolbar')).toBeInTheDocument();
	});

	it('displays a passage map', async () => {
		await renderComponent(fakeStory());
		expect(screen.getByTestId('mock-passage-map')).toBeInTheDocument();
	});

        it('sets up zoom keyboard shortcuts', async () => {
                await renderComponent(fakeStory());
                expect(useZoomShortcutsMock).toBeCalled();
        });

        it('opens a closed dialog part and selects its passage when navigating by IFID', async () => {
                const folderName = 'Shared Story';
                const mainStory = fakeStory();
                const dialogStory = fakeStory();
                const mainPassage = fakePassage({
                        id: 'main-passage-id',
                        name: 'Main Passage',
                        selected: false,
                        story: 'main-story'
                });
                const dialogPassage = fakePassage({
                        id: 'dialog-passage-id',
                        name: 'Dialog Summary',
                        selected: false,
                        story: 'dialog-story'
                });

                mainStory.id = 'main-story';
                mainStory.ifid = 'MAIN-IFID';
                mainStory.storyFolderName = folderName;
                mainStory.partName = folderName;
                mainStory.name = folderName;
                mainStory.passages = [mainPassage];
                mainStory.startPassage = mainPassage.id;

                dialogStory.id = 'dialog-story';
                dialogStory.ifid = 'DIALOG-IFID';
                dialogStory.storyFolderName = folderName;
                dialogStory.partName = 'Dialog Part';
                dialogStory.name = 'Dialog Part';
                dialogStory.passages = [dialogPassage];
                dialogStory.startPassage = dialogPassage.id;

                await renderComponent(mainStory, {storiesOverride: [mainStory, dialogStory]});

                expect(addTab).not.toHaveBeenCalledWith(folderName, dialogStory.ifid);
                jest.useFakeTimers();
                act(() => {
                        emitNavigateTo(dialogStory.ifid, dialogPassage.id, {openEditor: false});
                        jest.runAllTimers();
                });
                jest.useRealTimers();

                expect(addTab).toHaveBeenCalledWith(folderName, dialogStory.ifid);
                expect(setActiveTab).toHaveBeenCalledWith(folderName, dialogStory.ifid);

                const dialogInspector = screen.getByTestId(`story-inspector-${dialogStory.id}`);
                const dialogPassageNode = within(dialogInspector).getByTestId(
                        `passage-${dialogPassage.id}`
                );
                expect(dialogPassageNode).toHaveAttribute('data-selected', 'true');
        });

        it('is accessible', async () => {
                const {container} = await renderComponent(fakeStory());

                expect(await axe(container)).toHaveNoViolations();
	});
});
