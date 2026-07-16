const QUALITY_START = 0.8
const QUALITY_FLOOR = 0.5
const QUALITY_STEP = 0.1

/** 品質階梯：回傳下一階品質，低於下限回傳 null */
export function nextQuality(quality: number): number | null {
  const next = Math.round((quality - QUALITY_STEP) * 100) / 100
  return next >= QUALITY_FLOOR ? next : null
}

/**
 * 前端圖片壓縮：等比縮至長邊 maxDimension、轉 WebP，
 * 超過 targetBytes 逐階降品質(至 0.5 為止)。
 */
export async function compressImage(
  file: File,
  opts: { maxDimension?: number; targetBytes?: number } = {},
): Promise<Blob> {
  const { maxDimension = 1200, targetBytes = 200 * 1024 } = opts

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立 canvas context')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality: number | null = QUALITY_START
  let blob = await toWebP(canvas, quality)
  while (blob.size > targetBytes && (quality = nextQuality(quality)) !== null) {
    blob = await toWebP(canvas, quality)
  }
  return blob
}

function toWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('toBlob 失敗'))),
      'image/webp',
      quality,
    )
  })
}
