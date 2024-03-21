import { loadConfigIntoEnv } from '.';

(() => {
    const env = process.env.APP_ENV;
    loadConfigIntoEnv({ env });
})();
