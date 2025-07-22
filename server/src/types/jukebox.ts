
export class Jukebox {

  musicMap: { [name: string]: string } = {
    ["Song Name"]: "path/to/file.ogg",
  }

  currentlyPlaying: string | null = null
  paused: boolean = false

  loadQueue: Array<string> = []


  queueLoad(id: string): boolean {
    if (!this.musicMap[id])
      return false
    if (!this.loadQueue.includes(id)) {
      this.loadQueue.push(id)
    }
    return true
  }

  setPlaying(id: string):boolean {
    if (!this.loadQueue.includes(id)) {
      // idk print an error or something
      // probably should be a check for if its loaded or not
      return false
    }
    this.currentlyPlaying = id
    this.paused = false
    return true
  }

  togglePause() {
    this.paused = !this.paused
  }

  stopMusic() {
    this.currentlyPlaying = null
  }
}
