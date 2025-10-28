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

	const visibleStories = React.useMemo(() => {
		const filteredStories =
			prefs.storyListTagFilter.length > 0
				? stories.filter(story =>
						story.tags.some(tag => prefs.storyListTagFilter.includes(tag))
				  )
				: stories;

		// Group stories by folder, showing only one representative per folder
		const groupedStories = new Map<string, (typeof filteredStories)[0]>();

		for (const story of filteredStories) {
			// For stories without storyFolderName, use the story name as the folder key
			// This ensures existing single-part stories are treated as their own folder
			const folderKey = story.storyFolderName || story.name;

			// Debug logging
			console.log(
				'Story:',
				story.name,
				'Folder:',
				story.storyFolderName,
				'Part:',
				story.partName,
				'Key:',
				folderKey
			);

			if (!groupedStories.has(folderKey)) {
				groupedStories.set(folderKey, story);
			} else {
				// If multiple parts exist, keep the one with the most recent update
				const existing = groupedStories.get(folderKey)!;
				if (story.lastUpdate > existing.lastUpdate) {
					groupedStories.set(folderKey, story);
				}
			}
		}

		const uniqueStories = Array.from(groupedStories.values());

		switch (prefs.storyListSort) {
			case 'date':
				return orderBy(uniqueStories, ['lastUpdate'], ['desc']);
			case 'name':
				return orderBy(uniqueStories, 'name');
		}
	}, [prefs.storyListSort, prefs.storyListTagFilter, stories]);

	// Any stories no longer visible should be deselected.

	React.useEffect(() => {
		for (const story of selectedStories) {
			if (story.selected && !visibleStories.includes(story)) {
				storiesDispatch(deselectStory(story));
			}
		}
	}, [selectedStories, stories, storiesDispatch, visibleStories]);

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
								stories={visibleStories}
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
