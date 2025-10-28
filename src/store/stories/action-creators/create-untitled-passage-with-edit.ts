import {Story} from '../stories.types';
import {CreatePassageAction} from '../stories.types';
import {createUntitledPassage} from './create-untitled-passage';
import {v4 as uuid} from '@lukeed/uuid';

/**
 * Creates a new, untitled passage centered at a point in the story.
 * This is a simple wrapper around createUntitledPassage that pre-generates an ID.
 */
export function createUntitledPassageWithEdit(
	story: Story,
	centerX: number,
	centerY: number
): CreatePassageAction {
	// Generate an ID for the passage
	const passageId = uuid();

	// Create the passage with the pre-generated ID
	const createAction = createUntitledPassage(story, centerX, centerY);
	// Override the props to include our ID
	return {
		...createAction,
		props: {
			...createAction.props,
			id: passageId
		}
	};
}
