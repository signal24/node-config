import { Decryptor } from './crypto';
import { ConfigData, LoadOptions } from './types';
export declare function decryptConfig(decryptor: Decryptor, data: ConfigData): ConfigData;
export declare function loadConfig<T extends ConfigData>(options?: LoadOptions): T;
