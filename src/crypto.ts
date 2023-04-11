import {
    constants,
    createCipheriv,
    createDecipheriv,
    createPrivateKey,
    createPublicKey,
    KeyObject,
    privateDecrypt,
    publicEncrypt,
    randomBytes
} from 'crypto';

export class Encryptor {
    private publicKey: KeyObject;

    constructor(publicKey: string) {
        this.publicKey = createPublicKey({
            key: Buffer.from(publicKey, 'base64'),
            format: 'der',
            type: 'spki'
        });
    }

    encryptValue(value: string) {
        const key = randomBytes(32);
        const encryptedKey = publicEncrypt(
            {
                key: this.publicKey,
                padding: constants.RSA_PKCS1_OAEP_PADDING
            },
            key
        );

        const iv = randomBytes(16);
        const cipher = createCipheriv('aes-256-cbc', key, iv);
        const encryptedValue = Buffer.concat([cipher.update(value), cipher.final()]);

        const outputBuffer = Buffer.alloc(1 + encryptedKey.length + iv.length + encryptedValue.length);
        outputBuffer.writeUInt8(1, 0); // version
        encryptedKey.copy(outputBuffer, 1);
        iv.copy(outputBuffer, 1 + encryptedKey.length);
        encryptedValue.copy(outputBuffer, 1 + iv.length + encryptedKey.length);
        const encryptedText = outputBuffer.toString('base64').replace(/=+$/, '');

        return `$$[${encryptedText}]`;
    }

    encryptValueIfNotEncrypted(value: string) {
        if (value.startsWith('$$[') && value.endsWith(']')) {
            return value;
        }
        return this.encryptValue(value);
    }
}

export class Decryptor {
    private privateKey?: KeyObject;

    constructor(privateKey?: string) {
        if (privateKey) {
            this.privateKey = createPrivateKey({
                key: Buffer.from(privateKey, 'base64'),
                format: 'der',
                type: 'pkcs8'
            });
        }
    }

    decryptValue(value: string) {
        if (!this.privateKey) {
            throw new Error('No decryption key was provided');
        }

        value = value.substring(3, value.length - 1);
        const buffer = Buffer.from(value, 'base64');

        const version = buffer.readUInt8(0);
        if (version !== 1) {
            throw new Error(`Unsupported encryption version: ${version}`);
        }

        const encryptedKey = buffer.subarray(1, 257); // 2048-bit RSA should yield 256 byte payloads
        const iv = buffer.subarray(257, 273);
        const encryptedValue = buffer.subarray(273);

        const decryptedKey = privateDecrypt(
            {
                key: this.privateKey,
                padding: constants.RSA_PKCS1_OAEP_PADDING
            },
            encryptedKey
        );
        const decipher = createDecipheriv('aes-256-cbc', decryptedKey, iv);
        const decryptedValue = Buffer.concat([decipher.update(encryptedValue), decipher.final()]);
        return decryptedValue.toString();
    }

    decryptValueIfEncrypted(value: string) {
        if (value.startsWith('$$[') && value.endsWith(']')) {
            return this.decryptValue(value);
        }
        return value;
    }
}
