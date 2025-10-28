import {Passage, Story, UpdatePassagesAction} from '../stories.types';

const minDimension = 50;
const gridSize = 25;

/**
 * Resizes an individual passage.
 */
export function resizePassage(
	story: Story,
	passage: Passage,
	width: number,
	height: number
): UpdatePassagesAction {
	if (!Number.isFinite(width) || !Number.isFinite(height)) {
		throw new Error('Dimensions must be finite numbers.');
	}

	const snappedWidth = snapToGrid(Math.max(width, minDimension), story.snapToGrid);
	const snappedHeight = snapToGrid(Math.max(height, minDimension), story.snapToGrid);

	return {
		type: 'updatePassages',
		passageUpdates: {
			[passage.id]: {
				width: snappedWidth,
				height: snappedHeight
			}
		},
		storyId: story.id
	};
}

function snapToGrid(value: number, snap: boolean) {
	if (!snap) {
		return value;
	}

	return Math.max(minDimension, Math.round(value / gridSize) * gridSize);
}
