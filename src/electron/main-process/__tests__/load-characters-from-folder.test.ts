import {readFile, stat} from 'fs-extra';
import {loadCharactersFromFolder} from '../story-file';

jest.mock('fs-extra');

describe('loadCharactersFromFolder', () => {
        const readFileMock = readFile as jest.Mock;
        const statMock = stat as jest.Mock;

        beforeEach(() => {
                readFileMock.mockReset();
                statMock.mockReset();
                jest.spyOn(console, 'warn').mockReturnValue();
                jest.spyOn(console, 'error').mockReturnValue();
        });

        afterEach(() => {
                jest.restoreAllMocks();
        });

        it('normalizes local character images with an mtime cache buster', async () => {
                const folderPath = '/stories/example';
                const charactersFilePath = `${folderPath}/characters.json`;

                readFileMock.mockImplementation((name: string) => {
                        if (name === charactersFilePath) {
                                return Promise.resolve(
                                        JSON.stringify([
                                                {
                                                        id: 'alpha',
                                                        name: 'Alpha',
                                                        image: 'images/alpha.png'
                                                }
                                        ])
                                );
                        }

                        throw new Error(`Asked to read a non-mocked file: ${name}`);
                });

                statMock.mockImplementation((name: string) => {
                        if (name === charactersFilePath) {
                                return Promise.resolve({
                                        isDirectory: () => false
                                });
                        }

                        if (name === `${folderPath}/images/alpha.png`) {
                                return Promise.resolve({
                                        mtimeMs: 42
                                });
                        }

                        const error = new Error(`ENOENT: ${name}`) as NodeJS.ErrnoException;
                        error.code = 'ENOENT';
                        throw error;
                });

                const result = await loadCharactersFromFolder(folderPath);

                expect(result).toEqual([
                        {
                                id: 'alpha',
                                name: 'Alpha',
                                image: 'file:///stories/example/images/alpha.png?mtime=42'
                        }
                ]);
        });
});
