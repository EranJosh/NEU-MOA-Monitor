import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth } from './firebase'

const NEU_DOMAIN = 'neu.edu.ph'

const provider = new GoogleAuthProvider()
provider.setCustomParameters({
  hd: NEU_DOMAIN,
  prompt: 'select_account',
})

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider)
  const user = result.user

  // Double-check domain even if hd hint is set
  const email = user.email || ''
  if (!email.endsWith(`@${NEU_DOMAIN}`)) {
    await signOut(auth)
    throw new Error('ACCESS_DENIED: Only @neu.edu.ph institutional accounts are permitted.')
  }

  return user
}

export const signOutUser = () => signOut(auth)
