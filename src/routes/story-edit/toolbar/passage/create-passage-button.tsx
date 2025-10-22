import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconPlus} from '@tabler/icons';
import {IconButton} from '../../../../components/control/icon-button';
import {createUntitledPassageWithEdit, Story} from '../../../../store/stories';
import {useUndoableStoriesContext} from '../../../../store/undoable-stories';
import {useDialogsContext} from '../../../../dialogs';
import {addPassageEditors} from '../../../../dialogs/context/action-creators';
import {Point} from '../../../../util/geometry';

export interface CreatePassageButtonProps {
	getCenter: () => Point;
	story: Story;
}

export const CreatePassageButton: React.FC<
	CreatePassageButtonProps
> = props => {
	const {getCenter, story} = props;
	const {dispatch: storiesDispatch} = useUndoableStoriesContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();

	const handleClick = React.useCallback(() => {
		const {left, top} = getCenter();

		// Create the passage with pre-generated ID
		const createAction = createUntitledPassageWithEdit(story, left, top);
		storiesDispatch(createAction, 'undoChange.newPassage');

		// Open the passage in edit mode with auto-rename
		const passageId = createAction.props.id;
		if (passageId) {
			dialogsDispatch(addPassageEditors(story.id, [passageId], 6, true));
		}
	}, [storiesDispatch, dialogsDispatch, getCenter, story]);
	const {t} = useTranslation();

	return (
		<IconButton
			icon={<IconPlus />}
			label={t('common.new')}
			onClick={handleClick}
		/>
	);
};
