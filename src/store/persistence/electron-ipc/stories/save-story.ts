import {TwineElectronWindow} from '../../../../electron/shared';
import {Story} from '../../../stories';
import {publishStory, publishStoryWithFormat} from '../../../../util/publish';
import {
	formatWithNameAndVersion,
	StoryFormatsState
} from '../../../story-formats';
import {getAppInfo} from '../../../../util/app-info';
import {fetchStoryFormatProperties} from '../../../../util/story-format/fetch-properties';

/**
 * Sends an IPC message to save a story to disk, ideally in published form.
 */
export async function saveStory(story: Story, formats: StoryFormatsState) {
	const {twineElectron} = window as TwineElectronWindow;

	if (!twineElectron) {
		throw new Error('Electron bridge is not present on window.');
	}

	try {
		const format = formatWithNameAndVersion(
			formats,
			story.storyFormat,
			story.storyFormatVersion
		);

		let publishedHtml: string;
		if (format.loadState === 'loaded') {
			publishedHtml = publishStoryWithFormat(
				story,
				format.properties.source,
				getAppInfo(),
				{
					startOptional: true
				}
			);
		} else {
			const {source} = await fetchStoryFormatProperties(format.url);
			publishedHtml = publishStoryWithFormat(story, source, getAppInfo(), {
				startOptional: true
			});
		}

		// Use part filename if this is a story part
		const filename = story.partName ? `${story.partName}.html` : undefined;
		twineElectron.saveStoryHtml(story, publishedHtml, filename);
	} catch (error) {
		console.warn(
			`Could not save full story (${
				(error as Error).message
			}). Trying to save story data only.`
		);
		const filename = story.partName ? `${story.partName}.html` : undefined;
		twineElectron.saveStoryHtml(
			story,
			publishStory(story, getAppInfo(), {startOptional: true}),
			filename
		);
	}
}
