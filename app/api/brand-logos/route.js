import fs from 'node:fs'
import path from 'node:path'

const BRANDS_DIR = path.join(process.cwd(), 'public', 'brands')
const IMAGE_EXT = /\.(png|jpe?g|svg|webp)$/i

export async function GET() {
  const files = fs.existsSync(BRANDS_DIR)
    ? fs.readdirSync(BRANDS_DIR).filter((f) => IMAGE_EXT.test(f))
    : []

  return Response.json({ files })
}
