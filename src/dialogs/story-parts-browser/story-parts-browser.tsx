import React from 'react';
import {useTranslation} from 'react-i18next';
import {IconFolder, IconFile} from '@tabler/icons';
import {DialogCard} from '../../components/container/dialog-card';
import {CardContent} from '../../components/container/card';
import {IconButton} from '../../components/control/icon-button';
import {DialogComponentProps} from '../dialogs.types';
import './story-parts-browser.css';

export interface StoryPart {
	path: string;
	name: string;
	relativePath: string;
	isDirectory: boolean;
}

export interface StoryPartsBrowserProps extends DialogComponentProps {
	onSelectParts: (selectedPaths: string[]) => void;
	storyFolderPath: string;
	availableParts: StoryPart[];
}

export function StoryPartsBrowser({
	onClose,
	onSelectParts,
	storyFolderPath,
	availableParts,
	...otherProps
}: StoryPartsBrowserProps) {
	const {t} = useTranslation();
	const [selectedPaths, setSelectedPaths] = React.useState<Set<string>>(
		new Set()
	);

	const handlePartToggle = (path: string) => {
		setSelectedPaths(prev => {
			const newSet = new Set(prev);
			if (newSet.has(path)) {
				newSet.delete(path);
			} else {
				newSet.add(path);
			}
			return newSet;
		});
	};

	const handleSelectAll = () => {
		const htmlFiles = availableParts.filter(
			part => !part.isDirectory && part.name.endsWith('.html')
		);
		setSelectedPaths(new Set(htmlFiles.map(part => part.path)));
	};

	const handleSelectNone = () => {
		setSelectedPaths(new Set());
	};

	const handleLoadSelected = () => {
		onSelectParts(Array.from(selectedPaths));
		onClose();
	};

	const htmlParts = availableParts.filter(
		part => !part.isDirectory && part.name.endsWith('.html')
	);

	return (
		<DialogCard
			{...otherProps}
			collapsed={false}
			fixedSize={false}
			headerLabel={t('storyPartsBrowser.title')}
			onClose={onClose}
		>
			<CardContent>
				<div className="story-parts-browser">
					<div className="story-parts-browser-header">
						<div className="story-parts-browser-folder-info">
							<IconFolder size={16} />
							<span className="story-parts-browser-folder-path">
								{storyFolderPath}
							</span>
						</div>
						<div className="story-parts-browser-actions">
							<IconButton
								icon={<span>{t('storyPartsBrowser.selectAll')}</span>}
								label={t('storyPartsBrowser.selectAll')}
								onClick={handleSelectAll}
							/>
							<IconButton
								icon={<span>{t('storyPartsBrowser.selectNone')}</span>}
								label={t('storyPartsBrowser.selectNone')}
								onClick={handleSelectNone}
							/>
						</div>
					</div>

					<div className="story-parts-browser-content">
						{htmlParts.length === 0 ? (
							<div className="story-parts-browser-empty">
								<IconFile size={32} />
								<p>{t('storyPartsBrowser.noPartsFound')}</p>
							</div>
						) : (
							<div className="story-parts-browser-list">
								{htmlParts.map(part => (
									<div
										key={part.path}
										className={`story-parts-browser-item ${
											selectedPaths.has(part.path) ? 'selected' : ''
										}`}
										onClick={() => handlePartToggle(part.path)}
									>
										<div className="story-parts-browser-item-checkbox">
											<input
												type="checkbox"
												checked={selectedPaths.has(part.path)}
												onChange={() => handlePartToggle(part.path)}
											/>
										</div>
										<div className="story-parts-browser-item-icon">
											<IconFile size={16} />
										</div>
										<div className="story-parts-browser-item-info">
											<div className="story-parts-browser-item-name">
												{part.name.replace('.html', '')}
											</div>
											<div className="story-parts-browser-item-path">
												{part.relativePath}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="story-parts-browser-footer">
						<div className="story-parts-browser-selection-info">
							{selectedPaths.size > 0 && (
								<span>
									{t('storyPartsBrowser.selectedCount', {
										count: selectedPaths.size
									})}
								</span>
							)}
						</div>
						<div className="story-parts-browser-buttons">
							<IconButton
								icon={<span>{t('common.cancel')}</span>}
								label={t('common.cancel')}
								onClick={onClose}
							/>
							<IconButton
								icon={<span>{t('storyPartsBrowser.loadSelected')}</span>}
								label={t('storyPartsBrowser.loadSelected')}
								onClick={handleLoadSelected}
								disabled={selectedPaths.size === 0}
							/>
						</div>
					</div>
				</div>
			</CardContent>
		</DialogCard>
	);
}
