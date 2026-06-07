declare module 'dropzone' {
  export type DropzoneOptions = {
    url: string
    method?: string
    autoProcessQueue?: boolean
    clickable?: boolean | string | HTMLElement | Array<string | HTMLElement>
    maxFiles?: number
    acceptedFiles?: string | null
    addRemoveLinks?: boolean
    disablePreviews?: boolean
    dictDefaultMessage?: string
  }

  export default class Dropzone {
    static autoDiscover: boolean

    constructor(element: HTMLElement | string, options?: DropzoneOptions)

    on(eventName: string, callback: (...args: any[]) => void): this
    removeAllFiles(cancelIfNecessary?: boolean): void
    destroy(): void
  }
}
