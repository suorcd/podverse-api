import * as Router from 'koa-router'
import type { SocialInteraction, Transcript } from 'podverse-shared'
import { config } from '~/config'
import { emitRouterError } from '~/lib/errors'
import { delimitQueryValues } from '~/lib/utility'
import {
  getEpisode,
  getEpisodeByPodcastIdAndGuid,
  getEpisodeByPodcastIdAndMediaUrl,
  getEpisodes,
  getEpisodesByCategoryIds,
  getEpisodesByPodcastIds,
  getEpisodesFromSearchEngine,
  retrieveLatestChapters
} from '~/controllers/episode'
import { parseQueryPageOptions } from '~/middleware/parseQueryPageOptions'
import { validateEpisodeSearch } from '~/middleware/queryValidation/search'
import { parseNSFWHeader } from '~/middleware/parseNSFWHeader'
import { getThreadcap } from '~/services/socialInteraction/threadcap'
import { request } from '~/lib/request'

const router = new Router({ prefix: `${config.apiPrefix}${config.apiVersion}/episode` })

const delimitKeys = ['authors', 'mediaRefs']

// Search
router.get(
  '/',
  (ctx, next) => parseQueryPageOptions(ctx, next, 'episodes'),
  validateEpisodeSearch,
  parseNSFWHeader,
  async (ctx) => {
    try {
      const { query = {} } = ctx.state
      ctx = delimitQueryValues(ctx, delimitKeys)

      let episodes

      if (query.podcastId && query.searchTitle) {
        episodes = await getEpisodesByPodcastIds(query)
      } else if (query.searchTitle) {
        episodes = await getEpisodesFromSearchEngine(query)
      } else if (query.categories) {
        episodes = await getEpisodesByCategoryIds(query)
      } else if (query.podcastId) {
        episodes = await getEpisodesByPodcastIds(query)
      } else {
        episodes = await getEpisodes(query)
      }

      ctx.body = episodes
    } catch (error) {
      emitRouterError(error, ctx)
    }
  }
)

// Get
router.get('/:id', parseNSFWHeader, async (ctx) => {
  try {
    const episode = await getEpisode(ctx.params.id)

    ctx.body = episode
  } catch (error) {
    emitRouterError(error, ctx)
  }
})

router.get('/:id/retrieve-latest-chapters', async (ctx) => {
  try {
    if (!ctx.params.id) throw new Error('An episodeId is required.')
    const latestChapters = await retrieveLatestChapters(ctx.params.id)
    ctx.body = latestChapters
  } catch (error) {
    emitRouterError(error, ctx)
  }
})

const transcriptHandler = async (ctx) => {
  try {
    if (!ctx.params.id) throw new Error('An episodeId is required.')
    const episode = await getEpisode(ctx.params.id)
    if (!episode) {
      throw new Error('No episode found with that id.')
    }
    if (!episode.transcript || episode.transcript.length === 0) {
      throw new Error('No transcripts found for episode.')
    }

    let matchingTranscript: Transcript | undefined
    if (ctx.params.language) {
      matchingTranscript = episode.transcript.find(
        (item: Transcript) => item.language && item.language === ctx.params.language
      )
    }

    if (!matchingTranscript) {
      matchingTranscript = episode.transcript.find(
        (item: Transcript) =>
          item.type &&
          (item.type === 'text/html' ||
            item.type === 'application/json' ||
            item.type === 'application/srt' ||
            item.type === 'text/srt' ||
            item.type === 'text/vtt' ||
            item.type === 'application/x-subrip')
      )
      if (!matchingTranscript) {
        matchingTranscript = episode.transcript[0]
      }
    }

    const finalUrl = matchingTranscript?.url

    if (!finalUrl) {
      throw new Error('No transcript url found for episode.')
    }

    const body = await request(finalUrl)

    ctx.body = {
      url: matchingTranscript.url,
      type: matchingTranscript.type,
      rel: matchingTranscript.rel,
      data: body
    }
  } catch (error) {
    emitRouterError(error, ctx)
  }
}

router.get('/:id/proxy/transcript/:language', async (ctx) => {
  return await transcriptHandler(ctx)
})

router.get('/:id/proxy/transcript', async (ctx) => {
  return await transcriptHandler(ctx)
})

router.get('/:id/proxy/activity-pub', async (ctx) => {
  try {
    if (!ctx.params.id) throw new Error('An episodeId is required.')
    const episode = await getEpisode(ctx.params.id)
    if (!episode) {
      throw new Error('No episode found with that id.')
    }
    if (!episode.socialInteraction || episode.socialInteraction.length === 0) {
      throw new Error('No socialInteraction value found for episode.')
    }
    const activityPub = episode.socialInteraction.find(
      (item: SocialInteraction) =>
        item.protocol === 'activitypub' ||
        item.platform === 'activitypub' ||
        item.platform === 'castopod' ||
        item.platform === 'mastodon' ||
        item.platform === 'peertube'
    )

    const finalUrl = activityPub?.uri || activityPub?.url

    if (!finalUrl) {
      throw new Error('No activityPub uri or url found for episode.')
    }

    const protocol = 'activitypub'
    const body = await getThreadcap(finalUrl, protocol)
    ctx.body = body
  } catch (error) {
    emitRouterError(error, ctx)
  }
})

router.get('/:id/proxy/twitter', async (ctx) => {
  try {
    if (!ctx.params.id) throw new Error('An episodeId is required.')
    const episode = await getEpisode(ctx.params.id)
    if (!episode) {
      throw new Error('No episode found with that id.')
    }
    if (!episode.socialInteraction || episode.socialInteraction.length === 0) {
      throw new Error('No socialInteraction value found for episode.')
    }

    const twitter = episode.socialInteraction.find(
      (item: SocialInteraction) => item.protocol === 'twitter' || item.platform === 'twitter'
    )

    const finalUrl = twitter?.uri || twitter?.url

    if (!finalUrl) {
      throw new Error('No twitter uri or url found for episode.')
    }

    const protocol = 'twitter'
    const body = await getThreadcap(finalUrl, protocol, config.twitterAPIBearerToken)
    ctx.body = body
  } catch (error) {
    emitRouterError(error, ctx)
  }
})

// Get Episode by GUID
router.post('/get-by-guid', parseNSFWHeader, async (ctx) => {
  try {
    const body: any = ctx.request.body
    const { episodeGuid, podcastId } = body
    const results = await getEpisodeByPodcastIdAndGuid(podcastId, episodeGuid)
    ctx.body = results
  } catch (error) {
    emitRouterError(error, ctx)
  }
})

// Get Episode by mediaUrl
router.post('/get-by-media-url', parseNSFWHeader, async (ctx) => {
  try {
    const body: any = ctx.request.body
    const { episodeMediaUrl, podcastId } = body
    const results = await getEpisodeByPodcastIdAndMediaUrl(podcastId, episodeMediaUrl)
    ctx.body = results
  } catch (error) {
    emitRouterError(error, ctx)
  }
})

// Get Episode by guid
router.post('/get-by-guid', parseNSFWHeader, async (ctx) => {
  try {
    const body: any = ctx.request.body
    const { episodeGuid, podcastId } = body
    const results = await getEpisodeByPodcastIdAndGuid(podcastId, episodeGuid)
    ctx.body = results
  } catch (error) {
    emitRouterError(error, ctx)
  }
})

export const episodeRouter = router
