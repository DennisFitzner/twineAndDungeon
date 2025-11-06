import {prepareStoryForPublishing} from '../prepare-story-for-publishing';
import {Passage, Story} from '../../store/stories';

function createPassage(overrides: Partial<Passage>): Passage {
        return {
                height: 100,
                highlighted: false,
                id: overrides.id ?? 'passage-id',
                left: 0,
                name: overrides.name ?? 'Passage',
                selected: false,
                story: overrides.story ?? 'story-id',
                tags: overrides.tags ?? [],
                text: overrides.text ?? '',
                top: 0,
                width: 100,
                ...overrides
        } as Passage;
}

function createStory(overrides: Partial<Story>): Story {
        const story: Story = {
                id: overrides.id ?? 'story-id',
                ifid: overrides.ifid ?? 'IFID-1234',
                lastUpdate: overrides.lastUpdate ?? new Date(0),
                name: overrides.name ?? 'Story',
                passages: overrides.passages ?? [],
                partName: overrides.partName,
                storyFolderName: overrides.storyFolderName,
                script: overrides.script ?? '',
                selected: overrides.selected ?? false,
                snapToGrid: overrides.snapToGrid ?? false,
                startPassage: overrides.startPassage ?? 'start',
                storyFormat: overrides.storyFormat ?? 'Harlowe',
                storyFormatVersion: overrides.storyFormatVersion ?? '3.3.9',
                stylesheet: overrides.stylesheet ?? '',
                tags: overrides.tags ?? [],
                tagColors: overrides.tagColors ?? {},
                zoom: overrides.zoom ?? 1,
                characters: overrides.characters,
                partCharacterIds: overrides.partCharacterIds
        } as Story;

        return story;
}

describe('prepareStoryForPublishing', () => {
        it('combines all story parts from the same folder for publishing', () => {
                const partA = createStory({
                        id: 'part-a',
                        ifid: 'IFID-A',
                        name: 'Saga Part A',
                        partName: 'PartA',
                        storyFolderName: 'Saga',
                        startPassage: 'start-a',
                        script: '/* part A script */',
                        stylesheet: '/* part A style */',
                        tags: ['adventure'],
                        tagColors: {adventure: '#123456'}
                });

                const partB = createStory({
                        id: 'part-b',
                        ifid: 'IFID-B',
                        name: 'Saga Part B',
                        partName: 'PartB',
                        storyFolderName: 'Saga',
                        startPassage: 'intro-b',
                        script: '/* part B script */',
                        stylesheet: '/* part B style */',
                        tags: ['mystery'],
                        tagColors: {mystery: '#abcdef'}
                });

                partA.passages = [
                        createPassage({
                                id: 'start-a',
                                name: 'Start',
                                story: partA.id,
                                text: 'Go to [[Next]] and [[PartB:Intro]]'
                        }),
                        createPassage({
                                id: 'next-a',
                                name: 'Next',
                                story: partA.id,
                                text: 'Return to [[Start]]'
                        }),
                        createPassage({
                                id: 'link-card',
                                name: '→ PartB:Intro',
                                story: partA.id,
                                tags: ['interlink'],
                                text: ''
                        })
                ];

                partB.passages = [
                        createPassage({
                                id: 'intro-b',
                                name: 'Intro',
                                story: partB.id,
                                text: 'Meet again [[PartA:Start]]'
                        }),
                        createPassage({
                                id: 'back-card',
                                name: '← Start',
                                story: partB.id,
                                tags: ['backlink', 'source-story-ifid:IFID-A'],
                                text: 'Back-reference from PartA:Start'
                        })
                ];

                const combined = prepareStoryForPublishing(partA, [partA, partB]);

                expect(combined.name).toBe('Saga');
                expect(combined.passages).toHaveLength(3);
                expect(combined.passages.map(p => p.name)).toEqual(
                        expect.arrayContaining(['PartA:Start', 'PartA:Next', 'PartB:Intro'])
                );

                const startPassage = combined.passages.find(p => p.name === 'PartA:Start');
                expect(startPassage?.text).toContain('[[PartA:Next]]');
                expect(startPassage?.text).toContain('[[PartB:Intro]]');

                expect(
                        combined.passages.every(
                                passage =>
                                        !passage.name.startsWith('→ ') &&
                                        !passage.name.startsWith('← ') &&
                                        !passage.tags.some(tag => tag.startsWith('source-')) &&
                                        !passage.tags.some(tag => tag.startsWith('target-'))
                        )
                ).toBe(true);

                expect(combined.startPassage).toBe('part-a:start-a');
                expect(combined.script).toBe('/* part A script */\n\n/* part B script */');
                expect(combined.stylesheet).toBe('/* part A style */\n\n/* part B style */');
                expect(new Set(combined.tags)).toEqual(new Set(['adventure', 'mystery']));
                expect(combined.tagColors).toEqual({
                        adventure: '#123456',
                        mystery: '#abcdef'
                });
        });

        it('returns the original story when there are no additional parts', () => {
                const story = createStory({
                        id: 'single',
                        storyFolderName: 'Solo',
                        passages: [
                                createPassage({id: 'start', name: 'Start', story: 'single', text: 'Hello'})
                        ],
                        startPassage: 'start'
                });

                const result = prepareStoryForPublishing(story, [story]);
                expect(result).toBe(story);
        });
});
