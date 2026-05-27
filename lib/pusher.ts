import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

// Server-side Pusher instance
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

// Client-side Pusher singleton — prevents creating multiple connections
let pusherClientInstance: PusherClient | null = null

export const getPusherClient = () => {
  if (typeof window !== 'undefined') {
    if (!pusherClientInstance) {
      pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: "/api/pusher/auth",
        auth: {
           headers: {
              'X-Requested-With': 'XMLHttpRequest'
           }
        }
      })
    }
    return pusherClientInstance
  }
  return null
}
