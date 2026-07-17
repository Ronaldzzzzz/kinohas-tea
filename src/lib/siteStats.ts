import { doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'

const COUNTER_REF_PATH = ['siteStats', 'hitCounter'] as const

/** 補零至 6 位；超過 6 位數原樣顯示 */
export function formatCounter(count: number): string {
  return String(count).padStart(6, '0')
}

/** 原子遞增訪客計數器並回傳遞增後的總數 */
export async function incrementHitCounter(): Promise<number> {
  const ref = doc(db, ...COUNTER_REF_PATH)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const current = (snap.data()?.count as number | undefined) ?? 0
    const next = current + 1
    tx.set(ref, { count: next })
    return next
  })
}
