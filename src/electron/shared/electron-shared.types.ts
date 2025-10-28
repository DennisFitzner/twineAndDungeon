import {Story} from '../../store/stories/stories.types';

export interface TwineElectronWindow extends Window {
	twineElectron?: {
		createStoryPart(storyFolderName: string, partName: string): Promise<any>;
		deleteStory(story: Story): void;
		openFileDialog(
			options: Electron.OpenDialogOptions
		): Promise<Electron.OpenDialogReturnValue>;
		readFile(filePath: string): Promise<string>;
		getStoryFolderPath(story: Story): Promise<string>;
		scanStoryParts(storyFolderPath: string): Promise<
			Array<{
				path: string;
				name: string;
				relativePath: string;
				isDirectory: boolean;
			}>
		>;
		loadStoryPart(filePath: string): Promise<{
			htmlSource: string;
			mtime: Date;
			partName: string;
			storyFolderName: string;
			characters?: any;
		}>;
		loadPrefs(): Promise<any>;
		loadStories(): Promise<any>;
		loadStoryFormats(): Promise<any>;
		onceStoryRenamed(callback: () => void): void;
		openWithScratchFile(data: string, filename: string): void;
		renameStory(oldStory: Story, newStory: Story): void;
		saveStoryHtml(story: Story, data: string, filename?: string): void;
		saveJson(filename: string, data: any): void;
		onCreatePassageShortcut(callback: () => void): () => void;
		onCreateStoryPartShortcut(callback: () => void): () => void;
		onCopyPassagesShortcut(callback: () => void): () => void;
		onCutPassagesShortcut(callback: () => void): () => void;
		onPastePassagesShortcut(callback: () => void): () => void;
	};
}
