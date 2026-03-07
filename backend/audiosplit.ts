import ffmpeg from 'fluent-ffmpeg';
import {Readable} from 'stream';
import {Response} from 'express';
import path from 'path';
import fs from 'fs';
import { on } from 'events';


// input mka file, return array of {index, codec} objects (all tracks found in file)
export async function listMkaTracks(inputFile: string) {
    return new Promise<{index: number, codec: string}[]>((resolve, reject) => {
        ffmpeg.ffprobe(inputFile, (err, metadata) => {
            if (err) {
                console.error("Error probing file:", err);
                return reject(err);
            }

            const audioStreams = metadata.streams
                .filter(s => s.codec_type === 'audio')
                .map(s => ({ index: s.index, codec: s.codec_name || 'unknown'}));

            resolve(audioStreams);
        });
    });
}


// input readable stream of mka flie, streams specified track as wav
export async function streamMkaToWav(
    inputFile: Readable, 
    trackIndex: number, 
    res: Response
    ) {

    return new Promise<void>((resolve, reject) => {

        res.setHeader('Content-Type', 'audio/wav');

        // stream
        const command = ffmpeg(inputFile)
            .inputFormat('matroska')
            .outputOptions([`-map 0:${trackIndex}`])
            .format('wav')      // mka not working with browser, might try mp3 if it's not too lossy
            .pipe(res, {end:true})
            .on('end', () => resolve())
            .on('error', (err) => reject(err));

        // stop ffmpeg in case of disconnect
        res.on('close', () => {
            command.destroy();
        });



    });


}