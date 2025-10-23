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
import {usePassageClipboard} from './use-passage-clipboard';
import {useViewCenter} from './use-view-center';
import {useZoomShortcuts} from './use-zoom-shortcuts';
import {useZoomTransition} from './use-zoom-transition';
import {onNavigateTo} from '../../store/navigation-events';
import {parseLinks, parseCrossPartLinkTarget} from '../../util/parse-links';
import {importStories} from '../../util/import';
import './story-edit-route.css';
import {
	validateCrossLinkTarget,
	generateCrossLinkTags
} from '../../util/ifid-cross-link-utils';
import {
	getOpenTabs,
	setOpenTabs,
	getActiveTab,
	setActiveTab,
	addTab,
	removeTab
} from '../../util/tab-state-manager';

export const InnerStoryEditRoute: React.FC = () => {
	const {storyId} = useParams<{storyId: string}>();
	const {stories, dispatch} = useUndoableStoriesContext();
	const story = storyWithId(stories, storyId);
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const [fuzzyFinderOpen, setFuzzyFinderOpen] = React.useState(false);
	const [activePartIfid, setActivePartIfid] = React.useState(story.ifid);
	const [openTabIfids, setOpenTabIfids] = React.useState<string[]>([]);
	const [tabsInitialized, setTabsInitialized] = React.useState(false);
	const previousStoriesCount = React.useRef(stories.length);
	const mainContent = React.useRef<HTMLDivElement>(null);

	const folderName = React.useMemo(
		() => story.storyFolderName || story.name,
		[story.storyFolderName, story.name]
	);

	React.useEffect(() => {
		if (!story.storyFolderName) {
			dispatch({
				type: 'updateStory',
				storyId: story.id,
				props: {storyFolderName: story.name}
			});
		}
	}, [dispatch, story.id, story.name, story.storyFolderName]);

	const storyParts = React.useMemo(() => {
		const partsInFolder = stories.filter(s => {
			const currentFolder = s.storyFolderName || s.name;
			return currentFolder === folderName;
		});

		if (openTabIfids.length === 0) {
			return partsInFolder;
		}

		return partsInFolder.filter(part => openTabIfids.includes(part.ifid));
	}, [stories, folderName, openTabIfids]);

	// Get the currently active story part
	const activeStory = React.useMemo(() => {
		if (storyParts.length === 0) {
			return story;
		}

		return (
			storyParts.find(part => part.ifid === activePartIfid) || storyParts[0]
		);
	}, [storyParts, activePartIfid, story]);

	// Initialize tabs from localStorage or default to main part only (only once on mount)
	React.useEffect(() => {
		if (tabsInitialized) return;

		const savedTabs = getOpenTabs(folderName);

		if (savedTabs.length > 0) {
			// Restore saved tabs - filter to only include stories that exist
			const validTabs = savedTabs.filter(ifid =>
				stories.some(s => s.ifid === ifid)
			);

			if (validTabs.length > 0) {
				setOpenTabIfids(validTabs);
				const savedActiveTab = getActiveTab(folderName);
				if (savedActiveTab && validTabs.includes(savedActiveTab)) {
					setActivePartIfid(savedActiveTab);
				} else {
					setActivePartIfid(validTabs[0]);
				}
			}
		} else {
			// Default: open only main part (matching folder name)
			const allPartsInFolder = stories.filter(s => {
				const sFolderName = s.storyFolderName || s.name;
				return sFolderName === folderName;
			});

			const mainPart =
				allPartsInFolder.find(s => (s.partName || s.name) === folderName) ||
				allPartsInFolder[0];

			if (mainPart) {
				setOpenTabIfids([mainPart.ifid]);
				setActivePartIfid(mainPart.ifid);
				setOpenTabs(folderName, [mainPart.ifid]);
				setActiveTab(folderName, mainPart.ifid);
			}
		}

		setTabsInitialized(true);
	}, [folderName, stories, tabsInitialized, story.ifid]);

	// Generate backlink cards automatically when cross-part links are detected
	React.useEffect(() => {
		const backlinkCardsToCreate: Array<{
			name: string;
			text: string;
			left: number;
			top: number;
			tags: string[];
		}> = [];

		const activeStoryName = (activeStory.partName || activeStory.name).toLowerCase();

		storyParts.forEach(otherStory => {
			if (otherStory.id === activeStory.id) return;

			otherStory.passages.forEach(otherPassage => {
				const links = parseLinks(otherPassage.text);
				links.forEach(linkText => {
					const crossPartTarget = parseCrossPartLinkTarget(`[[${linkText}]]`);
					if (!crossPartTarget?.part) return;

					const validation = validateCrossLinkTarget(
						storyParts,
						crossPartTarget.part,
						crossPartTarget.passage
					);

					if (!validation.isValid || !validation.story || !validation.passage) {
						return;
					}

					const targetStoryName =
						(validation.story.partName || validation.story.name).toLowerCase();
					if (targetStoryName !== activeStoryName) {
						return;
					}

					const targetPassage = validation.passage;
					const backlinkName = `← ${targetPassage.name}`;
					const alreadyExists = activeStory.passages.some(
						p => p.name === backlinkName
					);

					if (alreadyExists) {
						return;
					}

					backlinkCardsToCreate.push({
						name: backlinkName,
						text: `Back-reference from ${
							otherStory.partName || otherStory.name
						}:${otherPassage.name}`,
						left: targetPassage.left + 200,
						top: targetPassage.top + 100,
						tags: generateCrossLinkTags(
							otherStory,
							otherPassage,
							'backlink',
							activeStory,
							targetPassage
						)
					});
				});
			});
		});

		if (backlinkCardsToCreate.length > 0) {
			dispatch({
				type: 'createPassages',
				storyId: activeStory.id,
				props: backlinkCardsToCreate
			});
		}
	}, [storyParts, dispatch, activeStory]);

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
					// This is a cross-part link - don't create connections for these
					// The interlink cards will handle the visual connections
					// Return empty to avoid broken connections
					return;
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
		handleResizePassage,
		handleSelectPassage,
		handleSelectRect
	} = usePassageChangeHandlers(activeStory);

	const visibleZoom = useZoomTransition(activeStory.zoom, mainContent.current);

	useZoomShortcuts(activeStory);
	usePassageClipboard(activeStory);
	useInitialPassageCreation(activeStory, getCenter);

	// Watch for new stories being added and switch to them if they're part of the current story folder
	React.useEffect(() => {
		// Only switch if the number of stories has actually increased (new story added)
		if (stories.length > previousStoriesCount.current) {
			const folderName = story.storyFolderName || story.name;
			const newStories = stories.filter(s => {
				const sFolderName = s.storyFolderName || s.name;
				return sFolderName === folderName && s.ifid !== story.ifid;
			});

			// If there are new stories in the same folder, switch to the most recent one
			// But only if it's not already in our open tabs (to avoid conflicts with manual loading)
			if (newStories.length > 0) {
				const newestStory = newStories[newStories.length - 1];
				// Only auto-switch if the story is not already in open tabs
				if (!openTabIfids.includes(newestStory.ifid)) {
					setActivePartIfid(newestStory.ifid);
				}
			}
		}

		previousStoriesCount.current = stories.length;
	}, [
		stories,
		story.storyFolderName,
		story.name,
		story.ifid,
		openTabIfids
	]);

	// Cross-part navigation subscription
	React.useEffect(() => {
		const unsubscribe = onNavigateTo(
			async (targetPartId, targetPassageId, options) => {
				// Handle both story IDs and story part names
				let targetStory;
				if (targetPartId) {
					// Try to find by ID first in storyParts
					targetStory = storyParts.find(p => p.id === targetPartId);
					if (!targetStory) {
						// If not found by ID, try to find by part name in storyParts
						targetStory = storyParts.find(
							p =>
								(p.partName || p.name).toLowerCase() ===
								targetPartId.toLowerCase()
						);
					}

					// If still not found, try to load the story part from file system
					if (!targetStory) {
						try {
							const {twineElectron} = window as TwineElectronWindow;
							if (twineElectron) {
								// Get the story folder path
								const storyFolderPath = await twineElectron.getStoryFolderPath(
									story
								);

								// Scan for available story parts
								const availableParts = await twineElectron.scanStoryParts(
									storyFolderPath
								);

								// Find the target part by name
								const targetPartFile = availableParts.find(part => {
									const partName = part.name.replace('.html', '');
									return partName.toLowerCase() === targetPartId.toLowerCase();
								});

								if (targetPartFile) {
									// Load the story part
									const storyFile = await twineElectron.loadStoryPart(
										targetPartFile.path
									);
									if (storyFile) {
										// Import the story
										const importedStories = importStories(
											storyFile.htmlSource,
											storyFile.mtime,
											storyFile.characters
										);
										if (importedStories[0]) {
											// Set metadata
											importedStories[0].partName = storyFile.partName;
											importedStories[0].storyFolderName =
												storyFile.storyFolderName;

											// Add to stories
											dispatch({
												type: 'createStory',
												props: importedStories[0]
											});

											// Add to open tabs immediately
											const folderName = story.storyFolderName || story.name;
											const newOpenTabs = [
												...openTabIfids,
												importedStories[0].ifid
											];
											setOpenTabIfids(newOpenTabs);
											addTab(folderName, importedStories[0].ifid);

											// Switch to the new tab
											setActivePartIfid(importedStories[0].ifid);
											setActiveTab(folderName, importedStories[0].ifid);

											// Wait for the component to re-render and then handle passage selection
											setTimeout(() => {
												if (targetPassageId) {
													// Find the target passage in the newly loaded story
													const targetPassage =
														importedStories[0].passages.find(
															p => p.id === targetPassageId
														);
													if (targetPassage) {
														// Select the target passage
														dispatch({
															type: 'updatePassage',
															storyId: importedStories[0].id,
															passageId: targetPassage.id,
															props: {selected: true}
														});
													}
												} else if (options.fallbackPassageName) {
													// Try to resolve by name if id was not supplied
													const lower =
														options.fallbackPassageName.toLowerCase();
													const targetPassage =
														importedStories[0].passages.find(
															p => p.name.toLowerCase() === lower
														);
													if (targetPassage) {
														// Select the target passage
														dispatch({
															type: 'updatePassage',
															storyId: importedStories[0].id,
															passageId: targetPassage.id,
															props: {selected: true}
														});
													}
												}
											}, 100); // Small delay to allow component to re-render

											return; // Exit early since we're handling navigation in setTimeout
										}
									}
								}
							}
						} catch (error) {
							console.error('Failed to load story part:', error);
							return;
						}
					}

					if (!targetStory) return;

					// Open tab if not already open
					if (!openTabIfids.includes(targetStory.ifid)) {
						const folderName = story.storyFolderName || story.name;
						const newOpenTabs = [...openTabIfids, targetStory.ifid];
						setOpenTabIfids(newOpenTabs);
						addTab(folderName, targetStory.ifid);
					}

					// Switch tab if needed
					if (targetStory.ifid !== activePartIfid) {
						setActivePartIfid(targetStory.ifid);
						const folderName = story.storyFolderName || story.name;
						setActiveTab(folderName, targetStory.ifid);
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
			}
		);

		return unsubscribe;
	}, [
		activePartIfid,
		storyParts,
		setCenter,
		handleSelectPassage,
		handleEditPassage,
		story,
		dispatch,
		openTabIfids
	]);

	// Handle part selection
	const handleSelectPart = React.useCallback(
		(partIfid: string) => {
			const folderName = story.storyFolderName || story.name;
			setActivePartIfid(partIfid);
			setActiveTab(folderName, partIfid);
		},
		[story.storyFolderName, story.name]
	);

	// Handle part closing
	const handleClosePart = React.useCallback(
		(partIfid: string) => {
			if (openTabIfids.length <= 1) {
				return; // Don't close last tab
			}

			const folderName = story.storyFolderName || story.name;
			const newOpenTabs = openTabIfids.filter(id => id !== partIfid);

			// Update state
			setOpenTabIfids(newOpenTabs);
			removeTab(folderName, partIfid);

			// Switch to another tab if closing active
			if (partIfid === activePartIfid && newOpenTabs.length > 0) {
				const newActiveIfid = newOpenTabs[0];
				setActivePartIfid(newActiveIfid);
				setActiveTab(folderName, newActiveIfid);
			}
		},
		[openTabIfids, activePartIfid, story.storyFolderName, story.name]
	);

	// Handle creating new part
	const handleCreatePart = React.useCallback(
		async (partName: string) => {
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

							// Check if story already exists
							const existingStory = stories.find(
								s => s.ifid === importedStories[0].ifid
							);

							if (!existingStory) {
								// Add the new story to the store
								dispatch({
									type: 'createStory',
									props: importedStories[0]
								});
							}

							// Add as a new tab (only if not already open)
							const folderName = story.storyFolderName || story.name;
							const storyIfid = existingStory?.ifid || importedStories[0].ifid;
							if (!openTabIfids.includes(storyIfid)) {
								const newOpenTabs = [...openTabIfids, storyIfid];
								setOpenTabIfids(newOpenTabs);
								addTab(folderName, storyIfid);
							}
							// Don't switch active tab - keep the current one active
						}
					}
				}
			} catch (error) {
				console.error('Failed to create story part:', error);
			}
		},
		[story.storyFolderName, storyParts, dispatch, openTabIfids]
	);

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

							// Check if a story with this IFID already exists
							const existingStory = stories.find(
								s => s.ifid === importedStories[0].ifid
							);

							if (existingStory) {
								// Story already exists, just add to tabs if not already open
								const folderName = story.storyFolderName || story.name;

								if (!openTabIfids.includes(existingStory.ifid)) {
									const newOpenTabs = [...openTabIfids, existingStory.ifid];
									setOpenTabIfids(newOpenTabs);
									addTab(folderName, existingStory.ifid);
									// Set as active tab when loading
									setActivePartIfid(existingStory.ifid);
									setActiveTab(folderName, existingStory.ifid);
								} else {
									// Story already in tabs, make it active
									setActivePartIfid(existingStory.ifid);
									setActiveTab(folderName, existingStory.ifid);
								}
							} else {
								// Story doesn't exist, create it
								// Set the part metadata (no timestamp needed)
								importedStories[0].partName = fileName;
								importedStories[0].storyFolderName =
									story.storyFolderName || story.name;

								// Add the new story to the store
								dispatch({
									type: 'createStory',
									props: importedStories[0]
								});

								// Add as a new tab and set as active
								const folderName = story.storyFolderName || story.name;
								const newOpenTabs = [...openTabIfids, importedStories[0].ifid];
								setOpenTabIfids(newOpenTabs);
								addTab(folderName, importedStories[0].ifid);
								// Set as active tab when loading
								setActivePartIfid(importedStories[0].ifid);
								setActiveTab(folderName, importedStories[0].ifid);
							}

							// The useEffect above will handle switching to the new story part
						}
					} catch (error) {
						console.error(`Failed to load file ${filePath}:`, error);
					}
				}
			} catch (error) {
				console.error('Failed to load story parts:', error);
			}
		},
		[story.storyFolderName, story.name, dispatch, openTabIfids, stories]
	);

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
	}, [story, dialogsDispatch, handleSelectParts]);

	return (
		<div className="story-edit-route">
			<DocumentTitle title={activeStory.name} />
			<StoryEditToolbar
				getCenter={getCenter}
				onOpenFuzzyFinder={() => setFuzzyFinderOpen(true)}
				story={activeStory}
				storyParts={storyParts}
				activePartIfid={activePartIfid}
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
					onResize={handleResizePassage}
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
