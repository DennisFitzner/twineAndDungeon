import {IconX} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {Story} from '../../store/stories/stories.types';
import {IconButton} from '../control/icon-button';
import {CreateStoryPartButton} from './create-story-part-button';
import {storyPartsLogger} from '../../util/story-parts-logger';
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

		// Log tab close attempt
		const partToClose = storyParts.find(part => part.ifid === partIfid);
		storyPartsLogger.logTab({
			tabId: partIfid,
			tabName: partToClose?.partName || partToClose?.name || 'unknown',
			operation: 'close',
			details: {
				totalTabs: storyParts.length,
				canClose: storyParts.length > 1,
				identificationMethod: 'ifid-based'
			}
		});

		// Don't allow closing if there's only one part
		if (storyParts.length <= 1) {
			storyPartsLogger.logTab({
				tabId: partIfid,
				tabName: partToClose?.partName || partToClose?.name || 'unknown',
				operation: 'close_blocked',
				details: {
					reason: 'only_one_part_remaining',
					totalTabs: storyParts.length,
					identificationMethod: 'ifid-based'
				}
			});
			return;
		}

		onClosePart(partIfid);
	};

	const activeIndex = storyParts.findIndex(
		part => part.ifid === activePartIfid
	);

	// Log tab array state changes
	React.useEffect(() => {
		storyPartsLogger.logTab({
			tabId: 'tab_array',
			tabName: 'story_parts_tabs',
			operation: 'filter',
			details: {
				totalTabs: storyParts.length,
				activeTabIndex: activeIndex,
				activeTabIfid: activePartIfid,
				tabNames: storyParts.map(part => part.partName || part.name),
				identificationMethod: 'ifid-based'
			}
		});
	}, [storyParts, activeIndex, activePartIfid]);

	const handleSelectPart = (partIfid: string) => {
		const selectedPart = storyParts.find(part => part.ifid === partIfid);

		// Log tab selection
		storyPartsLogger.logTab({
			tabId: partIfid,
			tabName: selectedPart?.partName || selectedPart?.name || 'unknown',
			operation: 'select',
			details: {
				previousActiveTab: activePartIfid,
				totalTabs: storyParts.length,
				identificationMethod: 'ifid-based'
			}
		});

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
