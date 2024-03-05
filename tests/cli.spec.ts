import { cpSync, readFileSync, rmSync, writeFileSync } from 'fs';

import { generateConfigKeyPair } from '../src/helpers';

async function getProgram() {
    const program = (await import('../src/cli.program')).program;
    program.exitOverride();
    return program;
}

describe('CLI', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        delete process.env.CONFIG_ENCRYPTION_KEY;
        delete process.env.CONFIG_DECRYPTION_KEY;
        cpSync(`${__dirname}/fixtures/sample.env`, `${__dirname}/fixtures/cli.env.test`);
    });

    afterAll(() => {
        rmSync(`${__dirname}/fixtures/cli.env.test`);
    });

    it('should generate encryption keys', async () => {
        const program = await getProgram();
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {
            /**/
        });
        program.parse(['generate-keys'], { from: 'user' });
        expect(logSpy).toBeCalledWith(expect.stringMatching(/^CONFIG_ENCRYPTION_KEY=/));
        expect(logSpy).toBeCalledWith(expect.stringMatching(/^CONFIG_DECRYPTION_KEY=/));
    });

    it('should require an encryption key', async () => {
        const program = await getProgram();
        expect(() => {
            program.parse(['encrypt', `${__dirname}/fixtures/cli.env.test`], { from: 'user' });
        }).toThrowError(/^No encryption key specified for .*cli\.env\.test/);
    });

    it('should encrypt and decrypt with keys specified on the command line', async () => {
        const program = await getProgram();

        const beforeContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');

        const { privateKey, publicKey } = generateConfigKeyPair();

        program.parse(['encrypt', `${__dirname}/fixtures/cli.env.test`, '-k', publicKey], { from: 'user' });
        const encryptedContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');
        expect(beforeContent).not.toEqual(encryptedContent);
        expect(encryptedContent).toMatch(/^VAR_3_SECRET=\$\$\[.*\]$/m);
        expect(encryptedContent).toMatch(/^VAR_5_SECRET=\$\$\[.*\]$/m);

        program.parse(['decrypt', `${__dirname}/fixtures/cli.env.test`, '-k', privateKey], { from: 'user' });
        const afterContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');
        expect(beforeContent).toEqual(afterContent);
    });

    it('should encrypt and decrypt with keys specified in the environment', async () => {
        const program = await getProgram();

        const beforeContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');

        const { privateKey, publicKey } = generateConfigKeyPair();
        process.env.CONFIG_ENCRYPTION_KEY = publicKey;
        process.env.CONFIG_DECRYPTION_KEY = privateKey;

        program.parse(['encrypt', `${__dirname}/fixtures/cli.env.test`], { from: 'user' });
        const encryptedContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');
        expect(beforeContent).not.toEqual(encryptedContent);
        expect(encryptedContent).toMatch(/^VAR_3_SECRET=\$\$\[.*\]$/m);
        expect(encryptedContent).toMatch(/^VAR_5_SECRET=\$\$\[.*\]$/m);

        program.parse(['decrypt', `${__dirname}/fixtures/cli.env.test`], { from: 'user' });
        const afterContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');
        expect(beforeContent).toEqual(afterContent);
    });

    it('should encrypt with a key specified in the file', async () => {
        const program = await getProgram();

        const beforeContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');

        const { privateKey, publicKey } = generateConfigKeyPair();
        const beforeContentWithKey = `CONFIG_ENCRYPTION_KEY=${publicKey}\n\n${beforeContent}`;
        writeFileSync(`${__dirname}/fixtures/cli.env.test`, beforeContentWithKey, 'utf8');

        program.parse(['encrypt', `${__dirname}/fixtures/cli.env.test`], { from: 'user' });
        const encryptedContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');
        expect(beforeContent).not.toEqual(encryptedContent);
        expect(encryptedContent).toMatch(/^VAR_3_SECRET=\$\$\[.*\]$/m);
        expect(encryptedContent).toMatch(/^VAR_5_SECRET=\$\$\[.*\]$/m);

        program.parse(['decrypt', `${__dirname}/fixtures/cli.env.test`, '-k', privateKey], { from: 'user' });
        const afterContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');
        expect(beforeContentWithKey).toEqual(afterContent);
    });

    it('should encrypt only the specified keys', async () => {
        const program = await getProgram();

        const beforeContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');

        const { privateKey, publicKey } = generateConfigKeyPair();

        program.parse(['encrypt', `${__dirname}/fixtures/cli.env.test`, '-k', publicKey, '-e', 'VAR_2', 'VAR_4'], { from: 'user' });
        const encryptedContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');
        expect(beforeContent).not.toEqual(encryptedContent);
        expect(encryptedContent).toMatch(/^VAR_2=\$\$\[.*\]$/m);
        expect(encryptedContent).toMatch(/^VAR_4=\$\$\[.*\]$/m);

        program.parse(['decrypt', `${__dirname}/fixtures/cli.env.test`, '-k', privateKey], { from: 'user' });
        const afterContent = readFileSync(`${__dirname}/fixtures/cli.env.test`, 'utf8');
        expect(beforeContent).toEqual(afterContent);
    });
});
