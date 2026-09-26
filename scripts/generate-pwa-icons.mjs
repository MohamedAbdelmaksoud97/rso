import sharp from "sharp"
import { resolve } from "node:path"

const sourcePath = resolve("public/logo.png")
const metadata = await sharp(sourcePath).metadata()
const squareSize = Math.min(metadata.width ?? 0, metadata.height ?? 0)
if (!squareSize) throw new Error("Could not read logo dimensions")

const emblemSquare = await sharp(sourcePath)
  .extract({ left: 0, top: 0, width: squareSize, height: squareSize })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let index = 0; index < emblemSquare.data.length; index += 4) {
  const red = emblemSquare.data[index]
  const green = emblemSquare.data[index + 1]
  const blue = emblemSquare.data[index + 2]
  if (red < 40 && green < 40 && blue < 40) emblemSquare.data[index + 3] = 0
}

const emblem = await sharp(emblemSquare.data, { raw: emblemSquare.info }).trim().png().toBuffer()

async function createIcon(filename, size, scale) {
  const emblemSize = Math.round(size * scale)
  const resized = await sharp(emblem)
    .resize(emblemSize, emblemSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const inset = Math.round((size - emblemSize) / 2)
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#f7f2e8",
    },
  })
    .composite([{ input: resized, left: inset, top: inset }])
    .png()
    .toFile(resolve("public", filename))
}

await Promise.all([
  createIcon("pwa-192x192.png", 192, 0.76),
  createIcon("pwa-512x512.png", 512, 0.76),
  createIcon("pwa-maskable-512x512.png", 512, 0.66),
  createIcon("apple-touch-icon.png", 180, 0.76),
])

console.log("PWA icons generated from public/logo.png")
