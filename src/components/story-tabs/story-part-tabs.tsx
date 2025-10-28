import {IconX} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {Story} from '../../store/stories/stories.types';
import {IconButton} from '../control/icon-button';
import {CreateStoryPartButton} from './create-story-part-button';
import './story-part-tabs.css';

export interface StoryPartTabsProps {
	/**
	 * All story parts for the current story folder
	 */
	storyParts: Story[];
	/**
	 * Currently active story part IFID
	 */
	activePartIfid: string;
	/**
	 * Callback when a tab is selected
	 */
	onSelectPart: (partIfid: string) => void;
	/**
	 * Callback when a part should be closed
	 */
	onClosePart: (partIfid: string) => void;
	/**
	 * Callback when a new part should be created
	 */
	onCreatePart: (partName: string) => void;
}

export const StoryPartTabs: React.FC<StoryPartTabsProps> = props => {
	const {storyParts, activePartIfid, onSelectPart, onClosePart, onCreatePart} =
		props;
	const {t} = useTranslation();

	const handleClosePart = (event: React.MouseEvent, partIfid: string) => {
		event.stopPropagation();

		// Don't allow closing if there's only one part
		if (storyParts.length <= 1) {
			return;
		}

		onClosePart(partIfid);
	};

	const activeIndex = storyParts.findIndex(
		part => part.ifid === activePartIfid
	);

	const handleSelectPart = (partIfid: string) => {
		onSelectPart(partIfid);
	};

	return (
		<div className="story-part-tabs">
			<div className="story-part-tablist">
				{storyParts.map((part, index) => (
					<div
						key={part.ifid}
						className={`story-part-tab ${
							index === activeIndex ? 'active' : ''
						}`}
						onClick={() => handleSelectPart(part.ifid)}
					>
						<span className="story-part-tab-label">
							{part.partName || part.name}
						</span>
						<IconButton
							icon={<IconX />}
							label={t('common.close')}
							onClick={(event: React.MouseEvent) =>
								handleClosePart(event, part.ifid)
							}
							iconOnly
							disabled={storyParts.length <= 1}
						/>
					</div>
				))}
				<CreateStoryPartButton
					storyParts={storyParts}
					onCreatePart={onCreatePart || (() => {})}
				/>
			</div>
		</div>
	);
};
