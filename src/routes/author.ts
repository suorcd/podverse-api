import * as Router from 'koa-router'
import { config } from 'config'
import { emitRouterError } from 'errors'
import { getAuthor, getAuthors } from 'controllers/author'
import { validateAuthorSearch } from 'middleware/validation/search'
const createError = require('http-errors')

const router = new Router({ prefix: `${config.apiPrefix}${config.apiVersion}/author` })

// Search
router.get('/',
  validateAuthorSearch,
  async ctx => {
    try {
      const authors = await getAuthors(ctx.request.query)
      ctx.body = authors
    } catch (error) {
      emitRouterError(error, ctx)
    }
  }
)

// Get
router.get('/:id',
  async ctx => {
    try {
      const author = await getAuthor(ctx.params.id)
      if (!author) {
        throw new createError.NotFound()
      }
      ctx.body = author
    } catch (error) {
      emitRouterError(error, ctx)
    }
  })

export default router