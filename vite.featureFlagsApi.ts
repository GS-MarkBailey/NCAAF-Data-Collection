import { writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

type DeployBody = {
  version?: number
  updatedAt?: string
  flags?: Record<string, boolean>
  passphrase?: string
}

export function featureFlagsApiPlugin(): Plugin {
  return {
    name: 'feature-flags-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/deploy-feature-flags')) {
          next()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }

        let raw = ''
        req.on('data', (chunk) => {
          raw += chunk
        })
        req.on('end', () => {
          try {
            const body = JSON.parse(raw) as DeployBody
            if (!body.flags) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing feature flags.' }))
              return
            }

            body.flags['header.settings'] = true

            const payload = {
              version: body.version ?? Date.now(),
              updatedAt: body.updatedAt ?? new Date().toISOString(),
              flags: body.flags,
            }

            const target = path.join(
              server.config.root,
              'public/feature-flag-defaults.json',
            )
            writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          } catch (error) {
            res.statusCode = 500
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : 'Unable to deploy feature flags.',
              }),
            )
          }
        })
      })
    },
  }
}
