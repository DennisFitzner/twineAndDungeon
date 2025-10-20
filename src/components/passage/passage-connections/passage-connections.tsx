import * as React from 'react';
import {Passage, passageConnections} from '../../../store/stories';
import {Point} from '../../../util/geometry';
import {PassageConnectionGroup} from './passage-connection-group';
import {LinkMarkers} from './link-markers';
import {StartConnection} from './start-connection';
import {useFormatReferenceParser} from '../../../store/use-format-reference-parser';
import {parseLinks} from '../../../util/parse-links';

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
	const connectionParser =
		crossPartConnectionParser || ((text: string) => parseLinks(text, true));

	const {draggable: draggableLinks, fixed: fixedLinks} = React.useMemo(
		() => passageConnections(passages, connectionParser),
		[passages, connectionParser]
	);
	const {draggable: draggableReferences, fixed: fixedReferences} =
		React.useMemo(
			() => passageConnections(passages, referenceParser),
			[passages, referenceParser]
		);

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
