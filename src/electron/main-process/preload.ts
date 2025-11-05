// Exposes a limited set of Electron modules to a renderer process. Because the
// renderer processes load remote content (e.g. story formats), they must be
// isolated.
//
// For now, we cannot use context isolation here because of jsonp. For jsonp
// loading to work, it expects a global property to be set--but because it
// crosses a context boundary, that global is in the wrong place. For now, we
// place a privileged jsonp function into renderer context.

import {contextBridge, ipcRenderer} from 'electron';
import {Story} from '../../store/stories/stories.types';

contextBridge.exposeInMainWorld('twineElectron', {
	createStoryPart(storyFolderName: string, partName: string) {
		return ipcRenderer.invoke('create-story-part', storyFolderName, partName);
	},
	openFileDialog(options: Electron.OpenDialogOptions) {
		return ipcRenderer.invoke('open-file-dialog', options);
	},
	readFile(filePath: string) {
		return ipcRenderer.invoke('read-file', filePath);
	},
	getStoryFolderPath(story: Story) {
		return ipcRenderer.invoke('get-story-folder-path', story);
	},
	scanStoryParts(storyFolderPath: string) {
		return ipcRenderer.invoke('scan-story-parts', storyFolderPath);
	},
	loadStoryPart(filePath: string) {
		return ipcRenderer.invoke('load-story-part', filePath);
	},
	deleteStory(story: Story) {
		ipcRenderer.send('delete-story', story);
	},
	loadPrefs() {
		return ipcRenderer.invoke('load-prefs');
	},
        loadStories() {
                return ipcRenderer.invoke('load-stories');
        },
        loadCharacters(story: Story) {
                return ipcRenderer.invoke('load-characters', story);
        },
        loadStoryFormats() {
                return ipcRenderer.invoke('load-story-formats');
        },
	onceStoryRenamed(callback: () => void): void {
		ipcRenderer.once('story-renamed', callback);
	},
	openWithScratchFile(data: string, filename: string) {
		ipcRenderer.send('open-with-scratch-file', data, filename);
	},
	renameStory(oldStory: Story, newStory: Story) {
		ipcRenderer.send('rename-story', oldStory, newStory);
	},
	saveJson(filename: string, data: any) {
		ipcRenderer.send('save-json', filename, data);
	},
	saveStoryHtml(story: Story, data: string, filename?: string) {
		ipcRenderer.send('save-story-html', story, data, filename);
	},
	onCreatePassageShortcut(callback: () => void) {
		const listener = () => callback();
		ipcRenderer.on('accelerator:new-passage', listener);
		return () => ipcRenderer.removeListener('accelerator:new-passage', listener);
	},
	onCreateStoryPartShortcut(callback: () => void) {
		const listener = () => callback();
		ipcRenderer.on('accelerator:new-story-part', listener);
		return () =>
			ipcRenderer.removeListener('accelerator:new-story-part', listener);
	},
	onCopyPassagesShortcut(callback: () => void) {
		const listener = () => callback();
		ipcRenderer.on('accelerator:copy-passages', listener);
		return () => ipcRenderer.removeListener('accelerator:copy-passages', listener);
	},
	onCutPassagesShortcut(callback: () => void) {
		const listener = () => callback();
		ipcRenderer.on('accelerator:cut-passages', listener);
		return () => ipcRenderer.removeListener('accelerator:cut-passages', listener);
	},
	onPastePassagesShortcut(callback: () => void) {
		const listener = () => callback();
		ipcRenderer.on('accelerator:paste-passages', listener);
		return () =>
			ipcRenderer.removeListener('accelerator:paste-passages', listener);
	}
});
