import * as React from 'react';
import {ButtonBar} from '../../../../components/container/button-bar';
import {RenameStoryButton} from '../../../../components/story/rename-story-button';
import {Story, updateStory, useStoriesContext} from '../../../../store/stories';
import {DetailsButton} from './details-button';
import {FindReplaceButton} from './find-replace-button';
import {JavaScriptButton} from './javascript-button';
import {PassageTagsButton} from './passage-tags-button';
import {LoadStoryPartsButton} from './load-story-parts-button';
import {ReloadCharactersButton} from './reload-characters-button';
import {StylesheetButton} from './stylesheet-button';

export interface StoryActionsProps {
        story: Story;
        onLoadParts?: () => void;
        onReloadCharacters?: () => void;
}

export const StoryActions: React.FC<StoryActionsProps> = props => {
        const {dispatch, stories} = useStoriesContext();
        const {story, onLoadParts, onReloadCharacters} = props;

        return (
                <ButtonBar>
                        <FindReplaceButton story={story} />
                        <RenameStoryButton
				existingStories={stories}
				onRename={name => dispatch(updateStory(stories, story, {name}))}
				story={story}
			/>
			<DetailsButton story={story} />
			<PassageTagsButton story={story} />
                        <JavaScriptButton story={story} />
                        <StylesheetButton story={story} />
                        {onLoadParts && (
                                <LoadStoryPartsButton story={story} onLoadParts={onLoadParts} />
                        )}
                        {onReloadCharacters && (
                                <ReloadCharactersButton onReloadCharacters={onReloadCharacters} />
                        )}
                </ButtonBar>
        );
};
