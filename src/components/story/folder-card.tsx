import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {Story} from '../../store/stories';
import {CardContent, CardProps} from '../container/card';
import {SelectableCard} from '../container/card/selectable-card';
import './folder-card.css';

const dateFormatter = new Intl.DateTimeFormat([]);

export interface FolderCardProps extends CardProps {
	onEdit: (folderName: string) => void;
	onSelect: (folderName: string) => void;
	folderName: string;
	stories: Story[];
	lastUpdate: Date;
	selected?: boolean;
}

export const FolderCard: React.FC<FolderCardProps> = props => {
	const {
		onEdit,
		onSelect,
		folderName,
		stories,
		lastUpdate,
		selected,
		...otherProps
	} = props;
	const {t} = useTranslation();

	const totalPassages = stories.reduce(
		(sum, story) => sum + story.passages.length,
		0
	);
	const allTags = Array.from(new Set(stories.flatMap(story => story.tags)));

	return (
		<div className="folder-card">
			<SelectableCard
				{...otherProps}
				label={folderName}
				onDoubleClick={() => onEdit(folderName)}
				onSelect={() => onSelect(folderName)}
				selected={selected}
			>
				<CardContent>
					<div className="folder-card-summary">
						<div className="folder-card-summary-text">
							<h2>{folderName}</h2>
							<p>
								{t('components.folderCard.lastUpdated', {
									date: dateFormatter.format(lastUpdate)
								})}
								<br />
								{t('components.folderCard.storyCount', {
									count: stories.length
								})}{' '}
								•{' '}
								{t('components.folderCard.passageCount', {
									count: totalPassages
								})}
							</p>
						</div>
					</div>
					{allTags.length > 0 && (
						<div className="tags">
							{allTags.map(tag => (
								<span key={tag} className="tag">
									{tag}
								</span>
							))}
						</div>
					)}
				</CardContent>
			</SelectableCard>
		</div>
	);
};
