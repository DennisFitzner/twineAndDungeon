import {IconFolder} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../../components/control/icon-button';
import {Story} from '../../../../store/stories';

export interface LoadStoryPartsButtonProps {
	story: Story;
	onLoadParts: () => void;
}

export const LoadStoryPartsButton: React.FC<
	LoadStoryPartsButtonProps
> = props => {
	const {onLoadParts} = props;
	const {t} = useTranslation();

	return (
		<IconButton
			icon={<IconFolder />}
			label={t('storyActions.loadStoryParts')}
			onClick={onLoadParts}
		/>
	);
};
