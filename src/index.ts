import { parse } from 'dotenv';
import { existsSync } from 'fs';

import { Decryptor } from './crypto';
import { loadAndTransformContent } from './reader';
import { ConfigData, DefaultLoadOptions, LoadOptions } from './types';

export function decryptConfig(decryptor: Decryptor, data: ConfigData): ConfigData {
    const decrypted: ConfigData = {};
    for (const [key, value] of Object.entries(data)) {
        decrypted[key] = decryptor.decryptValueIfEncrypted(value);
    }
    return decrypted;
}

export function loadConfig<T extends ConfigData>(options?: LoadOptions): T {
    options = { ...DefaultLoadOptions, ...options };
    const files = Array.isArray(options.file) ? options.file : ([options.file] as string[]);

    const decryptor = new Decryptor(options.key);

    const config: ConfigData = {};
    for (const file of files) {
        if (existsSync(file)) {
            const decryptedContent = loadAndTransformContent(file, data => decryptConfig(decryptor, data));
            const fileConfig = parse(decryptedContent);
            Object.assign(config, fileConfig);
        }
    }

    Object.assign(config, process.env);

    return config as T;
}
