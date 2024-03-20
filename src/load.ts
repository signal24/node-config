import { loadConfig } from '.';

(() => {
    const env = process.env.APP_ENV ?? (process.env.NODE_ENV === 'development' ? 'development' : undefined);
    const resolved = loadConfig({ env });
    Object.assign(process.env, resolved);
})();
