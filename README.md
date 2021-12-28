# pasteboard!
pasteboard is a service I wrote for dumping volatile data that I want to use in other spots, that aren't conveniently streamable otherwise.

it is backed by redis, and adapters are implemented that set and publish changes to redis via RedisJSON. there can be numerous independent adapters working in harmony. there is also an HTTP server that acts as a frontend for accessing this data through either REST or WebSocket.
