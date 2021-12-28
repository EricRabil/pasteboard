import { CoordinatedSpotifySocket, PlayerStateEvents } from "sactivity";

describe('spotify preflight', () => {
    // general spotify sanity checks (get ready to play music, bitch)

    it('should have coookies', () => {
        expect(process.env.SPOTIFY_COOKIES).toBeDefined();
    });
});

describe('spotify client', () => {
    let socket: CoordinatedSpotifySocket;

    beforeAll(async () => {
        socket = (await CoordinatedSpotifySocket.create(process.env.SPOTIFY_COOKIES!)).socket;
    });

    it('should get a state', async () => {
        const events = new PlayerStateEvents();
        events.observe(socket);

        await new Promise(resolve => events.once("track", resolve));

        events.unobserve(socket);
    }, 1000 * 60 * 5);

    afterAll(() => {
        socket.close();
    });
});