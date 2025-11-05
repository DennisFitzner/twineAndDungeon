import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {RouteToolbar} from '../../../components/route-toolbar';
import {StoryPartTabs} from '../../../components/story-tabs';
import {AppActions, BuildActions} from '../../../route-actions';
import {Story} from '../../../store/stories';
import {Point} from '../../../util/geometry';
import {PassageActions} from './passage/passage-actions';
import {StoryActions} from './story/story-actions';
import {UndoRedoButtons} from './undo-redo-buttons';
import {ZoomButtons} from './zoom-buttons';

export interface StoryEditToolbarProps {
        getCenter: () => Point;
        onOpenFuzzyFinder: () => void;
        story: Story;
        storyParts?: Story[];
        activePartIfid?: string;
        onSelectPart?: (partIfid: string) => void;
        onClosePart?: (partIfid: string) => void;
        onCreatePart?: (partName: string) => void;
        onLoadParts?: () => void;
        onReloadCharacters?: () => void;
}

export const StoryEditToolbar: React.FC<StoryEditToolbarProps> = props => {
        const {
                getCenter,
		onOpenFuzzyFinder,
		story,
                storyParts,
                activePartIfid,
                onSelectPart,
                onClosePart,
                onCreatePart,
                onLoadParts,
                onReloadCharacters
        } = props;
        const {t} = useTranslation();

	return (
		<RouteToolbar
			pinnedControls={
				<>
					<ZoomButtons story={story} />
					<UndoRedoButtons />
				</>
			}
			tabs={{
				[t('common.passage')]: (
					<PassageActions
						getCenter={getCenter}
						onOpenFuzzyFinder={onOpenFuzzyFinder}
						story={story}
					/>
				),
                                [t('common.story')]: (
                                        <StoryActions
                                                story={story}
                                                onLoadParts={onLoadParts}
                                                onReloadCharacters={onReloadCharacters}
                                        />
                                ),
				[t('common.build')]: <BuildActions story={story} />,
				[t('common.appName')]: <AppActions />
			}}
			additionalRow={
				storyParts && storyParts.length > 0 ? (
					<StoryPartTabs
						storyParts={storyParts}
						activePartIfid={activePartIfid || story.ifid}
						onSelectPart={onSelectPart || (() => {})}
						onClosePart={onClosePart || (() => {})}
						onCreatePart={onCreatePart || ((_partName: string) => {})} // eslint-disable-line @typescript-eslint/no-unused-vars
					/>
				) : undefined
			}
		/>
	);
};
