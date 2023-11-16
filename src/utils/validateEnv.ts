import { cleanEnv, num, port, str, url } from 'envalid';

export const ValidateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),

    RPC: url(),

    FARCASTER_KEY_REGISTRY_ADDRESS: str(),
    FARCASTER_MNEMONIC: str(),
    FARCASTER_FID: num(),  

    NEYNAR_TOKEN: str(),
    NEYNAR_SIGNER_UUID: str(),
  });
};
