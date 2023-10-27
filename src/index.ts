import { eTag } from '@tinyhttp/etag'
import { fresh } from 'es-fresh'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { getPathname } from '@tinyhttp/url'
import { readFileSync, statSync } from 'node:fs'

type Unit =
  | 'Years'
  | 'Year'
  | 'Yrs'
  | 'Yr'
  | 'Y'
  | 'Weeks'
  | 'Week'
  | 'W'
  | 'Days'
  | 'Day'
  | 'D'
  | 'Hours'
  | 'Hour'
  | 'Hrs'
  | 'Hr'
  | 'H'
  | 'Minutes'
  | 'Minute'
  | 'Mins'
  | 'Min'
  | 'M'
  | 'Seconds'
  | 'Second'
  | 'Secs'
  | 'Sec'
  | 's'
  | 'Milliseconds'
  | 'Millisecond'
  | 'Msecs'
  | 'Msec'
  | 'Ms'

type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>
type StringValue = `${number}` | `${number}${UnitAnyCase}` | `${number} ${UnitAnyCase}`

/**
 * Favicon options
 */
export type FaviconOptions = {
  maxAge?: number | StringValue
}

/**
 * Favicon body
 */

export type FaviconBody = {
  body: Buffer
  headers: Record<string, string>
}

const ms = (val?: StringValue | number): number | undefined => {
  if (typeof val === 'string') {
    const match = val.match(/^(\d+)([a-z]+)$/i)
    if (match) {
      const [, num, unit] = match
      const milliseconds = {
        ms: 1,
        s: 1000,
        m: 60000,
        h: 3600000,
        d: 86400000,
        w: 604800000,
        y: 31536000000
      }
      const multiplier = milliseconds[unit.toLowerCase()]
      if (multiplier) {
        return parseInt(num, 10) * multiplier
      }
    }
  }
  return val as number | undefined
}

const ONE_YEAR_MS = 60 * 60 * 24 * 365 * 1000 // 1 year

const calcMaxAge = (val?: StringValue | number) => {
  const num = typeof val === 'string' ? ms(val) : val

  return num != null ? Math.min(Math.max(0, num), ONE_YEAR_MS) : ONE_YEAR_MS
}

const createIcon = (buf: Buffer, maxAge: number): FaviconBody => ({
  body: buf,
  headers: {
    'Cache-Control': 'public, max-age=' + Math.floor(maxAge / 1000),
    ETag: eTag(buf)
  }
})

function createIsDirError(path: string) {
  const error: NodeJS.ErrnoException = new Error(`EISDIR, illegal operation on directory '${path}' `)
  error.code = 'EISDIR'
  error.errno = 28
  error.path = path
  error.syscall = 'open'
  return error
}

const isFresh = (req: IncomingMessage, res: ServerResponse) =>
  fresh(req.headers, {
    etag: res.getHeader('ETag') as string,
    'last-modified': res.getHeader('Last-Modified') as string
  })

function resolveSync(iconPath: string) {
  const path = resolve(iconPath)
  const s = statSync(path)

  if (s.isDirectory()) throw createIsDirError(path)

  return path
}

function send(req: IncomingMessage, res: ServerResponse, icon: FaviconBody) {
  // Set headers
  const headers = icon.headers
  const keys = Object.keys(headers)
  for (const key of keys) res.setHeader(key, headers[key])

  // Validate freshness
  if (isFresh(req, res)) return res.writeHead(304).end()

  // Send icon

  res.writeHead(200, {
    'Content-Length': icon.body.length,
    'Content-Type': 'image/x-icon'
  })
  res.end(icon.body)
}

/**
 * Serves the favicon located by the given `path`.
 *
 * @param path Path to icon or a buffer source
 * @param options Middleware options
 */

export function favicon(path: string | Buffer, options?: FaviconOptions) {
  let icon: FaviconBody // favicon cache
  const maxAge = calcMaxAge(options?.maxAge)

  if (Buffer.isBuffer(path)) icon = createIcon(Buffer.from(path), maxAge)
  else if (typeof path === 'string') path = resolveSync(path)

  return function favicon(req: IncomingMessage, res: ServerResponse, next?: (err?: any) => void) {
    if (getPathname(req.url) !== '/favicon.ico') return next?.()

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = req.method === 'OPTIONS' ? 200 : 405
      res.setHeader('Allow', 'GET, HEAD, OPTIONS')
      res.setHeader('Content-Length', '0')

      return res.end()
    }

    if (icon) return send(req, res, icon)

    send(req, res, (icon = createIcon(readFileSync(path), maxAge)))
  }
}
