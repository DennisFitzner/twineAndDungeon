import * as React from 'react';
import {useTranslation} from 'react-i18next';
import classNames from 'classnames';
import './character-selector.css';

export interface Character {
	id: string;
	name: string;
}

export interface CharacterSelectorProps {
	characters: Character[];
	selectedCharacterIds: string[];
	onChange: (characterIds: string[]) => void;
	disabled?: boolean;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = props => {
	const {characters, selectedCharacterIds, onChange, disabled} = props;
	const {t} = useTranslation();
	const [isOpen, setIsOpen] = React.useState(false);
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	const handleCharacterToggle = React.useCallback(
		(characterId: string) => {
			if (disabled) return;

			const isSelected = selectedCharacterIds.includes(characterId);
			if (isSelected) {
				onChange(selectedCharacterIds.filter(id => id !== characterId));
			} else {
				onChange([...selectedCharacterIds, characterId]);
			}
		},
		[disabled, onChange, selectedCharacterIds]
	);

	const handleToggleDropdown = React.useCallback(() => {
		if (disabled) return;
		setIsOpen(prev => !prev);
	}, [disabled]);

	// Close dropdown when clicking outside
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	if (characters.length === 0) {
		return null;
	}

	const selectedCharacters = characters.filter(char =>
		selectedCharacterIds.includes(char.id)
	);
	const displayText =
		selectedCharacters.length === 0
			? t('dialogs.passageEdit.noCharactersSelected')
			: selectedCharacters.length === 1
			? selectedCharacters[0].name
			: t('dialogs.passageEdit.multipleCharactersSelected', {
					count: selectedCharacters.length
			  });

	return (
		<div className="character-selector" ref={dropdownRef}>
			<button
				className={classNames('character-selector-trigger', {
					'character-selector-trigger--disabled': disabled
				})}
				disabled={disabled}
				onClick={handleToggleDropdown}
				type="button"
			>
				<span className="character-selector-label">
					{t('dialogs.passageEdit.characters')}:
				</span>
				<span className="character-selector-display">{displayText}</span>
				<span
					className={classNames('character-selector-arrow', {
						'character-selector-arrow--open': isOpen
					})}
				>
					▼
				</span>
			</button>

			{isOpen && (
				<div className="character-selector-dropdown">
					{characters.map(character => (
						<label
							key={character.id}
							className={classNames('character-selector-option', {
								'character-selector-option--disabled': disabled
							})}
						>
							<input
								checked={selectedCharacterIds.includes(character.id)}
								disabled={disabled}
								onChange={() => handleCharacterToggle(character.id)}
								type="checkbox"
							/>
							<span className="character-selector-option-label">
								{character.name}
							</span>
						</label>
					))}
				</div>
			)}
		</div>
	);
};
