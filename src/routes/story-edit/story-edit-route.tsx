import * as React from 'react';
import {useParams} from 'react-router-dom';
import {MainContent} from '../../components/container/main-content';
import {DocumentTitle} from '../../components/document-title/document-title';
import {DialogsContextProvider} from '../../dialogs';
import {storyWithId} from '../../store/stories';
import {
	UndoableStoriesContextProvider,
	useUndoableStoriesContext
} from '../../store/undoable-stories';
import {TwineElectronWindow} from '../../electron/shared';
import {useDialogsContext} from '../../dialogs';
import {StoryPartsBrowser} from '../../dialogs/story-parts-browser';
import {MarqueeablePassageMap} from './marqueeable-passage-map';
import {PassageFuzzyFinder} from './passage-fuzzy-finder';
import {StoryEditToolbar} from './toolbar';
import {useInitialPassageCreation} from './use-initial-passage-creation';
import {usePassageChangeHandlers} from './use-passage-change-handlers';
import {useViewCenter} from './use-view-center';
import {useZoomShortcuts} from './use-zoom-shortcuts';
import {useZoomTransition} from './use-zoom-transition';
import {onNavigateTo} from '../../store/navigation-events';
import {parseLinks, parseCrossPartLinkTarget} from '../../util/parse-links';
import './story-edit-route.css';

export const InnerStoryEditRoute: React.FC = () => {
	const {storyId} = useParams<{storyId: string}>();
	const {stories, dispatch} = useUndoableStoriesContext();
	const story = storyWithId(stories, storyId);
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const [fuzzyFinderOpen, setFuzzyFinderOpen] = React.useState(false);
	const [activePartId, setActivePartId] = React.useState(storyId);
	const [closedParts, setClosedParts] = React.useState<Set<string>>(new Set());
	const mainContent = React.useRef<HTMLDivElement>(null);

	// Get all story parts for the current story folder
	const storyParts = React.useMemo(() => {
		// For existing stories without storyFolderName, use the story name as folder name
		const folderName = story.storyFolderName || story.name;

		// Update the current story with the folder name if it doesn't have one
		if (!story.storyFolderName) {
			story.storyFolderName = folderName;
		}

		const parts = stories
			.filter(s => {
				const sFolderName = s.storyFolderName || s.name;
				return sFolderName === folderName;
			})
			.filter(part => !closedParts.has(part.id));

		return parts;
	}, [stories, story.storyFolderName, story, closedParts]);

	// Get the currently active story part
	const activeStory = React.useMemo(() => {
		return (
			storyParts.find(part => part.id === activePartId) ||
			storyParts[0] ||
			story
		);
	}, [storyParts, activePartId, story]);

	// Generate backlink cards automatically when cross-part links are detected
	React.useEffect(() => {
		// Only run this effect when storyParts change, not when activeStory.passages change
		// to prevent infinite loops
		const backlinkCardsToCreate: Array<{
			name: string;
			text: string;
			left: number;
			top: number;
			tags: string[];
		}> = [];

		// Scan all other story parts for cross-part links that point to the current story
		storyParts.forEach(otherStory => {
			if (otherStory.id === activeStory.id) return; // Skip current story

			otherStory.passages.forEach(otherPassage => {
				const links = parseLinks(otherPassage.text);
				links.forEach(linkText => {
					const crossPartTarget = parseCrossPartLinkTarget(`[[${linkText}]]`);
					if (crossPartTarget && crossPartTarget.part) {
						// Check if this link points to the current story
						const currentStoryName = activeStory.partName || activeStory.name;
						if (
							crossPartTarget.part.toLowerCase() ===
							currentStoryName.toLowerCase()
						) {
							// Find the target passage in the current story
							const targetPassage = activeStory.passages.find(
								p =>
									p.name.toLowerCase() === crossPartTarget.passage.toLowerCase()
							);

							if (targetPassage) {
								// Check if backlink card already exists
								const backlinkName = `← ${targetPassage.name}`;
								const existingBacklink = activeStory.passages.find(
									p => p.name === backlinkName
								);

								if (!existingBacklink) {
									// Queue backlink card for creation in the current story
									backlinkCardsToCreate.push({
										name: backlinkName,
										text: `Back-reference from ${
											otherStory.partName || otherStory.name
										}:${otherPassage.name}`,
										left: targetPassage.left + 200,
										top: targetPassage.top + 100,
										tags: [
											'backlink',
											`source-story:${otherStory.id}`,
											`source-passage:${otherPassage.id}`
										]
									});
								}
							}
						}
					}
				});
			});
		});

		// Create all backlink cards at once
		if (backlinkCardsToCreate.length > 0) {
			console.log('Creating backlink cards:', backlinkCardsToCreate);
			dispatch({
				type: 'createPassages',
				storyId: activeStory.id,
				props: backlinkCardsToCreate
			});
		} else {
			console.log('No backlink cards to create');
		}
	}, [storyParts, dispatch]); // Removed activeStory from dependencies

	// Log all passages to see if interlink cards are being created
	React.useEffect(() => {
		const interlinkCards = activeStory.passages.filter(p =>
			p.tags.includes('interlink')
		);
		const backlinkCards = activeStory.passages.filter(p =>
			p.name.startsWith('← ')
		);
		console.log('Total passages:', activeStory.passages.length);
		console.log(
			'Interlink cards found:',
			interlinkCards.length,
			interlinkCards
		);
		console.log('Backlink cards found:', backlinkCards.length, backlinkCards);
	}, [activeStory.passages]);

	// Custom connection parser that handles cross-part links and back-references
	const crossPartConnectionParser = React.useCallback(
		(text: string) => {
			// Handle backlink cards - they should connect to the passage they reference
			if (text.includes('Back-reference from')) {
				// Extract the original passage name from the back-reference text
				const originalPassageName = text.match(
					/Back-reference from .*:(\w+)/
				)?.[1];
				if (originalPassageName) {
					return [originalPassageName];
				}
			}

			// Handle regular cross-part links in passage text
			const links = parseLinks(text, true);
			const crossPartLinks: string[] = [];

			links.forEach(linkText => {
				const crossPartTarget = parseCrossPartLinkTarget(`[[${linkText}]]`);
				if (crossPartTarget && crossPartTarget.part) {
					// This is a cross-part link, we need to find the reference passage
					const targetStory = storyParts.find(
						s =>
							(s.partName || s.name).toLowerCase() ===
							crossPartTarget.part!.toLowerCase()
					);

					if (targetStory) {
						const targetPassage = targetStory.passages.find(
							p =>
								p.name.toLowerCase() === crossPartTarget.passage.toLowerCase()
						);

						if (targetPassage) {
							// Return the target passage name so it can be found in the combined passages array
							crossPartLinks.push(targetPassage.name);
						}
					}
				} else {
					// Regular local link
					crossPartLinks.push(linkText);
				}
			});

			return crossPartLinks;
		},
		[storyParts]
	);

	const {getCenter, setCenter} = useViewCenter(activeStory, mainContent);
	const {
		handleDeselectPassage,
		handleDragPassages,
		handleEditPassage,
		handleSelectPassage,
		handleSelectRect
	} = usePassageChangeHandlers(activeStory);

	const visibleZoom = useZoomTransition(activeStory.zoom, mainContent.current);

	useZoomShortcuts(activeStory);
	useInitialPassageCreation(activeStory, getCenter);

	// Cross-part navigation subscription
	React.useEffect(() => {
		const unsubscribe = onNavigateTo(
			(targetPartId, targetPassageId, options) => {
				// Handle both story IDs and story part names
				let targetStory;
				if (targetPartId) {
					// Try to find by ID first
					targetStory = storyParts.find(p => p.id === targetPartId);
					if (!targetStory) {
						// If not found by ID, try to find by part name
						targetStory = storyParts.find(
							p =>
								(p.partName || p.name).toLowerCase() ===
								targetPartId.toLowerCase()
						);
					}
				}

				if (!targetStory) return;

				// Switch tab if needed
				if (targetStory.id !== activePartId) {
					setActivePartId(targetStory.id);
				}

				if (targetPassageId) {
					// If we already know the passage id, select and center it
					const targetPassage = targetStory.passages.find(
						p => p.id === targetPassageId
					);
					if (targetPassage) {
						setTimeout(() => {
							// Center and select/highlight
							setCenter(targetPassage);
							handleSelectPassage(targetPassage, true);
							if (options.openEditor) {
								handleEditPassage(targetPassage);
							}
						}, 0);
					}
				} else if (options.fallbackPassageName) {
					// Try to resolve by name if id was not supplied
					const lower = options.fallbackPassageName.toLowerCase();
					const targetPassage = targetStory.passages.find(
						p => p.name.toLowerCase() === lower
					);
					if (targetPassage) {
						setTimeout(() => {
							setCenter(targetPassage);
							handleSelectPassage(targetPassage, true);
							if (options.openEditor) {
								handleEditPassage(targetPassage);
							}
						}, 0);
					}
				}
			}
		);

		return unsubscribe;
	}, [
		activePartId,
		storyParts,
		setCenter,
		handleSelectPassage,
		handleEditPassage
	]);

	// Handle part selection
	const handleSelectPart = React.useCallback((partId: string) => {
		setActivePartId(partId);
	}, []);

	// Handle part closing
	const handleClosePart = React.useCallback(
		(partId: string) => {
			const partToClose = storyParts.find(part => part.id === partId);
			if (!partToClose) return;

			// If this is the last part, don't allow closing
			if (storyParts.length <= 1) {
				return;
			}

			// If we're closing the active part, switch to another part
			if (partId === activePartId) {
				const remainingParts = storyParts.filter(part => part.id !== partId);
				if (remainingParts.length > 0) {
					setActivePartId(remainingParts[0].id);
				}
			}

			// Add the part to the closed parts set (don't delete the file)
			setClosedParts(prev => new Set([...prev, partId]));
		},
		[storyParts, activePartId]
	);

	// Handle creating new part
	const handleCreatePart = React.useCallback(async () => {
		console.log('handleCreatePart called');
		if (!story.storyFolderName) {
			console.error('Cannot create part: no story folder name');
			return;
		}

		const {twineElectron} = window as TwineElectronWindow;
		if (!twineElectron) {
			console.error('Electron bridge not available');
			return;
		}

		try {
			// Generate a unique part name
			const existingPartNames = storyParts.map(
				part => part.partName || part.name
			);
			let partName = 'New Part';
			let counter = 1;
			while (existingPartNames.includes(partName)) {
				partName = `New Part ${counter}`;
				counter++;
			}

			console.log(
				'Creating story part:',
				partName,
				'in folder:',
				story.storyFolderName
			);
			await twineElectron.createStoryPart(story.storyFolderName, partName);

			// Load the newly created story part and add it to the store
			const newStories = await twineElectron.loadStories();
			if (newStories && Array.isArray(newStories)) {
				// Find the newly created story part
				const newStoryFile = newStories.find(
					file =>
						file.partName === partName &&
						file.storyFolderName === story.storyFolderName
				);

				if (newStoryFile) {
					// Import the story using the same logic as the initial load
					const {importStories} = await import('../../util/import');
					const importedStories = importStories(
						newStoryFile.htmlSource,
						newStoryFile.mtime,
						newStoryFile.characters
					);

					if (importedStories[0]) {
						// Set the part metadata
						importedStories[0].partName = newStoryFile.partName;
						importedStories[0].storyFolderName = newStoryFile.storyFolderName;

						// Add the new story to the store
						dispatch({
							type: 'createStory',
							props: importedStories[0]
						});

						// Switch to the new part
						setActivePartId(importedStories[0].id);
					}
				}
			}
		} catch (error) {
			console.error('Failed to create story part:', error);
		}
	}, [story.storyFolderName, storyParts, dispatch]);

	// Handle loading story parts from custom browser
	const handleLoadParts = React.useCallback(async () => {
		const {twineElectron} = window as TwineElectronWindow;
		if (!twineElectron) {
			console.error('Electron bridge not available');
			return;
		}

		try {
			// Get the full story folder path
			const storyFolderPath = await twineElectron.getStoryFolderPath(story);

			// Scan for available story parts
			const parts = await twineElectron.scanStoryParts(storyFolderPath);

			// Open the story parts browser dialog
			dialogsDispatch({
				type: 'addDialog',
				component: StoryPartsBrowser,
				props: {
					storyFolderPath,
					availableParts: parts,
					onSelectParts: handleSelectParts
				}
			});
		} catch (error) {
			console.error('Failed to scan story parts:', error);
		}
	}, [story.storyFolderName, story.name, dialogsDispatch]);

	// Handle selecting parts from the browser
	const handleSelectParts = React.useCallback(
		async (selectedPaths: string[]) => {
			const {twineElectron} = window as TwineElectronWindow;
			if (!twineElectron) {
				console.error('Electron bridge not available');
				return;
			}

			try {
				// Load each selected file and add it as a story part
				for (const filePath of selectedPaths) {
					try {
						// Read the HTML file content
						const fileContent = await twineElectron.readFile(filePath);

						// Parse the HTML content into a Story object
						const {importStories} = await import('../../util/import');
						const importedStories = importStories(fileContent);

						if (importedStories[0]) {
							// Extract filename from path (without .html extension)
							const fileName =
								filePath.split('/').pop()?.replace('.html', '') || 'Unknown';

							// Generate a unique name to avoid conflicts
							// Use a timestamp-based approach to ensure uniqueness
							const timestamp = Date.now();
							const uniqueName = `${fileName}_${timestamp}`;

							// Set the part metadata
							importedStories[0].name = uniqueName;
							importedStories[0].partName = fileName;
							importedStories[0].storyFolderName =
								story.storyFolderName || story.name;

							// Add the new story to the store
							dispatch({
								type: 'createStory',
								props: importedStories[0]
							});
						}
					} catch (error) {
						console.error(`Failed to load file ${filePath}:`, error);
					}
				}
			} catch (error) {
				console.error('Failed to load story parts:', error);
			}
		},
		[story.storyFolderName, story.name, dispatch]
	);

	return (
		<div className="story-edit-route">
			<DocumentTitle title={activeStory.name} />
			<StoryEditToolbar
				getCenter={getCenter}
				onOpenFuzzyFinder={() => setFuzzyFinderOpen(true)}
				story={activeStory}
				storyParts={storyParts}
				activePartId={activePartId}
				onSelectPart={handleSelectPart}
				onClosePart={handleClosePart}
				onCreatePart={handleCreatePart}
				onLoadParts={handleLoadParts}
			/>
			<MainContent grabbable padded={false} ref={mainContent}>
				<MarqueeablePassageMap
					container={mainContent}
					formatName={activeStory.storyFormat}
					formatVersion={activeStory.storyFormatVersion}
					onDeselect={handleDeselectPassage}
					onDrag={handleDragPassages}
					onEdit={handleEditPassage}
					onSelect={handleSelectPassage}
					onSelectRect={handleSelectRect}
					passages={activeStory.passages}
					startPassageId={activeStory.startPassage}
					story={activeStory}
					tagColors={activeStory.tagColors}
					visibleZoom={visibleZoom}
					zoom={activeStory.zoom}
					crossPartConnectionParser={crossPartConnectionParser}
				/>
				<PassageFuzzyFinder
					onClose={() => setFuzzyFinderOpen(false)}
					onOpen={() => setFuzzyFinderOpen(true)}
					open={fuzzyFinderOpen}
					setCenter={setCenter}
					story={activeStory}
				/>
			</MainContent>
		</div>
	);
};

// This is a separate component so that the inner one can use
// `useDialogsContext()` and `useUndoableStoriesContext()` inside it.

export const StoryEditRoute: React.FC = () => (
	<UndoableStoriesContextProvider>
		<DialogsContextProvider>
			<InnerStoryEditRoute />
		</DialogsContextProvider>
	</UndoableStoriesContextProvider>
);
