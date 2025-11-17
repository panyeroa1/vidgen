
// utils/videoRenderer.ts
import { decode, decodeRawAudioData } from './audio';

interface RenderOptions {
    width: number;
    height: number;
    sceneDuration: number; // in milliseconds
    narrationVolume: number;
    bgMusicVolume: number;
    onProgress: (progress: number, message: string) => void;
}

const defaultOptions: RenderOptions = {
    width: 1280,
    height: 720,
    sceneDuration: 5000,
    narrationVolume: 1.0,
    bgMusicVolume: 0.5,
    onProgress: () => {},
};

// Helper function to draw an image to the canvas, fitting it while preserving aspect ratio
function drawImageToCanvas(ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvasWidth: number, canvasHeight: number) {
    const canvasAspect = canvasWidth / canvasHeight;
    const imageAspect = img.width / img.height;
    let drawWidth, drawHeight, offsetX, offsetY;

    // This is a "cover" style scaling, it will fill the canvas and crop if necessary
    if (canvasAspect > imageAspect) {
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imageAspect;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
    } else {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imageAspect;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
    }
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}


export const renderVideo = (
    imageUrls: string[],
    narrationBase64: string,
    bgMusicUrl: string | null,
    userOptions: Partial<RenderOptions>
): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
        const options = { ...defaultOptions, ...userOptions };
        options.onProgress(0, "Initializing renderer...");

        const canvas = document.createElement('canvas');
        canvas.width = options.width;
        canvas.height = options.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Cannot get canvas context"));

        const audioContext = new AudioContext();
        const audioDestination = audioContext.createMediaStreamDestination();
        
        try {
            options.onProgress(5, "Decoding narration...");
            const decodedNarrationBytes = decode(narrationBase64);
            const narrationBuffer = await decodeRawAudioData(decodedNarrationBytes, audioContext);
            const narrationSource = audioContext.createBufferSource();
            narrationSource.buffer = narrationBuffer;
            const narrationGain = audioContext.createGain();
            narrationGain.gain.value = options.narrationVolume;
            narrationSource.connect(narrationGain).connect(audioDestination);
            
            if (bgMusicUrl) {
                options.onProgress(10, "Loading background music...");
                const musicBuffer = await fetch(bgMusicUrl).then(res => res.arrayBuffer()).then(buf => audioContext.decodeAudioData(buf));
                const musicSource = audioContext.createBufferSource();
                musicSource.buffer = musicBuffer;
                musicSource.loop = true;
                const musicGain = audioContext.createGain();
                musicGain.gain.value = options.bgMusicVolume;
                musicSource.connect(musicGain).connect(audioDestination);
                musicSource.start(0);
            }
            
            const supportedMimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
            const videoStream = canvas.captureStream(30);
            const audioStream = audioDestination.stream;
            const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
            
            const recorder = new MediaRecorder(combinedStream, { mimeType: supportedMimeType });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (event) => chunks.push(event.data);
            recorder.onstop = () => {
                const videoBlob = new Blob(chunks, { type: supportedMimeType });
                options.onProgress(100, "Render complete!");
                resolve(videoBlob);
                audioContext.close();
            };
            recorder.onerror = (e) => reject(e);

            options.onProgress(20, "Loading images...");
            const images = await Promise.all(
                imageUrls.map(url => new Promise<HTMLImageElement>((resolveImg, rejectImg) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => resolveImg(img);
                    img.onerror = rejectImg;
                    img.src = url;
                }))
            );

            recorder.start();
            narrationSource.start(0);

            let startTime = performance.now();
            const totalDuration = narrationBuffer.duration * 1000;
            const FADE_TIME = 500; // 0.5s fade

            function draw(time: number) {
                const elapsedTime = time - startTime;
                
                if (elapsedTime >= totalDuration) {
                    if (recorder.state === 'recording') recorder.stop();
                    return;
                }
                
                const currentSceneIndex = Math.floor(elapsedTime / options.sceneDuration);
                const timeIntoScene = elapsedTime % options.sceneDuration;
                
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, options.width, options.height);

                // Draw current image
                const currentImage = images[Math.min(currentSceneIndex, images.length - 1)];
                if (currentImage) {
                    ctx.globalAlpha = 1.0;
                    if (timeIntoScene < FADE_TIME && currentSceneIndex > 0) {
                        ctx.globalAlpha = timeIntoScene / FADE_TIME;
                    } else if (timeIntoScene > options.sceneDuration - FADE_TIME) {
                        ctx.globalAlpha = (options.sceneDuration - timeIntoScene) / FADE_TIME;
                    }
                    drawImageToCanvas(ctx, currentImage, options.width, options.height);
                }
                
                // Draw previous image for fade-in
                const prevImage = images[currentSceneIndex - 1];
                if (prevImage && timeIntoScene < FADE_TIME) {
                    ctx.globalAlpha = 1.0 - (timeIntoScene / FADE_TIME);
                    drawImageToCanvas(ctx, prevImage, options.width, options.height);
                }

                ctx.globalAlpha = 1.0;

                const progress = 20 + (elapsedTime / totalDuration) * 75;
                options.onProgress(progress, `Rendering video... ${(elapsedTime / 1000).toFixed(1)}s / ${Math.round(totalDuration / 1000)}s`);

                requestAnimationFrame(draw);
            }
            
            requestAnimationFrame(draw);

        } catch (error) {
            console.error("Video rendering failed:", error);
            reject(error);
        }
    });
};
