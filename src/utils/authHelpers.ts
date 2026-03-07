import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const USERNAME_COLLECTION = 'usernames';
const USER_PROFILE_COLLECTION = 'userProfiles';
const USERNAME_EMAIL_DOMAIN = 'username-login.ourtraveldiary.app';

function createAuthError(code: string, message?: string) {
  const error: any = new Error(message || code);
  error.code = code;
  return error;
}

export function isEmailIdentifier(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string {
  const username = value.trim();
  if (!username) return 'Username is required.';
  if (username.length < 3 || username.length > 20) {
    return 'Username must be 3 to 20 characters long.';
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return 'Username can only use letters, numbers, dot, underscore, and hyphen.';
  }
  return '';
}

export function usernameToSyntheticEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

async function saveUserProfile(params: {
  uid: string;
  loginEmail: string;
  originalEmail?: string;
  username?: string;
}) {
  const { uid, loginEmail, originalEmail = '', username = '' } = params;

  await setDoc(
    doc(db, USER_PROFILE_COLLECTION, uid),
    {
      uid,
      loginEmail,
      email: originalEmail,
      username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  if (username) {
    await setDoc(
      doc(db, USERNAME_COLLECTION, normalizeUsername(username)),
      {
        uid,
        username: normalizeUsername(username),
        email: loginEmail,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}

export async function resolveIdentifierToEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();

  if (!trimmed) {
    throw createAuthError('auth/missing-identifier', 'Please enter your email or username.');
  }

  if (isEmailIdentifier(trimmed)) {
    return trimmed.toLowerCase();
  }

  const username = normalizeUsername(trimmed);
  const usernameDoc = await getDoc(doc(db, USERNAME_COLLECTION, username));

  if (!usernameDoc.exists()) {
    throw createAuthError('auth/user-not-found', 'Username not found.');
  }

  const data = usernameDoc.data();
  if (!data?.email) {
    throw createAuthError('auth/user-not-found', 'Username is not linked to a valid login email.');
  }

  return String(data.email);
}

export async function createAccountWithIdentifier(identifier: string, password: string) {
  const trimmed = identifier.trim();

  if (!trimmed) {
    throw createAuthError('auth/missing-identifier', 'Please enter your email or username.');
  }

  if (isEmailIdentifier(trimmed)) {
    const email = trimmed.toLowerCase();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserProfile({
      uid: credential.user.uid,
      loginEmail: email,
      originalEmail: email,
    });
    return credential;
  }

  const validationError = validateUsername(trimmed);
  if (validationError) {
    throw createAuthError('auth/invalid-username', validationError);
  }

  const normalizedUsername = normalizeUsername(trimmed);
  const usernameRef = doc(db, USERNAME_COLLECTION, normalizedUsername);
  const existingUsername = await getDoc(usernameRef);

  if (existingUsername.exists()) {
    throw createAuthError('auth/username-already-in-use', 'This username is already taken.');
  }

  const syntheticEmail = usernameToSyntheticEmail(normalizedUsername);
  const credential = await createUserWithEmailAndPassword(auth, syntheticEmail, password);

  await updateProfile(credential.user, {
    displayName: trimmed,
  });

  await saveUserProfile({
    uid: credential.user.uid,
    loginEmail: syntheticEmail,
    username: normalizedUsername,
  });

  return credential;
}

export async function signInWithIdentifier(identifier: string, password: string) {
  const email = await resolveIdentifierToEmail(identifier);
  return signInWithEmailAndPassword(auth, email, password);
}
