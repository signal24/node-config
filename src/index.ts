import { parse } from "dotenv";
import { existsSync } from "fs";
import { loadAndTransformContent } from "./reader";
import { ConfigData, DecryptOptions, DefaultLoadOptions, LoadOptions } from "./types";

export function decryptConfig(data: ConfigData, options?: DecryptOptions): ConfigData {

}

export function loadConfig<T extends ConfigData>(options?: LoadOptions): T {
    options = { ...DefaultLoadOptions, ...options };
    const files = Array.isArray(options.file) ? options.file : [options.file] as string[];

    const config: ConfigData = {};
    for (const file of files) {
        if (existsSync(file)) {
            const decryptedContent = loadAndTransformContent(file, data => decryptConfig(data, options));
            const fileConfig = parse(decryptedContent);
            Object.assign(config, fileConfig);
        }
    }

    Object.assign(config, process.env);

    return config as T;
}
