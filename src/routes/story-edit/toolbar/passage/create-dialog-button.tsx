import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconMessageCircle} from '@tabler/icons';
import {IconButton} from '../../../../components/control/icon-button';
import {createDialog, Story} from '../../../../store/stories';
import {useUndoableStoriesContext} from '../../../../store/undoable-stories';
import {useDialogsContext} from '../../../../dialogs';
import {addPassageEditors} from '../../../../dialogs/context/action-creators';
import {Point} from '../../../../util/geometry';

export interface CreateDialogButtonProps {
        getCenter: () => Point;
        story: Story;
}

export const CreateDialogButton: React.FC<CreateDialogButtonProps> = ({
        getCenter,
        story
}) => {
        const {dispatch: storiesDispatch} = useUndoableStoriesContext();
        const {dispatch: dialogsDispatch} = useDialogsContext();
        const {t} = useTranslation();

        const handleClick = React.useCallback(() => {
                const {left, top} = getCenter();
                const summaryId = storiesDispatch(
                        createDialog(story, left, top),
                        'undoChange.newPassage'
                ) as string | undefined;

                if (summaryId) {
                        dialogsDispatch(addPassageEditors(story.id, [summaryId], 6, true));
                }
        },
                [dialogsDispatch, getCenter, storiesDispatch, story]
        );

        return (
                <IconButton
                        icon={<IconMessageCircle />}
                        label={t('storyEditToolbar.newDialog', 'New dialog')}
                        onClick={handleClick}
                />
        );
};
