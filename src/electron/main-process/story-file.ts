import {app, dialog, shell} from 'electron';
import {
	mkdirp,
	mkdtemp,
	move,
	readdir,
	readFile,
	rename,
	stat,
	writeFile
} from 'fs-extra';
import {basename, join} from 'path';
import {i18n} from './locales';
import {getStoryDirectoryPath} from './story-directory';
import {Story} from '../../store/stories/stories.types';
// import {storyFileName} from '../shared/story-filename'; // No longer needed with folder-based storage

/**
 * Returns the folder path for a story based on its title.
 */
function getStoryFolderPath(story: Story) {
	return join(getStoryDirectoryPath(), story.name);
}

/**
 * Returns the HTML file path for a story inside its folder.
 */
function getStoryHtmlPath(story: Story) {
	return join(getStoryFolderPath(story), `${story.name}.html`);
}

import {
	stopTrackingFile,
	fileWasTouched,
	wasFileChangedExternally
} from './track-file-changes';

export interface StoryFile {
	htmlSource: string;
	mtime: Date;
}

/**
 * Returns a promise resolving to an array of HTML strings to load from the
 * story directory. Each string corresponds to an individual story.
 */
export async function loadStories() {
	const storyPath = getStoryDirectoryPath();
	const result: StoryFile[] = [];
	const files = await readdir(storyPath);

	await Promise.all(
		files.map(async f => {
			const folderPath = join(storyPath, f);

			try {
				const folderStats = await stat(folderPath);
				if (folderStats.isDirectory()) {
					const htmlFilePath = join(folderPath, `${f}.html`);
					const htmlStats = await stat(htmlFilePath);

					if (!htmlStats.isDirectory()) {
						result.push({
							mtime: htmlStats.mtime,
							htmlSource: await readFile(htmlFilePath, 'utf8')
						});
						return fileWasTouched(htmlFilePath);
					}
				}
			} catch (error) {
				// Skip folders that don't contain the expected HTML file
				console.warn(`Story folder ${f} does not contain ${f}.html, skipping`);
			}
		})
	);

	return result;
}

/**
 * Saves story HTML to the file system. This returns a promise that resolves
 * when complete.
 */
export async function saveStoryHtml(story: Story, storyHtml: string) {
	// We save to a temp file first, then overwrite the existing if that succeeds,
	// so that if any step fails, the original file is left intact.

	const storyFolderPath = getStoryFolderPath(story);
	const savedFilePath = getStoryHtmlPath(story);

	console.log(`Saving ${savedFilePath}`);

	try {
		// Create the story folder if it doesn't exist
		await mkdirp(storyFolderPath);

		const tempFileDirectory = await mkdtemp(
			join(app.getPath('temp'), `twine-${story.id}`)
		);
		const tempFilePath = join(tempFileDirectory, `${story.name}.html`);

		if (await wasFileChangedExternally(savedFilePath)) {
			const {response} = await dialog.showMessageBox({
				buttons: [
					i18n.t('electron.errors.storyFileChangedExternally.overwriteChoice'),
					i18n.t('electron.errors.storyFileChangedExternally.relaunchChoice')
				],
				detail: i18n.t('electron.errors.storyFileChangedExternally.detail'),
				message: i18n.t('electron.errors.storyFileChangedExternally.message', {
					fileName: basename(savedFilePath)
				}),
				type: 'warning'
			});

			if (response === 1) {
				app.relaunch();
				app.quit();
				return;
			}
		}

		await writeFile(tempFilePath, storyHtml, 'utf8');
		await move(tempFilePath, savedFilePath, {
			overwrite: true
		});
		await fileWasTouched(savedFilePath);
		console.log(`Successfully saved ${savedFilePath}`);
	} catch (e) {
		console.error(`Error while saving ${savedFilePath}: ${e}`);
		throw e;
	}
}

/**
 * Deletes a story by moving it to the trash. This returns a promise that resolves
 * when finished.
 */
export async function deleteStory(story: Story) {
	try {
		const deletedFolderPath = getStoryFolderPath(story);

		console.log(`Trashing ${deletedFolderPath}`);
		await shell.trashItem(deletedFolderPath);
		stopTrackingFile(deletedFolderPath);
		console.log(`Successfully trashed ${deletedFolderPath}`);
	} catch (e) {
		console.warn(`Error while deleting story: ${e}`);
		throw e;
	}
}

/**
 * Renames a story in the file system. This returns a promise that resolves when
 * finished.
 */
export async function renameStory(oldStory: Story, newStory: Story) {
	try {
		const oldStoryFolderPath = getStoryFolderPath(oldStory);
		const newStoryFolderPath = getStoryFolderPath(newStory);

		console.log(`Renaming ${oldStoryFolderPath} to ${newStoryFolderPath}`);
		await rename(oldStoryFolderPath, newStoryFolderPath);
		stopTrackingFile(oldStoryFolderPath);
		await fileWasTouched(newStoryFolderPath);
		console.log(
			`Successfully renamed ${oldStoryFolderPath} to ${newStoryFolderPath}`
		);
	} catch (e) {
		console.warn(`Error while renaming story: ${e}`);
		throw e;
	}
}
