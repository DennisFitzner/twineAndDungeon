import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {CharacterSelector} from '../../../../components/control/character-selector';
import {Story, updateStory, useStoriesContext} from '../../../../store/stories';

export interface StoryPartCharacterSelectorProps {
        story: Story;
}

export const StoryPartCharacterSelector: React.FC<StoryPartCharacterSelectorProps> = ({
        story
}) => {
        const {dispatch, stories} = useStoriesContext();
        const {t} = useTranslation();
        const characters = story.characters ?? [];

        const allCharacterIds = React.useMemo(
                () => characters.map(character => character.id),
                [characters]
        );

        const selectedCharacterIds = React.useMemo(() => {
                if (characters.length === 0) {
                        return [];
                }

                if (story.partCharacterIds === undefined) {
                        return allCharacterIds;
                }

                const validIds = new Set(allCharacterIds);
                return story.partCharacterIds.filter(id => validIds.has(id));
        }, [allCharacterIds, characters.length, story.partCharacterIds]);

        const handleChange = React.useCallback(
                (characterIds: string[]) => {
                        if (characters.length === 0) {
                                return;
                        }

                        const validIds = allCharacterIds.filter(id => characterIds.includes(id));
                        const nextValue =
                                validIds.length === allCharacterIds.length ? undefined : validIds;
                        const currentValue = story.partCharacterIds;

                        let hasChanged = false;

                        if (currentValue === undefined) {
                                hasChanged = nextValue !== undefined;
                        } else if (nextValue === undefined) {
                                hasChanged = true;
                        } else {
                                if (currentValue.length !== nextValue.length) {
                                        hasChanged = true;
                                } else {
                                        hasChanged = currentValue.some(
                                                (id, index) => id !== nextValue[index]
                                        );
                                }
                        }

                        if (!hasChanged) {
                                return;
                        }

                        dispatch(
                                updateStory(stories, story, {partCharacterIds: nextValue})
                        );
                },
                [allCharacterIds, characters.length, dispatch, stories, story]
        );

        if (characters.length === 0) {
                return null;
        }

        return (
                <CharacterSelector
                        characters={characters}
                        label={t('storyPartTabs.partCharacters')}
                        onChange={handleChange}
                        selectedCharacterIds={selectedCharacterIds}
                />
        );
};
