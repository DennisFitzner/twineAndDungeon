import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconPlus} from '@tabler/icons';
import {PromptButton} from '../control/prompt-button';
import {unusedName} from '../../util/unused-name';

export interface CreateStoryPartButtonProps {
	storyParts: Array<{partName?: string; name: string}>;
	onCreatePart: (partName: string) => void;
}

export const CreateStoryPartButton: React.FC<
	CreateStoryPartButtonProps
> = props => {
	const {storyParts, onCreatePart} = props;
	const [newName, setNewName] = React.useState(
		unusedName(
			'New Part',
			storyParts.map(part => part.partName || part.name)
		)
	);
	const {t} = useTranslation();

	function validateName(value: string) {
		if (value.trim() === '') {
			return {
				valid: false,
				message: t('storyPartTabs.emptyName')
			};
		}

		if (
			storyParts.some(
				part =>
					(part.partName || part.name).toLowerCase() === value.toLowerCase()
			)
		) {
			return {
				valid: false,
				message: t('storyPartTabs.nameConflict')
			};
		}

		return {valid: true};
	}

	function handleSubmit() {
		onCreatePart(newName);
	}

	return (
		<PromptButton
			icon={<IconPlus />}
			label={t('storyPartTabs.createNewPart')}
			submitLabel={t('common.create')}
			submitVariant="create"
			onChange={e => setNewName(e.target.value)}
			onSubmit={handleSubmit}
			prompt={t('storyPartTabs.createPartPrompt')}
			validate={validateName}
			value={newName}
		/>
	);
};
