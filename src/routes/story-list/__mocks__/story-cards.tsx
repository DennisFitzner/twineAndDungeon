import * as React from 'react';
import {StoryCardsProps} from '../story-cards';

export const StoryCards = ({
	stories,
	isFolderView = false
}: StoryCardsProps) => (
	<div data-testid="mock-story-cards">
		{stories.map(item => (
			<div
				data-testid="mock-story-card"
				data-id={isFolderView ? (item as any).folderName : (item as any).id}
				key={isFolderView ? (item as any).folderName : (item as any).id}
			/>
		))}
	</div>
);
