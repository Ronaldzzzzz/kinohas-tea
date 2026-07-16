/**
 * 在正式 Firestore 建立管理員帳號。
 * 用法: node scripts/seed-admin.mjs <密碼> [名稱]
 *
 * 讀取 .env.production 的 Firebase 設定，以匿名登入通過安全規則後
 * 寫入 adminPasswords/{sha256(密碼)}。密碼只在本機處理，不會上傳明文。
 */
import { createHash } from 'node:crypto'
import { config } from 'dotenv'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'

config({ path: new URL('../.env.production', import.meta.url).pathname })

const [password, label = 'admin'] = process.argv.slice(2)
if (!password) {
  console.error('用法: node scripts/seed-admin.mjs <密碼> [名稱]')
  process.exit(1)
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})

const hash = createHash('sha256').update(password).digest('hex')

try {
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const ref = doc(db, 'adminPasswords', hash)
  await setDoc(ref, { role: 'owner', label })
  const snap = await getDoc(ref)
  console.log('✔ 管理員帳號已建立:', snap.data())
  console.log('  文件 ID:', hash)
  process.exit(0)
} catch (err) {
  console.error('✘ 建立失敗:', err.message)
  console.error('  請確認 Authentication 已啟用「匿名登入」，且 .env.production 設定正確。')
  process.exit(1)
}
