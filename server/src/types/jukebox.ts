import fs from 'fs';

let currentlyPlaying: string | null = null;
let paused: boolean = false;

let loadQueue: string[] = [];

export const Jukebox = {
  queueLoad(id: string): boolean {
    if (!fs.existsSync(`../client/assets/music/${id}.json`))
      return false;
    if (!loadQueue.includes(id)) {
      loadQueue.push(id)
    }
    return true;
  },

  setPlaying(id: string): boolean {
    if (!loadQueue.includes(id)) {
      // idk print an error or something
      // probably should be a check for if its loaded or not
      return false;
    }
    currentlyPlaying = id;
    paused = false;
    return true;
  },

  togglePause() {
    paused = !paused;
  },

  stopMusic() {
    currentlyPlaying = null;
  },

  isPlaying() {
    return currentlyPlaying != null && !paused;
  },

  getCurrent() {
    return currentlyPlaying;
  }
}
