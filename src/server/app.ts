import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ColonynoteConfig } from '../config.js'
import { createFileRouter, createMutableConfigHolder } from './api.js'
import { IgnoreMatcher, defaultIgnoreConfig } from './ignore.js'

export function createApp(config: ColonynoteConfig) {
  const app = new Hono()

  const matcher = new IgnoreMatcher(config.dirs.map(d => d.path), {
    globalPatterns: config.ignore.patterns,
  })

  const holder = createMutableConfigHolder(config, matcher)

  app.use('*', cors())

  app.use('*', async (c, next) => {
    c.set('config', holder.config)
    await next()
  })

  const fileRouter = createFileRouter(holder)
  app.route('/api/files', fileRouter)

  return { app, matcher, holder }
}