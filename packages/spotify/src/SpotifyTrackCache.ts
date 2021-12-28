import { SpotifyTrack } from "sactivity";
import { Entity, BaseEntity, PrimaryColumn, Column } from "typeorm";

@Entity()
export default class SpotifyTrackCache extends BaseEntity {
    @PrimaryColumn({ type: "varchar" })
    id: string;

    @Column({ type: "simple-json" })
    track: SpotifyTrack;
}