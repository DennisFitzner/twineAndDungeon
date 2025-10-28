import {app, dialog, ipcMain} from 'electron';
import debounce from 'lodash/debounce';
import type {DebouncedFunc} from 'lodash';
import {i18n} from './locales';
import {saveJsonFile} from './json-file';
import {
	createStoryPart,
	deleteStory,
	loadStories,
	renameStory,
	saveStoryHtml
} from './story-file';
import {Story} from '../../store/stories/stories.types';
import {readFile} from 'fs-extra';
import {loadStoryFormats} from './story-formats';
import {loadPrefs} from './prefs';
import {openWithScratchFile} from './scratch-file';

export function initIpc() {
	// We want to debounce story saves so we aren't constantly writing to disk.
	// However, we need to have individual debounced functions per story so that
	// saves on multiple stories in one interval aren't lost. So we maintain a set
	// of debounced functions keyed by story ID.
	//
	// These still take an argument because the individual invocations will see a
	// different story object each time.

	const storySavers: Record<
		string,
		DebouncedFunc<
			(
				event: any,
				story: Story,
				storyHtml: string,
				filename?: string
			) => Promise<void>
		>
	> = {};

	ipcMain.on('delete-story', async (event, story) => {
		try {
			await deleteStory(story);
			event.sender.send('story-deleted', story);
		} catch (error) {
			dialog.showErrorBox(
				i18n.t('electron.errors.storyDelete'),
				(error as Error).message
			);
			throw error;
		}
	});

	// These use handle() so that they can return data to the renderer process.

	ipcMain.handle('load-prefs', async () => {
		try {
			return await loadPrefs();
		} catch (error) {
			console.warn(`Could not load prefs, returning empty object: ${error}`);
			return {};
		}
	});

	ipcMain.handle('load-stories', loadStories);

	ipcMain.handle('load-story-formats', async () => {
		try {
			return await loadStoryFormats();
		} catch (error) {
			console.warn(
				`Could not load story formats, returning empty array: ${error}`
			);
			return [];
		}
	});

	ipcMain.handle(
		'create-story-part',
		async (event, storyFolderName: string, partName: string) => {
			try {
				await createStoryPart(storyFolderName, partName);
				return {success: true};
			} catch (error) {
				console.error(`Error creating story part: ${error}`);
				throw error;
			}
		}
	);

	ipcMain.handle(
		'open-file-dialog',
		async (event, options: Electron.OpenDialogOptions) => {
			const result = await dialog.showOpenDialog(options);
			return result;
		}
	);

	ipcMain.handle('read-file', async (event, filePath: string) => {
		try {
			const content = await readFile(filePath, 'utf8');
			return content;
		} catch (error) {
			throw new Error(
				`Failed to read file ${filePath}: ${(error as Error).message}`
			);
		}
	});

	ipcMain.handle('get-story-folder-path', async (event, story: Story) => {
		try {
			const {getStoryFolderPath} = await import('./story-file');
			return getStoryFolderPath(story);
		} catch (error) {
			throw new Error(
				`Failed to get story folder path: ${(error as Error).message}`
			);
		}
	});

	ipcMain.handle('scan-story-parts', async (event, storyFolderPath: string) => {
		try {
			const {readdir, stat} = await import('fs-extra');
			const {join, relative} = await import('path');

			const parts: Array<{
				path: string;
				name: string;
				relativePath: string;
				isDirectory: boolean;
			}> = [];

			const scanDirectory = async (dirPath: string, relativeTo: string) => {
				const entries = await readdir(dirPath);

				for (const entry of entries) {
					const fullPath = join(dirPath, entry);
					const stats = await stat(fullPath);
					const relativePath = relative(relativeTo, fullPath);

					if (stats.isDirectory()) {
						// Recursively scan subdirectories
						await scanDirectory(fullPath, relativeTo);
					} else if (entry.endsWith('.html')) {
						parts.push({
							path: fullPath,
							name: entry,
							relativePath: relativePath,
							isDirectory: false
						});
					}
				}
			};

			await scanDirectory(storyFolderPath, storyFolderPath);
			return parts;
		} catch (error) {
			throw new Error(
				`Failed to scan story parts: ${(error as Error).message}`
			);
		}
	});

	ipcMain.on(
		'open-with-scratch-file',
		(event, data: string, filename: string) => {
			openWithScratchFile(data, filename);
		}
	);

	// This doesn't use handle() because state reducers in the renderer process
	// can't be be asynchronous--we have to send a signal back.

	ipcMain.on('rename-story', async (event, oldStory, newStory) => {
		try {
			await renameStory(oldStory, newStory);
			event.sender.send('story-renamed', oldStory, newStory);
		} catch (error) {
			dialog.showErrorBox(
				i18n.t('electron.errors.storyRename'),
				(error as Error).message
			);
			throw error;
		}
	});

	ipcMain.on('save-json', async (event, filename: string, data: any) => {
		try {
			await saveJsonFile(filename, data);
		} catch (error) {
			dialog.showErrorBox(
				i18n.t('electron.errors.jsonSave'),
				(error as Error).message
			);
			throw error;
		}
	});

	ipcMain.on('save-story-html', async (event, story, storyHtml, filename?) => {
		try {
			if (typeof storyHtml !== 'string') {
				throw new Error('Asked to save non-string as story HTML');
			}

			if (storyHtml.trim() === '') {
				throw new Error('Asked to save empty string as story HTML');
			}

			if (!storySavers[story.id]) {
				storySavers[story.id] = debounce(
					async (
						saverEvent: any,
						saverStory: Story,
						saverStoryHtml: string,
						saverFilename?: string
					) => {
						try {
							await saveStoryHtml(saverStory, saverStoryHtml, saverFilename);
							saverEvent.sender.send('story-html-saved', saverStory);
						} catch (error) {
							dialog.showErrorBox(
								i18n.t('electron.errors.storySave'),
								(error as Error).message
							);
							throw error;
						}
					},
					1000,
					{leading: true, trailing: true}
				);
			}

			storySavers[story.id](event, story, storyHtml, filename);
		} catch (error) {
			dialog.showErrorBox(
				i18n.t('electron.errors.storySave'),
				(error as Error).message
			);
			throw error;
		}
	});

	app.on('will-quit', async () => {
		if (Object.keys(storySavers).length > 0) {
			// Flush all pending story saves.

			for (const storyId of Object.keys(storySavers)) {
				console.log(`Flushing pending story saves for story ID ${storyId}`);
				await storySavers[storyId].flush();
			}

			console.log('All pending story saves flushed successfully');
		} else {
			console.log('No pending story saves to flush');
		}
	});
}
