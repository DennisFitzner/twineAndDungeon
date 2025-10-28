import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconPlus} from '@tabler/icons';
import {PromptButton, PromptButtonHandle} from '../control/prompt-button';
import {useHotkeys} from 'react-hotkeys-hook';
import {unusedName} from '../../util/unused-name';
import type {TwineElectronWindow} from '../../electron/shared';

export interface CreateStoryPartButtonProps {
	storyParts: Array<{partName?: string; name: string}>;
	onCreatePart: (partName: string) => void;
}

export const CreateStoryPartButton: React.FC<
	CreateStoryPartButtonProps
> = props => {
	const {storyParts, onCreatePart} = props;
	const promptRef = React.useRef<PromptButtonHandle>(null);
	const [newName, setNewName] = React.useState(
		unusedName(
			'New Part',
			storyParts.map(part => part.partName || part.name)
		)
	);
	const {t} = useTranslation();
	const twineElectron =
		typeof window !== 'undefined'
			? (window as TwineElectronWindow).twineElectron
			: undefined;
	const isElectron = Boolean(twineElectron?.onCreateStoryPartShortcut);

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

	useHotkeys(
		'meta+p,ctrl+p',
		event => {
			event.preventDefault();
			promptRef.current?.open();
		},
		{enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false, enabled: !isElectron},
		[promptRef, isElectron]
	);

	React.useEffect(() => {
		if (!isElectron || !twineElectron?.onCreateStoryPartShortcut) {
			return;
		}

		return twineElectron.onCreateStoryPartShortcut(() => {
			promptRef.current?.open();
		});
	}, [isElectron, twineElectron]);

	return (
		<PromptButton
			ref={promptRef}
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
