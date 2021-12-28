require("dotenv/config");

import { CoordinatedSpotifySocket, Diff, Diffed, DiffedPlayerState, isDifferent, PlayerStateEvents, PlayerStateObserver, PlayerTrackResolver, SpotifyTrack } from "sactivity";
import Pasteboard from "@pasteboard/redis";
import { PasteRegion } from "@pasteboard/core";
import SpotifyTrackCache from "./SpotifyTrackCache";
import { createConnection } from "typeorm";

const pasteboard = new Pasteboard();

pasteboard.setup()
    .then(() => createConnection())
    .then(() => CoordinatedSpotifySocket.create(process.env.SPOTIFY_COOKIES!))
    .then(async ({ socket, accessToken }) => {
        const region = new PasteRegion(".spotify");

        const playerState = new PlayerTrackResolver(async states => {
            if (!states.length) return;
            const [ { state, track } ] = states;
            const mergedState = Object.assign({}, state, { track });
            await pasteboard.put(region, JSON.stringify(mergedState));
        }, {
            accessToken,
            accessTokenRegenerator: socket.accessTokenRegenerator,
            cache: {
                async store(tracks) {
                    await SpotifyTrackCache.save(
                        Object.entries(tracks)
                            .map(([ id, track ]) => SpotifyTrackCache.create({ id, track }))
                    );
                },
                async resolve(ids) {
                    const tracks = await SpotifyTrackCache.findByIds(ids);
                    const entries = tracks.map(({ id, track }) => [id, track]);
                    return Object.fromEntries(entries);
                }
            }
        });

        playerState.observe(socket);
    });