import { generateKeyPairSync } from 'crypto';

export function generateConfigKeyPair() {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
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

    return {
        privateKey: privateKey.toString('base64').replace(/=+$/, ''),
        publicKey: publicKey.toString('base64').replace(/=+$/, '')
    };
}
