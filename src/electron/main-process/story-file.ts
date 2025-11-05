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
import {basename, isAbsolute, join} from 'path';
import {pathToFileURL} from 'url';
import {v4 as uuid} from '@lukeed/uuid';
import {i18n} from './locales';
import {getStoryDirectoryPath} from './story-directory';
import {Story} from '../../store/stories/stories.types';
// import {storyFileName} from '../shared/story-filename'; // No longer needed with folder-based storage

/**
 * Returns the folder path for a story based on its title.
 */
export function getStoryFolderPath(story: Story) {
	// For story parts, use the storyFolderName if it exists
	const folderName = story.storyFolderName || story.name;
	return join(getStoryDirectoryPath(), folderName);
}

/**
 * Returns the HTML file path for a story inside its folder.
 */
function getStoryHtmlPath(story: Story) {
	return join(getStoryFolderPath(story), `${story.name}.html`);
}

/**
 * Returns the HTML file path for a story part inside its folder.
 */
function getStoryPartPath(storyFolderName: string, partName: string) {
	return join(getStoryDirectoryPath(), storyFolderName, `${partName}.html`);
}

import {
	stopTrackingFile,
	fileWasTouched,
	wasFileChangedExternally
} from './track-file-changes';

export interface StoryFile {
	htmlSource: string;
	mtime: Date;
	characters?: Character[];
	partName?: string;
	storyFolderName?: string;
}

export interface Character {
        id: string;
        name: string;
        color?: string;
        image?: string;
}

function isValidUrl(value: string) {
        try {
                // eslint-disable-next-line no-new
                new URL(value);
                return true;
        } catch (error) {
                return false;
        }
}

async function normalizeCharacterImage(
        character: Character,
        folderPath: string
): Promise<Character> {
        if (!character.image || isValidUrl(character.image)) {
                return character;
        }

        const resolvedPath = isAbsolute(character.image)
                ? character.image
                : join(folderPath, character.image);

        const fileUrl = pathToFileURL(resolvedPath);

        try {
                const {mtimeMs} = await stat(resolvedPath);
                fileUrl.searchParams.set('mtime', Math.round(mtimeMs).toString());
        } catch (error) {
                console.warn(
                        `Failed to read metadata for character image ${resolvedPath}:`,
                        error
                );
                fileUrl.searchParams.set('mtime', Date.now().toString());
        }

        return {
                ...character,
                image: fileUrl.toString()
        };
}

export async function loadCharactersFromFolder(
        folderPath: string
): Promise<Character[] | undefined> {
        const charactersFilePath = join(folderPath, 'characters.json');

        try {
                const charactersStats = await stat(charactersFilePath);
                if (charactersStats.isDirectory()) {
                        return undefined;
                }
        } catch (error) {
                const err = error as NodeJS.ErrnoException;
                if (err.code === 'ENOENT') {
                        return undefined;
                }
                console.error(`Failed to access characters.json in ${folderPath}:`, error);
                return undefined;
        }

        try {
                const charactersContent = await readFile(charactersFilePath, 'utf8');
                const parsed = JSON.parse(charactersContent) as Character[];
                const normalized = await Promise.all(
                        parsed.map(character => normalizeCharacterImage(character, folderPath))
                );
                return normalized;
        } catch (error) {
                console.error(`Failed to load characters.json from ${charactersFilePath}:`, error);
                return undefined;
        }
}

/**
 * Returns a promise resolving to an array of HTML strings to load from the
 * story directory. Each string corresponds to an individual story part.
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
                                        const characters = await loadCharactersFromFolder(folderPath);

					// Look for all HTML files in the folder
					const folderFiles = await readdir(folderPath);
					const htmlFiles = folderFiles.filter(file => file.endsWith('.html'));

					for (const htmlFile of htmlFiles) {
						const htmlFilePath = join(folderPath, htmlFile);
						const htmlStats = await stat(htmlFilePath);

						if (!htmlStats.isDirectory()) {
							const partName = htmlFile.replace('.html', '');
							const storyFile: StoryFile = {
								mtime: htmlStats.mtime,
								htmlSource: await readFile(htmlFilePath, 'utf8'),
								partName,
								storyFolderName: f,
								characters
							};

							result.push(storyFile);
							fileWasTouched(htmlFilePath);
						}
					}
				}
			} catch (error) {
				// Skip folders that don't contain any HTML files
				console.warn(
					`Story folder ${f} does not contain any HTML files, skipping`
				);
			}
		})
	);

	return result;
}

/**
 * Saves story HTML to the file system. This returns a promise that resolves
 * when complete.
 */
export async function saveStoryHtml(
	story: Story,
	storyHtml: string,
	filename?: string
) {
	// We save to a temp file first, then overwrite the existing if that succeeds,
	// so that if any step fails, the original file is left intact.

	const storyFolderPath = getStoryFolderPath(story);
	const savedFilePath = filename
		? join(storyFolderPath, filename)
		: getStoryHtmlPath(story);

	console.log(`Saving ${savedFilePath}`);

	try {
		// Create the story folder if it doesn't exist
		await mkdirp(storyFolderPath);

		const tempFileDirectory = await mkdtemp(
			join(app.getPath('temp'), `twine-${story.id}`)
		);
		const tempFilePath = join(
			tempFileDirectory,
			filename || `${story.name}.html`
		);

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

/**
 * Creates a new story part HTML file in an existing story folder.
 */
export async function createStoryPart(
	storyFolderName: string,
	partName: string
) {
	try {
		const storyFolderPath = join(getStoryDirectoryPath(), storyFolderName);
		const partFilePath = getStoryPartPath(storyFolderName, partName);

		// Check if the story folder exists
		const folderStats = await stat(storyFolderPath);
		if (!folderStats.isDirectory()) {
			throw new Error(`Story folder ${storyFolderName} does not exist`);
		}

		// Check if the part already exists
		try {
			await stat(partFilePath);
			throw new Error(`Story part ${partName} already exists`);
		} catch (error) {
			// File doesn't exist, which is what we want
		}

		// Create a proper Twine story structure
		const ifid = uuid().toUpperCase();

		// Create a proper Twine story HTML with story data
		const storyHtml = `<!DOCTYPE html>
<html>
<head>
	<title>${partName}</title>
</head>
<body>
	<tw-storydata name="${partName}" startnode="1" creator="Twine" creator-version="2.10.0" format="Harlowe" format-version="3.3.9" ifid="${ifid}" options="" tags="" zoom="1" hidden>
		<tw-passagedata pid="1" name="Start" tags="" position="100,100" size="100,100">Welcome to ${partName}!

[[Continue|Continue]]</tw-passagedata>
		<tw-passagedata pid="2" name="Continue" tags="" position="300,100" size="100,100">This is the beginning of your story part.

[[Back to Start|Start]]</tw-passagedata>
	</tw-storydata>
</body>
</html>`;

		await writeFile(partFilePath, storyHtml, 'utf8');
		await fileWasTouched(partFilePath);
		console.log(`Successfully created story part ${partFilePath}`);
	} catch (e) {
		console.error(`Error while creating story part: ${e}`);
		throw e;
	}
}

