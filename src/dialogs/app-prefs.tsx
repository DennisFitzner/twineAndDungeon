import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {CardContent} from '../components/container/card';
import {DialogCard, DialogCardProps} from '../components/container/dialog-card';
import {CheckboxButton} from '../components/control/checkbox-button';
import {FontSelect} from '../components/control/font-select';
import {TextInput} from '../components/control/text-input';
import {TextSelect} from '../components/control/text-select';
import {CharacterIconSizePref, setPref, usePrefsContext} from '../store/prefs';
import {closestAppLocale, locales} from '../util/locales';
import './app-prefs.css';

export const AppPrefsDialog: React.FC<
	Omit<DialogCardProps, 'headerLabel'>
> = props => {
	const {dispatch, prefs} = usePrefsContext();
	const {t} = useTranslation();

	function handleUseCodeMirrorChange(value: boolean) {
		dispatch(setPref('useCodeMirror', value));

		// If we're disabling CodeMirror, force cursor blinking on because we no longer control it.

		if (!value) {
			dispatch(setPref('editorCursorBlinks', true));
		}
	}

	const normalizedCharacterIconSize = React.useMemo<CharacterIconSizePref>(() => {
		const pref = prefs.characterIconSize as unknown;

		if (typeof pref === 'number') {
			return {amount: pref, unit: 'px'};
		}

		if (
			pref &&
			typeof (pref as CharacterIconSizePref).amount === 'number' &&
			((pref as CharacterIconSizePref).unit === 'px' ||
				(pref as CharacterIconSizePref).unit === '%')
		) {
			return pref as CharacterIconSizePref;
		}

		return {amount: 20, unit: 'px'};
	}, [prefs.characterIconSize]);

	const [characterIconAmount, setCharacterIconAmount] = React.useState(
		normalizedCharacterIconSize.amount.toString()
	);

	React.useEffect(() => {
		setCharacterIconAmount(normalizedCharacterIconSize.amount.toString());
	}, [normalizedCharacterIconSize.amount]);

	const handleCharacterIconAmountChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const nextValue = event.target.value;
			setCharacterIconAmount(nextValue);

			const parsed = parseFloat(nextValue);

			if (!Number.isFinite(parsed)) {
				return;
			}

			const sanitized = Math.max(0, parsed);

			dispatch(
				setPref('characterIconSize', {
					amount: sanitized,
					unit: normalizedCharacterIconSize.unit
				})
			);
		},
		[dispatch, normalizedCharacterIconSize.unit]
	);

	const handleCharacterIconUnitChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			const parsedAmount = parseFloat(characterIconAmount);
			const nextAmount = Number.isFinite(parsedAmount)
				? Math.max(0, parsedAmount)
				: normalizedCharacterIconSize.amount;
			const nextUnit = event.target.value === '%' ? '%' : 'px';

			dispatch(
				setPref('characterIconSize', {
					amount: nextAmount,
					unit: nextUnit
				})
			);
		},
		[characterIconAmount, dispatch, normalizedCharacterIconSize.amount]
	);

	return (
		<DialogCard
			{...props}
			className="app-prefs-dialog"
			fixedSize
			headerLabel={t('dialogs.appPrefs.title')}
		>
			<CardContent>
				<TextSelect
					onChange={e => dispatch(setPref('locale', e.target.value))}
					options={locales.map(locale => ({
						label: locale.name,
						value: locale.code
					}))}
					value={closestAppLocale(prefs.locale)}
				>
					{t('dialogs.appPrefs.language')}
				</TextSelect>
				<TextSelect
					onChange={e => dispatch(setPref('appTheme', e.target.value))}
					options={[
						{label: t('dialogs.appPrefs.themeSystem'), value: 'system'},
						{label: t('dialogs.appPrefs.themeLight'), value: 'light'},
						{label: t('dialogs.appPrefs.themeDark'), value: 'dark'}
					]}
					value={prefs.appTheme}
				>
					{t('dialogs.appPrefs.theme')}
				</TextSelect>
				<TextSelect
					onChange={e =>
						dispatch(setPref('dialogWidth', parseInt(e.target.value)))
					}
					options={[
						{label: t('dialogs.appPrefs.dialogWidths.default'), value: '600'},
						{label: t('dialogs.appPrefs.dialogWidths.wider'), value: '700'},
						{label: t('dialogs.appPrefs.dialogWidths.widest'), value: '800'}
					]}
					value={prefs.dialogWidth.toString()}
				>
					{t('dialogs.appPrefs.dialogWidth')}
				</TextSelect>
				<TextInput
					onChange={handleCharacterIconAmountChange}
					value={characterIconAmount}
				>
					{t('dialogs.appPrefs.characterIconSize')}
				</TextInput>
				<TextSelect
					onChange={handleCharacterIconUnitChange}
					options={[
						{
							label: t('dialogs.appPrefs.characterIconSizeUnits.px'),
							value: 'px'
						},
						{
							label: t('dialogs.appPrefs.characterIconSizeUnits.percent'),
							value: '%'
						}
					]}
					value={normalizedCharacterIconSize.unit}
				>
					{t('dialogs.appPrefs.characterIconSizeUnit')}
				</TextSelect>
				<CheckboxButton
					disabled={!prefs.useCodeMirror}
					label={t('dialogs.appPrefs.editorCursorBlinks')}
					onChange={value => dispatch(setPref('editorCursorBlinks', value))}
					value={prefs.editorCursorBlinks}
				/>
				<CheckboxButton
					label={t('dialogs.appPrefs.useEnhancedEditors')}
					onChange={handleUseCodeMirrorChange}
					value={prefs.useCodeMirror}
				/>
				<p className="font-explanation">
					{t('dialogs.appPrefs.fontExplanation')}
				</p>
				<FontSelect
					familyLabel={t('dialogs.appPrefs.passageEditorFont')}
					fontFamily={prefs.passageEditorFontFamily}
					fontScale={prefs.passageEditorFontScale}
					onChangeFamily={value =>
						dispatch(setPref('passageEditorFontFamily', value))
					}
					onChangeScale={value =>
						dispatch(setPref('passageEditorFontScale', value))
					}
					scaleLabel={t('dialogs.appPrefs.passageEditorFontScale')}
				/>
				<FontSelect
					familyLabel={t('dialogs.appPrefs.codeEditorFont')}
					fontFamily={prefs.codeEditorFontFamily}
					fontScale={prefs.codeEditorFontScale}
					onChangeFamily={value =>
						dispatch(setPref('codeEditorFontFamily', value))
					}
					onChangeScale={value =>
						dispatch(setPref('codeEditorFontScale', value))
					}
					scaleLabel={t('dialogs.appPrefs.codeEditorFontScale')}
				/>
			</CardContent>
		</DialogCard>
	);
};
