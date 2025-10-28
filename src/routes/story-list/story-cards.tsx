import * as React from 'react';
import {useHistory} from 'react-router-dom';
import {CSSTransition, TransitionGroup} from 'react-transition-group';
import {CardGroup} from '../../components/container/card-group';
import {FolderCard} from '../../components/story/folder-card';
import {StoryCard} from '../../components/story/story-card';
import {setPref, usePrefsContext} from '../../store/prefs';
import {Story, updateStory} from '../../store/stories';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import {Color} from '../../util/color';

/**
 * How wide a story card should render onscreen as.
 */
const cardWidth = '360px';

export interface FolderData {
	folderName: string;
	stories: Story[];
	lastUpdate: Date;
}

export interface StoryCardsProps {
	onSelectStory: (story: Story) => void;
	onSelectFolder: (folderName: string) => void;
	stories: Story[] | FolderData[];
	isFolderView?: boolean;
	selectedFolders?: Set<string>;
}

export const StoryCards: React.FC<StoryCardsProps> = props => {
	const {
		onSelectStory,
		onSelectFolder,
		stories,
		isFolderView = false,
		selectedFolders = new Set()
	} = props;
	const {dispatch: prefsDispatch, prefs} = usePrefsContext();
	const {dispatch: storiesDispatch} = useUndoableStoriesContext();
	const history = useHistory();

	function handleChangeTagColor(tagName: string, color: Color) {
		prefsDispatch(
			setPref('storyTagColors', {
				...prefs.storyTagColors,
				[tagName]: color
			})
		);
	}

	function handleRemoveTag(story: Story, tagName: string) {
		storiesDispatch(
			updateStory(stories as Story[], story, {
				tags: story.tags.filter(tag => tag !== tagName)
			})
		);
	}

	if (isFolderView) {
		const folderData = stories as FolderData[];
		return (
			<>
				<CardGroup columnWidth={cardWidth}>
					<TransitionGroup component={null}>
						{folderData.map(folder => (
							<CSSTransition
								classNames="pop"
								key={folder.folderName}
								timeout={200}
							>
								<FolderCard
									onEdit={() => {
										// For now, navigate to the first story in the folder
										const firstStory = folder.stories[0];
										if (firstStory) {
											history.push(`/stories/${firstStory.id}`);
										}
									}}
									onSelect={onSelectFolder}
									folderName={folder.folderName}
									stories={folder.stories}
									lastUpdate={folder.lastUpdate}
									selected={selectedFolders.has(folder.folderName)}
								/>
							</CSSTransition>
						))}
					</TransitionGroup>
				</CardGroup>
			</>
		);
	}

	const storyData = stories as Story[];
	return (
		<>
			<CardGroup columnWidth={cardWidth}>
				<TransitionGroup component={null}>
					{storyData.map(story => (
						<CSSTransition classNames="pop" key={story.id} timeout={200}>
							<StoryCard
								onChangeTagColor={handleChangeTagColor}
								onEdit={() => history.push(`/stories/${story.id}`)}
								onRemoveTag={name => handleRemoveTag(story, name)}
								onSelect={() => onSelectStory(story)}
								story={story}
								storyTagColors={prefs.storyTagColors}
							/>
						</CSSTransition>
					))}
				</TransitionGroup>
			</CardGroup>
		</>
	);
};
