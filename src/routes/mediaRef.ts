import * as bodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import { config } from 'config'
import { emitRouterError } from 'errors'
import { createMediaRef, deleteMediaRef, getMediaRef, getMediaRefs, updateMediaRef }
  from 'controllers/mediaRef'
import { validateMediaRefCreate } from 'middleware/validation/create'
import { validateMediaRefSearch } from 'middleware/validation/search'
import { validateMediaRefUpdate } from 'middleware/validation/update'
const createError = require('http-errors')

const router = new Router({ prefix: `${config.apiPrefix}${config.apiVersion}/mediaRef` })

router.use(bodyParser())

// Search
router.get('/',
  validateMediaRefSearch,
  async ctx => {
    try {
      const mediaRefs = await getMediaRefs(ctx.request.query)
      ctx.body = mediaRefs
    } catch (error) {
      emitRouterError(error, ctx)
    }
  })

// Get
router.get('/:id',
  async ctx => {
    try {
      const mediaRef = await getMediaRef(ctx.params.id)
      if (!mediaRef) {
        throw new createError.NotFound()
      }
      ctx.body = mediaRef
    } catch (error) {
      emitRouterError(error, ctx)
    }
  })

// Create
router.post('/',
  validateMediaRefCreate,
  async ctx => {
    try {
      const body = ctx.request.body
      const mediaRef = await createMediaRef(body)
      ctx.body = mediaRef
    } catch (error) {
      emitRouterError(error, ctx)
    }
  })

// Update
router.patch('/',
  validateMediaRefUpdate,
  async ctx => {
    try {
      const body = ctx.request.body
      const mediaRef = await updateMediaRef(body)
      ctx.body = mediaRef
    } catch (error) {
      emitRouterError(error, ctx)
    }
  })

// Delete
router.delete('/:id',
  async ctx => {
    try {
      await deleteMediaRef(ctx.params.id)
      ctx.status = 200
    } catch (error) {
      emitRouterError(error, ctx)
    }
  })

export default router