import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {DialogCardProps} from '../../components/container/dialog-card';
import {DialogCard} from '../../components/container/dialog-card';
import {ButtonBar} from '../../components/container/button-bar';
import {CardButton} from '../../components/control/card-button';
import {IconX} from '@tabler/icons';
import {Story} from '../../store/stories';
import './export-all-twee.css';

export interface ExportAllTweeDialogProps extends DialogCardProps {
	story: Story;
	allStoryParts: Story[];
}

export type ExportMode = 'combined' | 'separate';
export type NamingOption = 'partName' | 'folderPartName' | 'folderStructure';

export const ExportAllTweeDialog: React.FC<
	ExportAllTweeDialogProps
> = props => {
	const {story, allStoryParts, onClose, ...dialogProps} = props;
	const {t} = useTranslation();
	const [exportMode, setExportMode] = React.useState<ExportMode>('combined');
	const [namingOption, setNamingOption] =
		React.useState<NamingOption>('partName');
	const [isExporting, setIsExporting] = React.useState(false);

	const handleExport = React.useCallback(async () => {
		setIsExporting(true);
		try {
			// Import the export functions dynamically to avoid circular dependencies
			const {exportAllStoryPartsAsTwee} = await import('../../util/twee');
			const {saveTweeMultiple, saveTweeZip} = await import(
				'../../util/save-file'
			);

			if (exportMode === 'combined') {
				// Export as single combined file
				const combinedTwee = exportAllStoryPartsAsTwee(
					allStoryParts,
					story.name
				);
				const {saveTwee} = await import('../../util/save-file');
				saveTwee(combinedTwee, `${story.name}-all-parts.twee`);
			} else {
				// Export as separate files
				const tweeFiles = allStoryParts.map(part => ({
					content: exportAllStoryPartsAsTwee([part], part.name),
					filename: getFilename(part, namingOption, story.name)
				}));

				if (namingOption === 'folderStructure') {
					// Create zip with folder structure
					saveTweeZip(tweeFiles, story.name);
				} else {
					// Save individual files
					saveTweeMultiple(tweeFiles);
				}
			}
			onClose();
		} catch (error) {
			console.error('Export failed:', error);
		} finally {
			setIsExporting(false);
		}
	}, [exportMode, namingOption, allStoryParts, story, onClose]);

	function getFilename(
		part: Story,
		option: NamingOption,
		folderName: string
	): string {
		const partName = part.partName || part.name;
		switch (option) {
			case 'partName':
				return `${partName}.twee`;
			case 'folderPartName':
				return `${folderName}-${partName}.twee`;
			case 'folderStructure':
				return `${partName}.twee`;
			default:
				return `${partName}.twee`;
		}
	}

	return (
		<DialogCard
			{...dialogProps}
			headerLabel={t('dialogs.exportAllTwee.title')}
			fixedSize
			onClose={onClose}
		>
			<div className="export-all-twee-dialog">
				<div className="export-mode-selection">
					<h3>{t('dialogs.exportAllTwee.exportMode')}</h3>
					<label className="radio-option">
						<input
							type="radio"
							name="exportMode"
							value="combined"
							checked={exportMode === 'combined'}
							onChange={e => setExportMode(e.target.value as ExportMode)}
						/>
						{t('dialogs.exportAllTwee.combinedFile')}
					</label>
					<label className="radio-option">
						<input
							type="radio"
							name="exportMode"
							value="separate"
							checked={exportMode === 'separate'}
							onChange={e => setExportMode(e.target.value as ExportMode)}
						/>
						{t('dialogs.exportAllTwee.separateFiles')}
					</label>
				</div>

				{exportMode === 'separate' && (
					<div className="naming-options">
						<h3>{t('dialogs.exportAllTwee.namingOptions')}</h3>
						<label className="radio-option">
							<input
								type="radio"
								name="namingOption"
								value="partName"
								checked={namingOption === 'partName'}
								onChange={e => setNamingOption(e.target.value as NamingOption)}
							/>
							{t('dialogs.exportAllTwee.namingOption1')}
						</label>
						<label className="radio-option">
							<input
								type="radio"
								name="namingOption"
								value="folderPartName"
								checked={namingOption === 'folderPartName'}
								onChange={e => setNamingOption(e.target.value as NamingOption)}
							/>
							{t('dialogs.exportAllTwee.namingOption2')}
						</label>
						<label className="radio-option">
							<input
								type="radio"
								name="namingOption"
								value="folderStructure"
								checked={namingOption === 'folderStructure'}
								onChange={e => setNamingOption(e.target.value as NamingOption)}
							/>
							{t('dialogs.exportAllTwee.namingOption3')}
						</label>
					</div>
				)}

				<div className="story-parts-info">
					<p>
						{t('dialogs.exportAllTwee.partsCount', {
							count: allStoryParts.length
						})}
					</p>
					<ul>
						{allStoryParts.map(part => (
							<li key={part.id}>{part.partName || part.name}</li>
						))}
					</ul>
				</div>

				<ButtonBar>
					<CardButton
						ariaLabel={t('common.cancel')}
						disabled={isExporting}
						icon={<IconX />}
						label={t('common.cancel')}
						onChangeOpen={() => {}}
						onClick={onClose}
					/>
					<CardButton
						ariaLabel={
							isExporting
								? t('dialogs.exportAllTwee.exporting')
								: t('dialogs.exportAllTwee.export')
						}
						disabled={isExporting}
						icon={undefined}
						label={
							isExporting
								? t('dialogs.exportAllTwee.exporting')
								: t('dialogs.exportAllTwee.export')
						}
						onChangeOpen={() => {}}
						onClick={handleExport}
						variant="primary"
					/>
				</ButtonBar>
			</div>
		</DialogCard>
	);
};
