import {IconRefresh} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../../components/control/icon-button';

export interface ReloadCharactersButtonProps {
        onReloadCharacters: () => void;
}

export const ReloadCharactersButton: React.FC<ReloadCharactersButtonProps> = props => {
        const {onReloadCharacters} = props;
        const {t} = useTranslation();

        return (
                <IconButton
                        icon={<IconRefresh />}
                        label={t('storyActions.reloadCharacters')}
                        onClick={onReloadCharacters}
                />
        );
};
