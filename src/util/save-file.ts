import {saveAs} from 'file-saver';

/**
 * Saves text to an HTML file. This works in either a browser or Electron
 * context.
 */
export function saveHtml(source: string, filename: string) {
	const data = new Blob([source], {type: 'text/html;charset=utf-8'});

	saveAs(data, filename);
}

/**
 * Saves text to a Twee file. This works in either a browser or Electron
 * context.
 */
export function saveTwee(source: string, filename: string) {
	const data = new Blob([source], {type: 'text/plain;charset=utf-8'});

	saveAs(data, filename);
}

/**
 * Saves multiple Twee files. This works in either a browser or Electron
 * context.
 */
export function saveTweeMultiple(
	files: Array<{content: string; filename: string}>
) {
	files.forEach(file => {
		saveTwee(file.content, file.filename);
	});
}

/**
 * Saves multiple Twee files as a zip archive with folder structure.
 * This works in either a browser or Electron context.
 */
export async function saveTweeZip(
	files: Array<{content: string; filename: string}>,
	folderName: string
) {
	// Dynamic import to avoid bundling JSZip in the main bundle
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	// Create a folder in the zip
	const folder = zip.folder(folderName);

	// Add each file to the folder
	files.forEach(file => {
		folder?.file(file.filename, file.content);
	});

	// Generate the zip file
	const zipBlob = await zip.generateAsync({type: 'blob'});

	// Save the zip file
	const data = new Blob([zipBlob], {type: 'application/zip'});
	saveAs(data, `${folderName}-parts.zip`);
}
