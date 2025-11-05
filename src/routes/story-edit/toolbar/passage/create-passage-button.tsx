import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconPlus} from '@tabler/icons';
import {useHotkeys} from 'react-hotkeys-hook';
import {IconButton} from '../../../../components/control/icon-button';
import {
        createUntitledPassageWithEdit,
        Story,
        updatePassage
} from '../../../../store/stories';
import {useUndoableStoriesContext} from '../../../../store/undoable-stories';
import {useDialogsContext} from '../../../../dialogs';
import {addPassageEditors} from '../../../../dialogs/context/action-creators';
import {Point} from '../../../../util/geometry';
import type {TwineElectronWindow} from '../../../../electron/shared';

export interface CreatePassageButtonProps {
        getCenter: () => Point;
        story: Story;
}

export function prepareCreatePassageAction(
        story: Story,
        left: number,
        top: number,
        characterId?: string
) {
        let createAction = createUntitledPassageWithEdit(story, left, top);

        if (characterId) {
                createAction = {
                        ...createAction,
                        props: {
                                ...createAction.props,
                                tags: [`characters:${characterId}`]
                        }
                };
        }

        return createAction;
}

export const CreatePassageButton: React.FC<
        CreatePassageButtonProps
> = props => {
	const {getCenter, story} = props;
	const {dispatch: storiesDispatch} = useUndoableStoriesContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();

        const partCharacters = React.useMemo(() => {
                const storyCharacters = story.characters ?? [];

                if (story.partCharacterIds === undefined) {
                        return storyCharacters;
                }

                const characterById = new Map(
                        storyCharacters.map(character => [character.id, character])
                );

                return story.partCharacterIds
                        .map(id => characterById.get(id))
                        .filter((char): char is typeof storyCharacters[number] => Boolean(char));
        }, [story.characters, story.partCharacterIds]);

        const createPassage = React.useCallback(
                (characterId?: string) => {
                        const {left, top} = getCenter();
                        const selectedPassage = story.passages.find(passage => passage.selected);

                        const createAction = prepareCreatePassageAction(
                                story,
                                left,
                                top,
                                characterId
                        );

                        storiesDispatch(createAction, 'undoChange.newPassage');

                        const passageId = createAction.props.id;
                        if (passageId) {
                                dialogsDispatch(
                                        addPassageEditors(story.id, [passageId], 6, true)
                                );
                        }

                        if (selectedPassage) {
                                const newPassageName = createAction.props.name ?? 'Untitled Passage';
                                const currentText = selectedPassage.text ?? '';
                                const needsNewline =
                                        currentText.trim().length > 0 && !currentText.endsWith('\n');
                                const updatedText = `${currentText}${needsNewline ? '\n' : ''}[[${newPassageName}]]`;

                                storiesDispatch(
                                        updatePassage(story, selectedPassage, {text: updatedText}),
                                        'undoChange.addLink'
                                );
                        }
                },
                [dialogsDispatch, getCenter, storiesDispatch, story]
        );
        const handleClick = React.useCallback(() => {
                createPassage();
        }, [createPassage]);
	const {t} = useTranslation();
	const twineElectron =
		typeof window !== 'undefined'
			? (window as TwineElectronWindow).twineElectron
			: undefined;
	const isElectron = Boolean(twineElectron?.onCreatePassageShortcut);

        useHotkeys(
                'meta+n,ctrl+n',
                event => {
                        event.preventDefault();
                        handleClick();
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false, enabled: !isElectron},
                [handleClick, isElectron]
        );

        const handleCharacterShortcut = React.useCallback(
                (index: number) => {
                        const character = partCharacters[index];
                        if (!character) {
                                return false;
                        }

                        createPassage(character.id);
                        return true;
                },
                [createPassage, partCharacters]
        );

        useHotkeys(
                'meta+1,ctrl+1',
                event => {
                        if (handleCharacterShortcut(0)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );
        useHotkeys(
                'meta+2,ctrl+2',
                event => {
                        if (handleCharacterShortcut(1)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );
        useHotkeys(
                'meta+3,ctrl+3',
                event => {
                        if (handleCharacterShortcut(2)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );
        useHotkeys(
                'meta+4,ctrl+4',
                event => {
                        if (handleCharacterShortcut(3)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );
        useHotkeys(
                'meta+5,ctrl+5',
                event => {
                        if (handleCharacterShortcut(4)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );
        useHotkeys(
                'meta+6,ctrl+6',
                event => {
                        if (handleCharacterShortcut(5)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );
        useHotkeys(
                'meta+7,ctrl+7',
                event => {
                        if (handleCharacterShortcut(6)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );
        useHotkeys(
                'meta+8,ctrl+8',
                event => {
                        if (handleCharacterShortcut(7)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );
        useHotkeys(
                'meta+9,ctrl+9',
                event => {
                        if (handleCharacterShortcut(8)) {
                                event.preventDefault();
                        }
                },
                {enableOnTags: ['TEXTAREA', 'INPUT'], keyup: false},
                [handleCharacterShortcut]
        );

	React.useEffect(() => {
		if (!isElectron || !twineElectron?.onCreatePassageShortcut) {
			return;
		}

		return twineElectron.onCreatePassageShortcut(() => {
                        createPassage();
                });
        }, [createPassage, isElectron, twineElectron]);

        return (
                <IconButton
                        icon={<IconPlus />}
                        label={t('common.new')}
			onClick={handleClick}
		/>
	);
};
