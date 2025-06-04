import { readFileSync } from 'fs';

import { getPath } from './helpers';
import { ConfigData } from './types';

type MatchType = string | RegExp;
export function keyMatches(key: string, match: MatchType | MatchType[]): boolean {
    if (Array.isArray(match)) {
        return match.some(m => keyMatches(key, m));
    }

    if (typeof match === 'string') {
        return key === match;
    }
    return match.test(key);
}

export function readContentFromFile(path: string) {
    return readFileSync(getPath(path), 'utf8').replace(/\r\n/, '\n');
}

export function transformContent(content: string, transform: (data: ConfigData) => ConfigData) {
    const lines = content.split('\n').map(line => {
        if (line.startsWith('#')) {
            return { raw: line };
        }
        const matches = line.match(/^([^=]+)=(.*)$/);
        if (!matches) {
            return { raw: line };
        }
        const [, key, value] = matches;
        return { key, value };
    });
    const config = lines
        .filter(line => line.key)
        .reduce((config, line) => {
            config[line.key!] = line.value!;
            return config;
        }, {} as ConfigData);
    const transformed = transform(config);
    const newContent = lines
        .map(line => {
            if (line.raw !== undefined) {
                return line.raw;
            }
            return `${line.key}=${transformed[line.key]}`;
        })
        .join('\n');
    return newContent;
}
