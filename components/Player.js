import {
  HeartIcon,
  VolumeUpIcon as VolumeDownIcon,
} from "@heroicons/react/outline";
import {
  FastForwardIcon,
  PauseIcon,
  PlayIcon,
  ReplyIcon,
  RewindIcon,
  VolumeUpIcon,
  SwitchHorizontalIcon,
} from "@heroicons/react/solid";
import { debounce } from "lodash";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { currentTrackIdState, isPlayingState } from "../atoms/songAtom";
import useSongInfo from "../hooks/useSongInfo";
import useSpotify from "../hooks/useSpotify";

function Player() {
  const spotifyApi = useSpotify();
  const { data: session, status } = useSession();
  const [currentTrackId, setCurrentIdTrack] =
    useRecoilState(currentTrackIdState);
  const [isPlaying, setIsPlaying] = useRecoilState(isPlayingState);
  const [volume, setVolume] = useState(50);

  const songInfo = useSongInfo();

  // console.log(songInfo);

  const fetchCurrentSong = () => {
    if (!songInfo) {
      spotifyApi
        .getMyCurrentPlayingTrack()
        .then((data) => {
          if (data.body?.item) {
            console.log("Now playing: ", data.body?.item);
            setCurrentIdTrack(data.body?.item?.id);

            spotifyApi
              .getMyCurrentPlaybackState()
              .then((data) => {
                setIsPlaying(data.body?.is_playing ?? false); // Default to false if null
              })
              .catch((err) => {
                console.error("Error fetching playback state:", err);
              });
          } else {
            console.log("No song is currently playing.");
          }
        })
        .catch((err) => {
          console.error("Error fetching current playing track:", err);
        });
    }
  };

  useEffect(() => {
    if (spotifyApi.getAccessToken() && !currentTrackId) {
      spotifyApi
        .getMyDevices()
        .then((data) => {
          if (data.body.devices.length === 0) {
            console.log(
              "No active Spotify devices found. Please open Spotify."
            );
          } else {
            fetchCurrentSong();
            setVolume(50);
          }
        })
        .catch((err) => {
          console.error("Error fetching devices:", err);
        });
    }
  }, [currentTrackId, spotifyApi, session]);

  const handlePlayPause = () => {
    spotifyApi
      .getMyCurrentPlaybackState()
      .then((data) => {
        if (data.body && data.body.is_playing) {
          spotifyApi
            .pause()
            .then(() => setIsPlaying(false))
            .catch((err) => {
              console.error("Error pausing playback:", err);
            });
        } else if (data.body) {
          spotifyApi
            .play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.error("Error resuming playback:", err);
            });
        } else {
          console.log("No active playback. Please start a song in Spotify.");
        }
      })
      .catch((err) => {
        console.error("Error fetching playback state:", err);
      });
  };

  useEffect(() => {
    if (volume > 0 && volume < 100) {
      debouncedAdjustVolume(volume);
    }
  }, [volume]);

  const debouncedAdjustVolume = useCallback(
    debounce((volume) => {
      if (spotifyApi.getAccessToken()) {
        spotifyApi.setVolume(volume).catch((err) => {
          console.error("Error setting volume:", err);
        });
      } else {
        console.log("No access token available for Spotify API.");
      }
    }, 500),
    []
  );

  return (
    <div className="h-24 bg-gradient-to-b from-black to-gray-900 border-gray-900 text-white grid grid-cols-3 text-xs md:text-base px-2 md:px-8">
      <div className="flex items-center space-x-4">
        <img
          className="hidden md:inline h-10 w-10"
          src={songInfo?.album.images?.[0]?.url}
          alt={songInfo?.name || "No song playing"}
        />
        <div>
          <h3>{songInfo?.name}</h3>
          <p>{songInfo?.artists?.[0]?.name}</p>
        </div>
        <HeartIcon className="hidden md:inline h-5 w-5" />
      </div>

      <div className="flex items-center justify-evenly">
        <SwitchHorizontalIcon className="button" />
        <RewindIcon
          // onClick={() => spotifyApi.skipToPrevious()} -- The API is not working
          className="button"
        />
        {isPlaying ? (
          <PauseIcon className="button w-10 h-10" onClick={handlePlayPause} />
        ) : (
          <PlayIcon onClick={handlePlayPause} className="button w-10 h-10" />
        )}
        <FastForwardIcon
          // onClick={() => spotifyApi.skipToNext()} -- The API is not working
          className="button"
        />
        <ReplyIcon className="button" />
      </div>

      <div className="flex items-center space-x-3 md:space-x-4 justify-end pr-5">
        <VolumeDownIcon
          onClick={() => volume > 0 && setVolume(volume - 10)}
          className="button"
        />
        <input
          type="range"
          className="w-14 md:w-28"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          min={0}
          max={100}
        />

        <VolumeUpIcon
          onClick={() => volume < 100 && setVolume(volume + 10)}
          className="button"
        />
      </div>
    </div>
  );
}

export default Player;
