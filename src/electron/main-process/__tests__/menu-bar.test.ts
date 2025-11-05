import {initMenuBar} from '../menu-bar';
import {
	BrowserWindow,
	Menu,
	MenuItem,
	MenuItemConstructorOptions,
	shell
} from 'electron';
import {
	chooseStoryDirectoryPath,
	revealStoryDirectory
} from '../story-directory';
import {getAppPref} from '../app-prefs';
import {toggleHardwareAcceleration} from '../hardware-acceleration';

jest.mock('electron');
jest.mock('../app-prefs');
jest.mock('../hardware-acceleration');
jest.mock('../story-directory');

function hasItemWithRole(menu: MenuItemConstructorOptions, roleName: string) {
	return (
		menu.submenu &&
		(menu.submenu as MenuItemConstructorOptions[]).some(
			item => item.role === roleName
		)
	);
}

function expectSubmenu(
	menu: MenuItemConstructorOptions | undefined
): MenuItemConstructorOptions[] {
	expect(menu).toBeDefined();
	expect(menu?.submenu).toBeDefined();
	return menu!.submenu as MenuItemConstructorOptions[];
}

function findMenuItem(
        submenu: MenuItemConstructorOptions[],
        label: string
): MenuItemConstructorOptions {
        const item = submenu.find(menuItem => menuItem.label === label);
        expect(item).toBeDefined();
        return item as MenuItemConstructorOptions;
}

function findMenuItemByAccelerator(
        submenu: MenuItemConstructorOptions[],
        accelerator: string
): MenuItemConstructorOptions {
        const item = submenu.find(menuItem => menuItem.accelerator === accelerator);
        expect(item).toBeDefined();
        return item as MenuItemConstructorOptions;
}

function invokeClick(item: MenuItemConstructorOptions) {
        expect(item.click).toBeDefined();
        (item.click as (menuItem: MenuItem, browserWindow: BrowserWindow, event: any) => void)(
                {} as MenuItem,
                {} as BrowserWindow,
		{}
	);
}

describe('initMenuBar', () => {
	const chooseStoryDirectoryPathMock = chooseStoryDirectoryPath as jest.Mock;
	const getAppPrefMock = getAppPref as jest.Mock;
	const toggleHardwareAccelerationMock =
		toggleHardwareAcceleration as jest.Mock;
	let openDevToolsMock: jest.Mock;
	let sendAcceleratorMock: jest.Mock;
	const openExternalMock = shell.openExternal as jest.Mock;
	const revealStoryDirectoryMock = revealStoryDirectory as jest.Mock;
	let setApplicationMenuSpy: jest.SpyInstance;

	beforeEach(() => {
		getAppPrefMock.mockImplementation((name: string) => {
			if (name === 'disableHardwareAcceleration') {
				return undefined;
			}

			throw new Error(`Asked for a unmocked app pref: ${name}`);
		});
		setApplicationMenuSpy = jest.spyOn(Menu, 'setApplicationMenu');
		openDevToolsMock = jest.fn();
		sendAcceleratorMock = jest.fn();
		(BrowserWindow.getFocusedWindow as jest.Mock).mockReturnValue({
			webContents: {openDevTools: openDevToolsMock, send: sendAcceleratorMock}
		});
	});

	describe('on macOS', () => {
		let oldPlatform: NodeJS.Platform;
		let menuTemplate: MenuItemConstructorOptions[];

		beforeEach(() => {
			oldPlatform = process.platform;
			Object.defineProperty(process, 'platform', {value: 'darwin'});
			initMenuBar();
			menuTemplate = setApplicationMenuSpy.mock.calls[0][0];
		});

		afterAll(() => {
			Object.defineProperty(process, 'platform', {value: oldPlatform});
		});

		it('creates an application menu with standard menu items', () => {
			const menu1 = menuTemplate[0];

			expect(menu1.label).toBe('mock-electron-app-name');
			expect(hasItemWithRole(menu1, 'about')).toBe(true);
			expect(hasItemWithRole(menu1, 'services')).toBe(true);
			expect(hasItemWithRole(menu1, 'hide')).toBe(true);
			expect(hasItemWithRole(menu1, 'hideOthers')).toBe(true);
			expect(hasItemWithRole(menu1, 'unhide')).toBe(true);
			expect(hasItemWithRole(menu1, 'quit')).toBe(true);
		});

		it('creates an Edit menu with standard menu items', () => {
			const menu = menuTemplate.find(
				item => item.label === 'electron.menuBar.edit'
			);

			expect(menu?.label).toBe('electron.menuBar.edit');
			expect(menu).not.toBeUndefined();
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'undo')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'redo')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'cut')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'copy')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'paste')).toBe(
				true
			);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'delete')
			).toBe(true);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'selectAll')
			).toBe(true);
		});

		it('creates a View menu with standard menu items', () => {
			const menu = menuTemplate.find(
				item => item.label === 'electron.menuBar.view'
			);

			expect(menu?.label).toBe('electron.menuBar.view');
			expect(menu).not.toBeUndefined();
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'resetZoom')
			).toBe(true);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'zoomIn')
			).toBe(true);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'zoomOut')
			).toBe(true);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'togglefullscreen')
			).toBe(true);
		});

		it('creates a Story menu with shortcuts for passages and story parts', () => {
			const menu = menuTemplate.find(item => item.label === 'common.story');

			expect(menu?.label).toBe('common.story');
                        const submenu = expectSubmenu(menu);
                        const newPassage = findMenuItem(submenu, 'undoChange.newPassage');
                        const newStoryPart = findMenuItem(
                                submenu,
                                'storyPartTabs.createNewPart'
                        );

                        expect(newPassage?.accelerator).toBe('CmdOrCtrl+N');
                        invokeClick(newPassage);
                        expect(sendAcceleratorMock).toHaveBeenCalledWith('accelerator:new-passage');
                        sendAcceleratorMock.mockClear();

                        for (let index = 0; index < 9; index++) {
                                const shortcut = findMenuItemByAccelerator(
                                        submenu,
                                        `CmdOrCtrl+${index + 1}`
                                );

                                expect(shortcut?.label).toBe(
                                        'electron.menuBar.newPassageForCharacter'
                                );
                                invokeClick(shortcut);
                                expect(sendAcceleratorMock).toHaveBeenCalledWith(
                                        'accelerator:new-passage',
                                        {characterIndex: index}
                                );
                                sendAcceleratorMock.mockClear();
                        }

                        expect(newStoryPart?.accelerator).toBe('CmdOrCtrl+P');
                        invokeClick(newStoryPart);
                        expect(sendAcceleratorMock).toHaveBeenCalledWith(
                                'accelerator:new-story-part'
                        );
                        sendAcceleratorMock.mockClear();

                        const copyPassages = findMenuItem(submenu, 'common.copy');
                        expect(copyPassages?.accelerator).toBe('CmdOrCtrl+C');
                        invokeClick(copyPassages);
                        expect(sendAcceleratorMock).toHaveBeenCalledWith(
				'accelerator:copy-passages'
			);

			const cutPassages = findMenuItem(submenu, 'common.cut');
			expect(cutPassages?.accelerator).toBe('CmdOrCtrl+X');
			invokeClick(cutPassages);
			expect(sendAcceleratorMock).toHaveBeenCalledWith(
				'accelerator:cut-passages'
			);

			const pastePassages = findMenuItem(submenu, 'common.paste');
			expect(pastePassages?.accelerator).toBe('CmdOrCtrl+V');
			invokeClick(pastePassages);
			expect(sendAcceleratorMock).toHaveBeenCalledWith(
				'accelerator:paste-passages'
			);
		});

		it('adds a Set Story Library Folder menu item to the application menu', () => {
			const submenu = expectSubmenu(menuTemplate[0]);
			const item = findMenuItem(
				submenu,
				'electron.menuBar.setStoryLibraryFolder'
			);
			invokeClick(item);
			expect(chooseStoryDirectoryPathMock).toBeCalledTimes(1);
		});

		it('adds a Show Story Library menu item to the View menu', () => {
			const viewMenu = menuTemplate.find(
				item => item.label === 'electron.menuBar.view'
			);
			const item = findMenuItem(
				expectSubmenu(viewMenu),
				'electron.menuBar.showStoryLibrary'
			);
			invokeClick(item);
			expect(revealStoryDirectoryMock).toBeCalledTimes(1);
		});

		it('creates a Window menu with standard menu items', () => {
			const menu = menuTemplate.find(item => item.role === 'window');

			expect(menu?.role).toBe('window');
			expect(menu).not.toBeUndefined();
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'minimize')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'close')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'zoom')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'front')).toBe(
				true
			);
		});

		describe('creates a Help menu', () => {
			it('has a Twine Help menu item', () => {
				const menu = menuTemplate.find(item => item.role === 'help');

				expect(menu?.role).toBe('help');

				const item = findMenuItem(
					expectSubmenu(menu),
					'electron.menuBar.twineHelp'
				);
				invokeClick(item);
				expect(openExternalMock.mock.calls).toEqual([
					['https://twinery.org/2guide']
				]);
			});

			it('has a Show Debug Console menu item', () => {
				const menu = menuTemplate.find(item => item.role === 'help');
				const troubleshootingMenu = findMenuItem(
					expectSubmenu(menu),
					'electron.menuBar.troubleshooting'
				);
				const item = findMenuItem(
					expectSubmenu(troubleshootingMenu),
					'electron.menuBar.showDevTools'
				);
				invokeClick(item);
				expect(openDevToolsMock).toBeCalled();
			});

			describe('its Disable Hardware Acceleration menu item', () => {
				it('calls toggleHardwareAcceleration when clicked', () => {
					const menu = menuTemplate.find(item => item.role === 'help');
					const troubleshootingMenu = findMenuItem(
						expectSubmenu(menu),
						'electron.menuBar.troubleshooting'
					);
					const item = findMenuItem(
						expectSubmenu(troubleshootingMenu),
						'electron.menuBar.disableHardwareAcceleration'
					);
					invokeClick(item);
					expect(toggleHardwareAccelerationMock).toBeCalledTimes(1);
				});

				it('is unchecked if the pref is falsy', () => {
					const menu = menuTemplate.find(item => item.role === 'help');
					const troubleshootingMenu = findMenuItem(
						expectSubmenu(menu),
						'electron.menuBar.troubleshooting'
					);
					const item = findMenuItem(
						expectSubmenu(troubleshootingMenu),
						'electron.menuBar.disableHardwareAcceleration'
					);

					expect(item).not.toBeUndefined();
					expect(item.checked).toBe(false);
				});

				it('is checked if the pref is truthy', () => {
					getAppPrefMock.mockImplementation((name: string) => {
						if (name === 'disableHardwareAcceleration') {
							return 'true';
						}

						throw new Error(`Asked for a unmocked app pref: ${name}`);
					});
					setApplicationMenuSpy.mockClear();
					initMenuBar();
					menuTemplate = setApplicationMenuSpy.mock.calls[0][0];

					const menu = menuTemplate.find(item => item.role === 'help');
					const troubleshootingMenu = findMenuItem(
						expectSubmenu(menu),
						'electron.menuBar.troubleshooting'
					);
					const item = findMenuItem(
						expectSubmenu(troubleshootingMenu),
						'electron.menuBar.disableHardwareAcceleration'
					);

					expect(item).not.toBeUndefined();
					expect(item.checked).toBe(true);
				});
			});
		});
	});

	describe.each([
		['Linux', 'linux'],
		['Windows', 'win32']
	])('on %s', (_, platformValue) => {
		let oldPlatform: NodeJS.Platform;
		let menuTemplate: MenuItemConstructorOptions[];

		beforeEach(() => {
			oldPlatform = process.platform;
			Object.defineProperty(process, 'platform', {value: platformValue});
			initMenuBar();
			menuTemplate = setApplicationMenuSpy.mock.calls[0][0];
		});

		afterAll(() => {
			Object.defineProperty(process, 'platform', {value: oldPlatform});
		});

		it('creates an application menu with a quit menu item', () => {
			const menu1 = menuTemplate[0];

			expect(menu1.label).toBe('mock-electron-app-name');
			expect(hasItemWithRole(menu1, 'quit')).toBe(true);
		});

		it('creates an Edit menu with standard menu items', () => {
			const menu = menuTemplate.find(
				item => item.label === 'electron.menuBar.edit'
			);

			expect(menu?.label).toBe('electron.menuBar.edit');
			expect(menu).not.toBeUndefined();
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'undo')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'redo')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'cut')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'copy')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'paste')).toBe(
				true
			);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'delete')
			).toBe(true);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'selectAll')
			).toBe(true);
		});

		it('creates a View menu with standard menu items', () => {
			const menu = menuTemplate.find(
				item => item.label === 'electron.menuBar.view'
			);

			expect(menu?.label).toBe('electron.menuBar.view');
			expect(menu).not.toBeUndefined();
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'resetZoom')
			).toBe(true);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'zoomIn')
			).toBe(true);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'zoomOut')
			).toBe(true);
			expect(
				hasItemWithRole(menu as MenuItemConstructorOptions, 'togglefullscreen')
			).toBe(true);
		});

		it('creates a Story menu with shortcuts for passages and story parts', () => {
			const menu = menuTemplate.find(item => item.label === 'common.story');

			expect(menu?.label).toBe('common.story');
                        const submenu = expectSubmenu(menu);
                        const newPassage = findMenuItem(submenu, 'undoChange.newPassage');
                        const newStoryPart = findMenuItem(
                                submenu,
                                'storyPartTabs.createNewPart'
                        );

                        expect(newPassage?.accelerator).toBe('CmdOrCtrl+N');
                        invokeClick(newPassage);
                        expect(sendAcceleratorMock).toHaveBeenCalledWith('accelerator:new-passage');
                        sendAcceleratorMock.mockClear();

                        for (let index = 0; index < 9; index++) {
                                const shortcut = findMenuItemByAccelerator(
                                        submenu,
                                        `CmdOrCtrl+${index + 1}`
                                );

                                expect(shortcut?.label).toBe(
                                        'electron.menuBar.newPassageForCharacter'
                                );
                                invokeClick(shortcut);
                                expect(sendAcceleratorMock).toHaveBeenCalledWith(
                                        'accelerator:new-passage',
                                        {characterIndex: index}
                                );
                                sendAcceleratorMock.mockClear();
                        }

                        expect(newStoryPart?.accelerator).toBe('CmdOrCtrl+P');
                        invokeClick(newStoryPart);
                        expect(sendAcceleratorMock).toHaveBeenCalledWith(
                                'accelerator:new-story-part'
                        );
                        sendAcceleratorMock.mockClear();

                        const copyPassages = findMenuItem(submenu, 'common.copy');
                        expect(copyPassages?.accelerator).toBe('CmdOrCtrl+C');
                        invokeClick(copyPassages);
                        expect(sendAcceleratorMock).toHaveBeenCalledWith(
				'accelerator:copy-passages'
			);

			const cutPassages = findMenuItem(submenu, 'common.cut');
			expect(cutPassages?.accelerator).toBe('CmdOrCtrl+X');
			invokeClick(cutPassages);
			expect(sendAcceleratorMock).toHaveBeenCalledWith(
				'accelerator:cut-passages'
			);

			const pastePassages = findMenuItem(submenu, 'common.paste');
			expect(pastePassages?.accelerator).toBe('CmdOrCtrl+V');
			invokeClick(pastePassages);
			expect(sendAcceleratorMock).toHaveBeenCalledWith(
				'accelerator:paste-passages'
			);
		});

		it('adds a Set Story Library Folder menu item to the application menu', () => {
			const submenu = expectSubmenu(menuTemplate[0]);
			const item = findMenuItem(
				submenu,
				'electron.menuBar.setStoryLibraryFolder'
			);
			invokeClick(item);
			expect(chooseStoryDirectoryPathMock).toBeCalledTimes(1);
		});

		it('adds a Show Story Library menu item to the View menu', () => {
			const viewMenu = menuTemplate.find(
				item => item.label === 'electron.menuBar.view'
			);
			const item = findMenuItem(
				expectSubmenu(viewMenu),
				'electron.menuBar.showStoryLibrary'
			);
			invokeClick(item);
			expect(revealStoryDirectoryMock).toBeCalledTimes(1);
		});

		it('creates a Window menu with standard menu items', () => {
			const menu = menuTemplate.find(item => item.role === 'window');

			expect(menu?.role).toBe('window');
			expect(menu).not.toBeUndefined();
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'minimize')).toBe(
				true
			);
			expect(hasItemWithRole(menu as MenuItemConstructorOptions, 'close')).toBe(
				true
			);
		});

		describe('creates a Help menu', () => {
			it('has a Twine Help menu item', () => {
				const menu = menuTemplate.find(item => item.role === 'help');

				expect(menu?.role).toBe('help');

				const item = findMenuItem(
					expectSubmenu(menu),
					'electron.menuBar.twineHelp'
				);
				invokeClick(item);
				expect(openExternalMock.mock.calls).toEqual([
					['https://twinery.org/2guide']
				]);
			});

			it('has a Show Debug Console menu item', () => {
				const menu = menuTemplate.find(item => item.role === 'help');
				const troubleshootingMenu = findMenuItem(
					expectSubmenu(menu),
					'electron.menuBar.troubleshooting'
				);
				const item = findMenuItem(
					expectSubmenu(troubleshootingMenu),
					'electron.menuBar.showDevTools'
				);
				invokeClick(item);
				expect(openDevToolsMock).toBeCalled();
			});

			describe('its Disable Hardware Acceleration menu item', () => {
				it('calls toggleHardwareAcceleration when clicked', () => {
					const menu = menuTemplate.find(item => item.role === 'help');
					const troubleshootingMenu = findMenuItem(
						expectSubmenu(menu),
						'electron.menuBar.troubleshooting'
					);
					const item = findMenuItem(
						expectSubmenu(troubleshootingMenu),
						'electron.menuBar.disableHardwareAcceleration'
					);
					invokeClick(item);
					expect(toggleHardwareAccelerationMock).toBeCalledTimes(1);
				});

				it('is unchecked if the pref is falsy', () => {
					const menu = menuTemplate.find(item => item.role === 'help');
					const troubleshootingMenu = findMenuItem(
						expectSubmenu(menu),
						'electron.menuBar.troubleshooting'
					);
					const item = findMenuItem(
						expectSubmenu(troubleshootingMenu),
						'electron.menuBar.disableHardwareAcceleration'
					);
					expect(item.checked).toBe(false);
				});

				it('is checked if the pref is truthy', () => {
					getAppPrefMock.mockImplementation((name: string) => {
						if (name === 'disableHardwareAcceleration') {
							return 'true';
						}

						throw new Error(`Asked for a unmocked app pref: ${name}`);
					});
					setApplicationMenuSpy.mockClear();
					initMenuBar();
					menuTemplate = setApplicationMenuSpy.mock.calls[0][0];

					const menu = menuTemplate.find(item => item.role === 'help');
					const troubleshootingMenu = findMenuItem(
						expectSubmenu(menu),
						'electron.menuBar.troubleshooting'
					);
					const item = findMenuItem(
						expectSubmenu(troubleshootingMenu),
						'electron.menuBar.disableHardwareAcceleration'
					);
					expect(item.checked).toBe(true);
				});
			});
		});
	});
});
