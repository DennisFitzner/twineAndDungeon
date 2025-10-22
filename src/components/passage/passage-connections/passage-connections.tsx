import * as React from 'react';
import {Passage, passageConnections} from '../../../store/stories';
import {Point} from '../../../util/geometry';
import {PassageConnectionGroup} from './passage-connection-group';
import {LinkMarkers} from './link-markers';
import {StartConnection} from './start-connection';
import {useFormatReferenceParser} from '../../../store/use-format-reference-parser';
import {parseLinks, parseCrossPartLinkTarget} from '../../../util/parse-links';

export interface PassageConnectionsProps {
	formatName: string;
	formatVersion: string;
	offset: Point;
	passages: Passage[];
	startPassageId: string;
	crossPartConnectionParser?: (text: string) => string[];
}

const emptySet = new Set<Passage>();
const noOffset: Point = {left: 0, top: 0};

export const PassageConnections: React.FC<PassageConnectionsProps> = props => {
	const {
		formatName,
		formatVersion,
		offset,
		passages,
		startPassageId,
		crossPartConnectionParser
	} = props;
	const referenceParser = useFormatReferenceParser(formatName, formatVersion);

	// Use custom parser if provided, otherwise use default
	// Note: The custom parser will only be applied to regular passages, not interlink/backlink cards
	const connectionParser =
		crossPartConnectionParser || ((text: string) => parseLinks(text, true));

	// Memoize passage filtering to avoid repeated calculations
	const {interlinkCards, backlinkCards} = React.useMemo(
		() => ({
			interlinkCards: passages.filter(p => p.tags.includes('interlink')),
			backlinkCards: passages.filter(p => p.name.startsWith('← '))
		}),
		[passages]
	);

	const {draggable: draggableLinks, fixed: fixedLinks} = React.useMemo(() => {
		// Filter out interlink and backlink cards from regular passage connections
		// to prevent them from being connected to the start passage or other unwanted connections
		const regularPassages = passages.filter(
			p => !p.tags.includes('interlink') && !p.name.startsWith('← ')
		);

		const connections = passageConnections(regularPassages, connectionParser);

		// Add connections for interlink cards
		// Interlink cards should connect to the passage that contains the cross-part link (source passage)
		interlinkCards.forEach(interlinkCard => {
			const targetStoryTag = interlinkCard.tags.find(tag =>
				tag.startsWith('target-story-name:')
			);
			const targetPassageTag = interlinkCard.tags.find(tag =>
				tag.startsWith('target-passage-name:')
			);

			if (targetStoryTag && targetPassageTag) {
				const targetStoryName = targetStoryTag.replace('target-story-name:', '');
				const targetPassageName = targetPassageTag.replace(
					'target-passage-name:',
					''
				);

				// Find the passage that contains the cross-part link that created this interlink
				const sourcePassage = passages.find(passage => {
					const links = parseLinks(passage.text);
					return links.some(linkText => {
						const crossPartTarget = parseCrossPartLinkTarget(`[[${linkText}]]`);
						return (
							crossPartTarget &&
							crossPartTarget.part === targetStoryName &&
							crossPartTarget.passage === targetPassageName
						);
					});
				});

				if (sourcePassage) {
					// Add connection from source passage to interlink card
					// (source passage -> interlink card)
					if (sourcePassage.selected || interlinkCard.selected) {
						if (!connections.draggable.connections.has(sourcePassage)) {
							connections.draggable.connections.set(sourcePassage, new Set());
						}
						connections.draggable.connections
							.get(sourcePassage)!
							.add(interlinkCard);
					} else {
						if (!connections.fixed.connections.has(sourcePassage)) {
							connections.fixed.connections.set(sourcePassage, new Set());
						}
						connections.fixed.connections
							.get(sourcePassage)!
							.add(interlinkCard);
					}
				}
			}
		});

		// Add connections for backlink cards
		// Backlink cards should connect to the passage they reference (target passage)
		backlinkCards.forEach(backlinkCard => {
			// Extract the target passage name from the backlink card name
			// Format: "← PassageName"
			const targetPassageName = backlinkCard.name.replace(/^← /, '').trim();
			if (targetPassageName) {
				const targetPassage = passages.find(p => p.name === targetPassageName);
				if (targetPassage) {
					// Add connection from backlink card to target passage
					// (backlink card -> target passage)
					if (backlinkCard.selected || targetPassage.selected) {
						if (!connections.draggable.connections.has(backlinkCard)) {
							connections.draggable.connections.set(backlinkCard, new Set());
						}
						connections.draggable.connections
							.get(backlinkCard)!
							.add(targetPassage);
					} else {
						if (!connections.fixed.connections.has(backlinkCard)) {
							connections.fixed.connections.set(backlinkCard, new Set());
						}
						connections.fixed.connections.get(backlinkCard)!.add(targetPassage);
					}
				}
			}
		});

		return connections;
	}, [passages, connectionParser]);
	const {draggable: draggableReferences, fixed: fixedReferences} =
		React.useMemo(() => {
			// Filter out interlink and backlink cards from reference connections too
			const regularPassages = passages.filter(
				p => !p.tags.includes('interlink') && !p.name.startsWith('← ')
			);
			return passageConnections(regularPassages, referenceParser);
		}, [passages, referenceParser]);

	const startPassage = React.useMemo(
		() => passages.find(passage => passage.id === startPassageId),
		[passages, startPassageId]
	);

	// References only show existing connections.

	return (
		<svg className="link-connectors">
			<LinkMarkers />
			{startPassage && (
				<StartConnection offset={offset} passage={startPassage} />
			)}
			<PassageConnectionGroup {...draggableLinks} offset={offset} />
			<PassageConnectionGroup {...fixedLinks} offset={noOffset} />
			<PassageConnectionGroup
				broken={emptySet}
				connections={draggableReferences.connections}
				offset={offset}
				self={emptySet}
				variant="reference"
			/>
			<PassageConnectionGroup
				broken={emptySet}
				connections={fixedReferences.connections}
				offset={noOffset}
				self={emptySet}
				variant="reference"
			/>
		</svg>
	);
};
