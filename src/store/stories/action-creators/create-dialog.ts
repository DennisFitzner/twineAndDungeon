import {v4 as uuid} from '@lukeed/uuid';
import {Thunk} from 'react-hook-thunk-reducer';
import {CreatePassageAction, StoriesAction, StoriesState, Story} from '../stories.types';
import {createUntitledPassage} from './create-untitled-passage';
import {unusedName} from '../../../util/unused-name';
import {passageDefaults, storyDefaults} from '../defaults';

export function createDialog(
        story: Story,
        centerX: number,
        centerY: number
): Thunk<StoriesState, StoriesAction | CreatePassageAction, string> {
        return dispatch => {
                const dialogStoryId = uuid();
                const dialogIfid = uuid().toUpperCase();
                const dialogRootPassageId = uuid();
                const dialogSummaryId = uuid();

                const defs = passageDefaults();
                const dialogName = unusedName(
                        'Dialog',
                        story.passages.map(passage => passage.name)
                );

                const createSummaryAction = createUntitledPassage(story, centerX, centerY);

                const dialogRootPassage = {
                        ...defs,
                        id: dialogRootPassageId,
                        name: dialogName,
                        story: dialogStoryId,
                        text: ''
                };

                const dialogStory: Story = {
                        ...storyDefaults(),
                        id: dialogStoryId,
                        ifid: dialogIfid,
                        lastUpdate: new Date(),
                        passages: [dialogRootPassage],
                        partName: dialogName,
                        storyFolderName: story.storyFolderName || story.name,
                        storyFormat: story.storyFormat,
                        storyFormatVersion: story.storyFormatVersion,
                        stylesheet: story.stylesheet,
                        script: story.script,
                        name: `${story.name}:${dialogName}`,
                        tags: story.tags,
                        tagColors: story.tagColors,
                        characters: story.characters,
                        partCharacterIds: story.partCharacterIds,
                        startPassage: dialogRootPassageId
                };

                dispatch({
                        type: 'createStory',
                        props: dialogStory
                });

                dispatch({
                        ...createSummaryAction,
                        props: {
                                ...createSummaryAction.props,
                                id: dialogSummaryId,
                                name: dialogName,
                                isDialog: true,
                                dialogStoryIfid: dialogIfid,
                                text: ''
                        }
                });

                return dialogSummaryId;
        };
}
