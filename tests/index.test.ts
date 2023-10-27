import { favicon, FaviconOptions } from '../src/index'
import http from 'node:http'
import path, { dirname } from 'node:path'
import { makeFetch } from 'supertest-fetch'
import { fileURLToPath } from 'node:url'
import { describe, it, beforeEach } from 'node:test'
import { expect } from 'expect'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const FAVICON_PATH = path.join(process.cwd(), 'tests/fixtures/favicon.ico')

function createServer(path?: string | Buffer, opts?: Omit<FaviconOptions, 'path'>) {
  const _path = path || FAVICON_PATH
  const _favicon = favicon(_path, opts)
  const server = http.createServer(
    async (req, res) =>
      void _favicon(req, res, (err) => {
        res.statusCode = err ? err.status || 500 : 404
        res.end(err ? err.message : 'oops')
      })
  )

  return server
}

describe('favicon function test', () => {
  describe('args', () => {
    describe('path', () => {
      it('should accept buffer', async () => {
        const server = createServer(Buffer.alloc(20))

        await makeFetch(server)('/favicon.ico').expect(200)
      })
      it('should not be dir', async () => {
        try {
          favicon(__dirname)
        } catch (e) {
          expect((e as NodeJS.ErrnoException).message).toMatch(/EISDIR, illegal operation on directory/)
        }
      })
      it('should exist', async () => {
        try {
          favicon('nothing')
        } catch (e) {
          expect((e as NodeJS.ErrnoException).message).toMatch(/ENOENT/)
        }
      })
    })

    describe('options.maxAge', function () {
      it('should be in cache-control', async () => {
        const server = createServer(null as unknown as string, { maxAge: 5000 })
        await makeFetch(server)('/favicon.ico').expect('Cache-Control', 'public, max-age=5').expect(200)
      })

      it('should have a default', async () => {
        const server = createServer()
        await makeFetch(server)('/favicon.ico')
          .expect('Cache-Control', /public, max-age=[0-9]+/)
          .expect(200)
      })

      it('should accept 0', async () => {
        const server = createServer(null as unknown as string, { maxAge: 0 })
        await makeFetch(server)('/favicon.ico').expect('Cache-Control', 'public, max-age=0').expect(200)
      })

      it('should accept string', async () => {
        const server = createServer(null as unknown as string, { maxAge: '30d' })
        await makeFetch(server)('/favicon.ico').expect('Cache-Control', 'public, max-age=2592000').expect(200)
      })

      it('should be valid delta-seconds', async () => {
        const server = createServer(null as unknown as string, { maxAge: 1234 })
        await makeFetch(server)('/favicon.ico').expect('Cache-Control', 'public, max-age=1').expect(200)
      })
    })

    describe('requests', () => {
      let server: http.Server

      beforeEach(() => {
        server = createServer()
      })

      it('should serve icon', async () => {
        await makeFetch(server)('/favicon.ico').expect('Content-Type', 'image/x-icon').expect(200)
      })

      it('should include cache-control', async () => {
        await makeFetch(server)('/favicon.ico')
          .expect('Cache-Control', /public/)
          .expect(200)
      })

      it('should include strong etag', async () => {
        await makeFetch(server)('/favicon.ico')
          .expect('ETag', /^"[^"]+"$/)
          .expect(200)
      })

      it('should deny POST', async () => {
        await makeFetch(server)('/favicon.ico', {
          method: 'POST'
        })
          .expect('Allow', 'GET, HEAD, OPTIONS')
          .expect(405)
      })

      it('should understand OPTIONS', async () => {
        await makeFetch(server)('/favicon.ico', {
          method: 'OPTIONS'
        })
          .expect('Allow', 'GET, HEAD, OPTIONS')
          .expect(200)
      })

      it('should 304 when If-None-Match matches', async () => {
        const res = await makeFetch(server)('/favicon.ico').expect(200)

        await makeFetch(server)('/favicon.ico', {
          headers: {
            'If-None-Match': res.headers.get('etag') as string
          }
        }).expect(304)
      })

      it('should 304 when If-None-Match matches weakly', async () => {
        const res = await makeFetch(server)('/favicon.ico').expect(200)
        await makeFetch(server)('/favicon.ico', {
          headers: {
            'If-None-Match': 'W/' + res.headers.get('etag')
          }
        }).expect(304)
      })

      it('should ignore non-favicon requests', async () => {
        await makeFetch(server)('/').expect(404, 'oops')
      })

      it('should work with query string', async () => {
        await makeFetch(server)('/favicon.ico?v=1').expect('Content-Type', 'image/x-icon').expect(200)
      })
    })

    describe('icon', function () {
      describe('buffer', () => {
        it('should be served from buffer', async () => {
          const buffer = Buffer.alloc(20, '#')
          const server = createServer(buffer)

          await makeFetch(server)('/favicon.ico')
            .expectHeader('Content-Type', 'image/x-icon')
            .expectHeader('Content-Length', '20')
            .expectBody(buffer.toString())
        })

        it('should be copied', async () => {
          const buffer = Buffer.alloc(20, '#')
          const server = createServer(buffer)

          expect(buffer.toString()).toStrictEqual('####################')
          buffer.fill('?')
          expect(buffer.toString()).toStrictEqual('????????????????????')

          await makeFetch(server)('/favicon.ico')
            .expectHeader('Content-Length', '20')
            .expectHeader('Content-Type', 'image/x-icon')
            .expectBody(Buffer.from('####################').toString())
        })
      })
    })
  })
})
