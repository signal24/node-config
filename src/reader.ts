import { readFileSync } from 'fs';
import { parse } from 'path';

import { ConfigData } from './types';

export function readConfigFile<T extends Record<string, string>>(path: string): T {
    return parse(readFileSync(path, 'utf8')) as any;
}

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

export function loadAndTransformContent(path: string, transform: (data: ConfigData) => ConfigData) {
    const content = readFileSync(path, 'utf8').replace(/\r\n/, '\n');
    return transformContent(content, transform);
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
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
