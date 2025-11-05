import {
	app,
	BrowserWindow,
	Menu,
	shell,
	MenuItemConstructorOptions
} from 'electron';
import {
	chooseStoryDirectoryPath,
	revealStoryDirectory
} from './story-directory';
import {i18n} from './locales';
import {checkForUpdate} from './check-for-update';
import {toggleHardwareAcceleration} from './hardware-acceleration';
import {getAppPref} from './app-prefs';

export function initMenuBar() {
        function sendAccelerator(channel: string, payload?: unknown) {
                const focusedWindow = BrowserWindow.getFocusedWindow();
                if (payload === undefined) {
                        focusedWindow?.webContents.send(channel);
                        return;
                }

                focusedWindow?.webContents.send(channel, payload);
        }

        const template: MenuItemConstructorOptions[] = [
		{
			label: app.getName(),
			submenu: [
				{role: 'about'},
				{
					label: i18n.t('electron.menuBar.checkForUpdates'),
					click: checkForUpdate
				},
				{
					label: i18n.t('electron.menuBar.setStoryLibraryFolder'),
					click: chooseStoryDirectoryPath
				},
				{type: 'separator'},
				{role: 'quit'}
			]
		},
		{
			label: i18n.t('electron.menuBar.edit'),
			submenu: [
				{role: 'undo'},
				{role: 'redo'},
				{type: 'separator'},
				{role: 'cut'},
				{role: 'copy'},
				{role: 'paste'},
				{role: 'delete'},
				{role: 'selectAll'}
			]
		},
                {
                        label: i18n.t('common.story'),
                        submenu: [
                                {
                                        accelerator: 'CmdOrCtrl+N',
                                        click: () => sendAccelerator('accelerator:new-passage'),
                                        label: i18n.t('undoChange.newPassage')
                                },
                                ...Array.from({length: 9}, (_, index): MenuItemConstructorOptions => ({
                                        accelerator: `CmdOrCtrl+${index + 1}`,
                                        click: () =>
                                                sendAccelerator('accelerator:new-passage', {
                                                        characterIndex: index
                                                }),
                                        label: i18n.t(
                                                'electron.menuBar.newPassageForCharacter',
                                                {number: index + 1}
                                        )
                                })),
                                {
                                        accelerator: 'CmdOrCtrl+P',
                                        click: () => sendAccelerator('accelerator:new-story-part'),
                                        label: i18n.t('storyPartTabs.createNewPart')
                                },
                                {type: 'separator'},
                                {
                                        accelerator: 'CmdOrCtrl+C',
                                        click: () => sendAccelerator('accelerator:copy-passages'),
                                        label: i18n.t('common.copy', {defaultValue: 'Copy'})
                                },
                                {
                                        accelerator: 'CmdOrCtrl+X',
                                        click: () => sendAccelerator('accelerator:cut-passages'),
                                        label: i18n.t('common.cut', {defaultValue: 'Cut'})
                                },
                                {
                                        accelerator: 'CmdOrCtrl+V',
                                        click: () => sendAccelerator('accelerator:paste-passages'),
                                        label: i18n.t('common.paste', {defaultValue: 'Paste'})
                                }
                        ]
                },
		{
			label: i18n.t('electron.menuBar.view'),
			submenu: [
				{
					label: i18n.t('electron.menuBar.showStoryLibrary'),
					click: revealStoryDirectory
				},
				{type: 'separator'},
				{role: 'resetZoom'},
				{role: 'zoomIn'},
				{role: 'zoomOut'},
				{role: 'togglefullscreen'}
			]
		},
		{
			role: 'window',
			submenu: [{role: 'minimize'}, {role: 'close'}]
		},
		{
			role: 'help',
			submenu: [
				{
					label: i18n.t('electron.menuBar.twineHelp'),
					click: () => shell.openExternal('https://twinery.org/2guide')
				},
				{type: 'separator'},
				{
					label: i18n.t('electron.menuBar.troubleshooting'),
					submenu: [
						{
							label: i18n.t('electron.menuBar.disableHardwareAcceleration'),
							checked: !!getAppPref('disableHardwareAcceleration'),
							click: toggleHardwareAcceleration,
							type: 'checkbox'
						},
						{
							label: i18n.t('electron.menuBar.showDevTools'),
							click: () =>
								BrowserWindow.getFocusedWindow()?.webContents.openDevTools()
						}
					]
				}
			]
		}
	];

	if (process.platform === 'darwin') {
		const appMenu = template[0];
		const viewMenu = template.find(
			item => item.label === i18n.t('electron.menuBar.view')
		);
		const windowMenu = template.find(item => item.role === 'window');

		appMenu.submenu = [
			{role: 'about'},
			{
				label: i18n.t('electron.menuBar.checkForUpdates'),
				click: checkForUpdate
			},
			{
				label: i18n.t('electron.menuBar.setStoryLibraryFolder'),
				click: chooseStoryDirectoryPath
			},
			{type: 'separator'},
			{role: 'services', submenu: []},
			{type: 'separator'},
			{role: 'hide'},
			{role: 'hideOthers'},
			{role: 'unhide'},
			{type: 'separator'},
			{role: 'quit'}
		];

		if (viewMenu?.submenu) {
			(viewMenu.submenu as MenuItemConstructorOptions[]).push(
				{type: 'separator'},
				{
					label: i18n.t('electron.menuBar.speech'),
					submenu: [{role: 'startSpeaking'}, {role: 'stopSpeaking'}]
				}
			);
		}

		if (windowMenu) {
			windowMenu.submenu = [
				{role: 'close'},
				{role: 'minimize'},
				{role: 'zoom'},
				{type: 'separator'},
				{role: 'front'}
			];
		}
	}
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
