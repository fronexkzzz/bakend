import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram';
import { env } from '../env.js';

function ensureCreds() {
  if (!env.TELEGRAM_API_ID || !env.TELEGRAM_API_HASH) {
    throw new Error('mtproto_credentials_missing');
  }
}

export async function mtSendCodeUnauth(phone: string): Promise<{ phoneCodeHash: string; timeout: number; session: string }> {
  ensureCreds();
  const client = new TelegramClient(new StringSession(''), env.TELEGRAM_API_ID, env.TELEGRAM_API_HASH!, { connectionRetries: 3 });
  await client.connect();
  const res = await client.invoke(new Api.auth.SendCode({
    phoneNumber: phone,
    apiId: env.TELEGRAM_API_ID,
    apiHash: env.TELEGRAM_API_HASH!,
    settings: new Api.CodeSettings({
      allowFlashcall: false,
      currentNumber: false,
      allowAppHash: false,
      allowMissedCall: false,
    }),
  }));
  const session = client.session.save();
  // @ts-ignore
  return { phoneCodeHash: res.phoneCodeHash as string, timeout: (res.timeout as number) || 300, session };
}

export async function mtSignInOrUp(phone: string, code: string, phoneCodeHash: string, session: string) {
  ensureCreds();
  const client = new TelegramClient(new StringSession(session), env.TELEGRAM_API_ID, env.TELEGRAM_API_HASH!, { connectionRetries: 3 });
  await client.connect();
  try {
    const auth = await client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code }));
    return auth; // auth.Authorization
  } catch (e: any) {
    if (e?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      throw new Error('two_factor_enabled');
    }
    if (e?.errorMessage === 'PHONE_CODE_INVALID') {
      throw new Error('invalid_code');
    }
    if (e?.errorMessage === 'AUTHORIZATION_SIGN_UP_REQUIRED' || e?.className === 'auth.authorizationSignUpRequired') {
      const auth = await client.invoke(new Api.auth.SignUp({ phoneNumber: phone, phoneCodeHash, firstName: 'Everyday', lastName: 'Bunch' }));
      return auth;
    }
    throw e;
  }
}
