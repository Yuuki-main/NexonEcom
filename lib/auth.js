import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}
