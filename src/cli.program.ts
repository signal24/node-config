import { Command } from 'commander';
import { writeFileSync } from 'fs';

import { Decryptor, Encryptor } from './crypto';
import { fileExists, generateConfigKeyPair } from './helpers';
import { keyMatches, readContentFromFile, transformContent } from './reader';
import { ConfigData } from './types';

export const program = new Command();

program
    .command('sh [files...]')
    .description('Output export statements to set variables from the specified .env files')
    .option('-k, --key <key>', 'The decryption key (defaults to the value of the CONFIG_DECRYPTION_KEY environment variable)')
    .action((files, options) => {
        files = files.length ? files : ['.env'];
        files = verifyFiles(files);

        const key = options.key ?? process.env.CONFIG_DECRYPTION_KEY;
        exportFiles(files, key);
    });

program
    .command('shenv [environment]')
    .description('Output export statements to set variables from the specified environment')
    .option('-k, --key <key>', 'The decryption key (defaults to the value of the CONFIG_DECRYPTION_KEY environment variable)')
    .action((env, options) => {
        const files = ['.env', '.env.local', `.env.${env}`, `.env.${env}.local`];
        const key = options.key ?? process.env.CONFIG_DECRYPTION_KEY;
        exportFiles(files, key);
    });

program
    .command('encrypt [files...]')
    .description('Encrypts the specified .env files')
    .option('-k, --key <key>', 'The encryption key (defaults to the value of the CONFIG_ENCRYPTION_KEY environment variable)')
    .option('-e, --encrypt-keys <keys...>', 'The keys to encrypt (defaults to keys ending in _SECRET)')
    .action((files, options) => {
        files = files.length ? files : ['.env'];
        files = verifyFiles(files);

        const key = options.key ?? process.env.CONFIG_ENCRYPTION_KEY;
        const encryptKeys = options.encryptKeys ?? [/_SECRET$/];

        for (const file of files) {
            transformFile(file, data => {
                const fileKey = key ?? data.CONFIG_ENCRYPTION_KEY ?? data.__CONFIG_ENCRYPTION_KEY__;
                if (!fileKey) {
                    throw new Error(`No encryption key specified for ${file}`);
                }

                const encryptor = new Encryptor(fileKey);
                for (const key of Object.keys(data)) {
                    if (keyMatches(key, encryptKeys)) {
                        if (data[key].length) {
                            data[key] = encryptor.encryptValueIfNotEncrypted(data[key]);
                        }
                    }
                }
                return data;
            });
        }
    });

program
    .command('decrypt [files...]')
    .description('Decrypts the specified .env files')
    .option('-k, --key <key>', 'The decryption key (defaults to the value of the CONFIG_DECRYPTION_KEY environment variable)')
    .action((files, options) => {
        files = files.length ? files : ['.env'];
        files = verifyFiles(files);

        const key = options.key ?? process.env.CONFIG_DECRYPTION_KEY;
        if (!key) {
            throw new Error('No decryption key specified');
        }

        const decryptor = new Decryptor(key);
        for (const file of files) {
            transformFile(file, data => {
                for (const key of Object.keys(data)) {
                    data[key] = decryptor.decryptValueIfEncrypted(data[key]);
                }
                return data;
            });
        }
    });

program
    .command('generate-keys')
    .description('Generate a public/private key pair for encryption')
    .action(() => {
        const { privateKey, publicKey } = generateConfigKeyPair();
        console.log(`CONFIG_ENCRYPTION_KEY=${publicKey}\n`);
        console.log(`CONFIG_DECRYPTION_KEY=${privateKey}\n`);
    });

program
    .command('verify [files...]')
    .description('Verifies that all secrets are encrypted correctly in a given .env file')
    .option('-k, --key <key>', 'The decryption key (defaults to the value of the CONFIG_DECRYPTION_KEY environment variable)')
    .action((files, options) => {
        files = files.length ? files : ['.env'];
        files = verifyFiles(files);

        let numTotalErrors = 0;

        const key = options.key ?? process.env.CONFIG_DECRYPTION_KEY;
        const decryptor = key ? new Decryptor(key) : null;

        if (!decryptor) {
            console.warn(`⚠️  will not check for encryption errors because no decryption key was provided\n`);
        }

        for (const file of files) {
            let numFileErrors = 0;

            transformFile(file, data => {
                for (const key of Object.keys(data)) {
                    if (!Decryptor.isValueEncrypted(data[key])) {
                        if (key.endsWith('_SECRET')) {
                            console.error(`${file}: ${key} is not encrypted`);
                            numFileErrors++;
                        }

                        continue;
                    }

                    if (!decryptor) {
                        continue;
                    }

                    const err = decryptor.tryDecryptValue(data[key]);
                    if (err) {
                        console.error(`${file}: is encrypted but cannot be decrypted`);
                        numFileErrors++;
                    }
                }

                return data;
            });

            if (numFileErrors === 0) {
                console.log(`✅ ${file}`);
            } else {
                console.error(`❌ ${file}: ${numFileErrors} errors found`);
                numTotalErrors += numFileErrors;
            }
        }

        if (numTotalErrors > 0) {
            process.exit(1);
        }
    });

// helpers

function verifyFiles(files: string[]) {
    return files.filter(file => {
        if (!fileExists(file)) {
            process.stderr.write(`'${file}' does not exist\n`);
            return false;
        }
        return true;
    });
}

function transformFile(path: string, transform: (data: ConfigData) => ConfigData) {
    const originalContent = readContentFromFile(path);
    const updatedContent = transformContent(originalContent, transform);
    writeFileSync(path, updatedContent);
}

function exportFiles(files: string[], key: string) {
    const result: ConfigData = {};
    const decryptor = new Decryptor(key);

    for (const file of files) {
        if (fileExists(file)) {
            const originalContent = readContentFromFile(file);
            transformContent(originalContent, data => {
                for (const [key, value] of Object.entries(data)) {
                    result[key] = decryptor.decryptValueIfEncrypted(value);
                }
                return data;
            });
        }
    }

    for (const [key, value] of Object.entries(result)) {
        if (!process.env[key]) {
            console.log(`export ${key}="${value}"`);
        }
    }
}
