import {IconPlus, IconX} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {Story} from '../../store/stories/stories.types';
import {IconButton} from '../control/icon-button';
import './story-part-tabs.css';

export interface StoryPartTabsProps {
	/**
	 * All story parts for the current story folder
	 */
	storyParts: Story[];
	/**
	 * Currently active story part ID
	 */
	activePartId: string;
	/**
	 * Callback when a tab is selected
	 */
	onSelectPart: (partId: string) => void;
	/**
	 * Callback when a part should be closed
	 */
	onClosePart: (partId: string) => void;
	/**
	 * Callback when a new part should be created
	 */
	onCreatePart: () => void;
}

export const StoryPartTabs: React.FC<StoryPartTabsProps> = props => {
	const {storyParts, activePartId, onSelectPart, onClosePart, onCreatePart} =
		props;
	const {t} = useTranslation();

	const handleClosePart = (event: React.MouseEvent, partId: string) => {
		event.stopPropagation();
		// Don't allow closing if there's only one part
		if (storyParts.length <= 1) {
			return;
		}
		onClosePart(partId);
	};

	const activeIndex = storyParts.findIndex(part => part.id === activePartId);

	return (
		<div className="story-part-tabs">
			<div className="story-part-tablist">
				{storyParts.map((part, index) => (
					<div
						key={part.id}
						className={`story-part-tab ${
							index === activeIndex ? 'active' : ''
						}`}
						onClick={() => onSelectPart(part.id)}
					>
						<span className="story-part-tab-label">
							{part.partName || part.name}
						</span>
						<IconButton
							icon={<IconX />}
							label={t('common.close')}
							onClick={(event: React.MouseEvent) =>
								handleClosePart(event, part.id)
							}
							iconOnly
							disabled={storyParts.length <= 1}
						/>
					</div>
				))}
				<button
					className="story-part-add-button"
					onClick={onCreatePart}
					title={t('storyPartTabs.createNewPart')}
				>
					<IconPlus />
				</button>
			</div>
		</div>
	);
};
