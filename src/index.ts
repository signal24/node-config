import { parse } from 'dotenv';

import { Decryptor, Encryptor } from './crypto';
import { fileExists } from './helpers';
import { readContentFromFile, transformContent } from './reader';
import { ConfigData, DefaultLoadOptions, LoadOptions } from './types';

export function decryptConfigData(decryptor: Decryptor, data: ConfigData): ConfigData {
    const decrypted: ConfigData = {};
    for (const [key, value] of Object.entries(data)) {
        decrypted[key] = decryptor.decryptValueIfEncrypted(value);
    }
    return decrypted;
}

export function parseEnvContent<T extends ConfigData>(content: string, decryptor: Decryptor = new Decryptor()): T {
    const decryptedContent = transformContent(content, data => decryptConfigData(decryptor, data));
    const config = parse(decryptedContent);
    return config as T;
}

export function loadConfig<T extends ConfigData>(options?: LoadOptions): T {
    options = { ...DefaultLoadOptions, ...options };

    if (!options.file) {
        const envFiles = options.env ? [`.env.${options.env}`, `.env.${options.env}.local`] : [];
        options.file = ['.env', '.env.local', ...envFiles];
    }

    const files = Array.isArray(options.file) ? options.file : ([options.file] as string[]);

    const decryptor = new Decryptor(options.key);

    const config: ConfigData = {};
    for (const file of files) {
        if (fileExists(file)) {
            const encryptedContent = readContentFromFile(file);
            const fileConfig = parseEnvContent(encryptedContent, decryptor);
            Object.assign(config, fileConfig);
        }
    }

    Object.assign(config, process.env);

    return config as T;
}

export { Decryptor, Encryptor };
