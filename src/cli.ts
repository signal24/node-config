import { program } from 'commander';
import { generateKeyPairSync } from 'crypto';
import { existsSync, writeFileSync } from 'fs';
import { Decryptor, Encryptor } from './crypto';
import { keyMatches, loadAndTransformContent } from './reader';
import { ConfigData } from './types';

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
                const fileKey = key ?? data.__CONFIG_ENCRYPTION_KEY__;
                if (!fileKey) {
                    throw new Error(`No encryption key specified for ${file}`);
                }

                const encryptor = new Encryptor(fileKey);
                for (const key of Object.keys(data)) {
                    if (keyMatches(key, encryptKeys)) {
                        data[key] = encryptor.encryptValueIfNotEncrypted(data[key]);
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
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'der'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'der'
            }
        });
        console.log(`CONFIG_ENCRYPTION_KEY=${publicKey.toString('base64').replace(/=+$/, '')}`);
        console.log(`CONFIG_DECRYPTION_KEY=${privateKey.toString('base64').replace(/=+$/, '')}`);
    });

program.parse(process.argv);


// helpers

function verifyFiles(files: string[]) {
    return files.filter(file => {
        if (!existsSync(file)) {
            process.stderr.write(`'${file}' does not exist\n`);
            return false;
        }
        return true;
    });
}

function transformFile(path: string, transform: (data: ConfigData) => ConfigData) {
    const updatedContent = loadAndTransformContent(path, transform);
    writeFileSync(path, updatedContent);
}
