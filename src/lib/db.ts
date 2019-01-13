import { createConnection, ConnectionOptions } from 'typeorm'
import { config } from 'config'
import { Author, BitPayInvoice, Category, CoingateOrder, Episode, FeedUrl,
  MediaRef, PayPalOrder, Playlist, Podcast, User } from 'entities'

const entities = [
  Author,
  BitPayInvoice,
  Category,
  CoingateOrder,
  Episode,
  FeedUrl,
  MediaRef,
  PayPalOrder,
  Playlist,
  Podcast,
  User
]

const options = config.dbConfig

const connectionOptions: ConnectionOptions = {
  type: 'postgres',
  host: options.host,
  port: options.port,
  username: options.username,
  password: options.password,
  database: options.database,
  synchronize: true,
  logging: false,
  entities,
  extra: {
    ssl: config.dbsslconn // if not development, will use SSL
  }
}

export const connectToDb = () => {
  return createConnection(connectionOptions)
    .then(connection => connection)
    .catch(error => console.error(error))
}
