import orderBy from 'lodash/orderBy';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {MainContent} from '../../components/container/main-content';
import {SafariWarningCard} from '../../components/error';
import {
	AppDonationDialog,
	DialogsContextProvider,
	useDialogsContext
} from '../../dialogs';
import {usePrefsContext} from '../../store/prefs';
import {useDonationCheck} from '../../store/prefs/use-donation-check';
import {
	deselectAllStories,
	deselectStory,
	selectStory,
	useStoriesContext
} from '../../store/stories';
import {UndoableStoriesContextProvider} from '../../store/undoable-stories';
import {StoryListToolbar} from './toolbar/story-list-toolbar';
import {StoryCards} from './story-cards';
import {ClickAwayListener} from '../../components/click-away-listener';

export const InnerStoryListRoute: React.FC = () => {
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const {dispatch: storiesDispatch, stories} = useStoriesContext();
	const {prefs} = usePrefsContext();
	const {shouldShowDonationPrompt} = useDonationCheck();
	const {t} = useTranslation();

	const selectedStories = React.useMemo(
		() => stories.filter(story => story.selected),
		[stories]
	);

	const [selectedFolders, setSelectedFolders] = React.useState<Set<string>>(
		new Set()
	);

	const visibleStories = React.useMemo(() => {
		const filteredStories =
			prefs.storyListTagFilter.length > 0
				? stories.filter(story =>
						story.tags.some(tag => prefs.storyListTagFilter.includes(tag))
				  )
				: stories;

		// Group stories by folder, showing only unique folders
		const folderMap = new Map<
			string,
			{
				folderName: string;
				stories: (typeof filteredStories)[0][];
				lastUpdate: Date;
			}
		>();

		for (const story of filteredStories) {
			// For stories without storyFolderName, use the story name as the folder key
			// This ensures existing single-part stories are treated as their own folder
			const folderKey = story.storyFolderName || story.name;

			if (!folderMap.has(folderKey)) {
				folderMap.set(folderKey, {
					folderName: folderKey,
					stories: [story],
					lastUpdate: story.lastUpdate
				});
			} else {
				const folder = folderMap.get(folderKey)!;
				folder.stories.push(story);
				// Update lastUpdate to the most recent story in the folder
				if (story.lastUpdate > folder.lastUpdate) {
					folder.lastUpdate = story.lastUpdate;
				}
			}
		}

		// Convert folder map to array of folder objects
		const folders = Array.from(folderMap.values());

		switch (prefs.storyListSort) {
			case 'date':
				return orderBy(folders, ['lastUpdate'], ['desc']);
			case 'name':
				return orderBy(folders, 'folderName');
		}
	}, [prefs.storyListSort, prefs.storyListTagFilter, stories]);

	// Any stories no longer visible should be deselected.

	React.useEffect(() => {
		// Get all stories from visible folders
		const allVisibleStories = (visibleStories as any[]).flatMap(
			folder => folder.stories || [folder]
		);

		for (const story of selectedStories) {
			if (story.selected && !allVisibleStories.includes(story)) {
				storiesDispatch(deselectStory(story));
			}
		}
	}, [selectedStories, stories, storiesDispatch, visibleStories]);

	function handleSelectFolder(folderName: string) {
		setSelectedFolders(prev => {
			const newSet = new Set(prev);
			if (newSet.has(folderName)) {
				newSet.delete(folderName);
			} else {
				newSet.add(folderName);
			}
			return newSet;
		});
	}

	React.useEffect(() => {
		if (shouldShowDonationPrompt()) {
			dialogsDispatch({type: 'addDialog', component: AppDonationDialog});
		}
	}, [dialogsDispatch, shouldShowDonationPrompt]);

	return (
		<div className="story-list-route">
			<StoryListToolbar selectedStories={selectedStories} />
			<ClickAwayListener
				ignoreSelector=".story-card"
				onClickAway={() => storiesDispatch(deselectAllStories())}
			>
				<MainContent
					title={t(
						prefs.storyListTagFilter.length > 0
							? 'routes.storyList.taggedTitleCount'
							: 'routes.storyList.titleCount',
						{count: visibleStories.length}
					)}
				>
					<SafariWarningCard />
					<div className="stories">
						{stories.length === 0 ? (
							<p>{t('routes.storyList.noStories')}</p>
						) : (
							<StoryCards
								onSelectStory={story =>
									storiesDispatch(selectStory(story, true))
								}
								onSelectFolder={handleSelectFolder}
								stories={visibleStories}
								isFolderView={true}
								selectedFolders={selectedFolders}
							/>
						)}
					</div>
				</MainContent>
			</ClickAwayListener>
		</div>
	);
};

export const StoryListRoute: React.FC = () => (
	<UndoableStoriesContextProvider>
		<DialogsContextProvider>
			<InnerStoryListRoute />
		</DialogsContextProvider>
	</UndoableStoriesContextProvider>
);
