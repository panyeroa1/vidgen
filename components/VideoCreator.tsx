
import React, { useRef, useState } from 'react';
import { samplePrompts } from '../constants';
import { Spinner } from './Spinner';
import { FilmIcon, ArrowDownTrayIcon, ArrowPathIcon } from './Icons';
import type { MediaItem } from '../types';

type GenerationStage = 'idle' | 'script_generating' | 'script_done' | 'media_generating' | 'media_done' | 'video_generating' | 'video_done';

interface VideoCreatorProps {
    isProcessing: boolean;
    generationStage: GenerationStage;
    renderState: { message: string; progress: number };
    mediaItems: MediaItem[];
    finalVideoUrl: string | null;
    renderError: string | null;
    narrationScript: string;
    onReset: () => void;
    
    // State from App.tsx
    videoIdea: string;
    setVideoIdea: (idea: string) => void;
    onAudioUpload: (file: File) => void;
}

export const VideoCreator: React.FC<VideoCreatorProps> = ({
    isProcessing,
    generationStage,
    renderState,
    mediaItems,
    finalVideoUrl,
    renderError,
    narrationScript,
    onReset,
    videoIdea,
    setVideoIdea,
    onAudioUpload
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [inputMode, setInputMode] = useState<'text' | 'audio'>('text');

    const handleSamplePromptChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedScript = event.target.value;
        setVideoIdea(selectedScript || '');
    };
    
    const handleDownload = () => {
        if (!finalVideoUrl) return;
        const a = document.createElement('a');
        a.href = finalVideoUrl;
        a.download = 'ai_generated_video.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    
    const isActionable = generationStage === 'video_done' || !!renderError;

    return (
        <div className="space-y-8">
            {/* Previewer is now at the top */}
            <div className="bg-surface p-6 rounded-lg shadow-soft flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-main font-display">Preview & Download</h2>
                    <div className="flex items-center gap-2">
                        {isActionable && (
                             <button onClick={onReset} className="flex items-center justify-center gap-2 bg-surface-alt hover:bg-surface-alt/80 text-text-main font-bold py-2 px-4 rounded-lg transition duration-300 text-sm">
                                <ArrowPathIcon className="w-5 h-5"/>
                                Start Over
                            </button>
                        )}
                        <button onClick={handleDownload} disabled={!finalVideoUrl || isProcessing} className="flex items-center justify-center gap-2 bg-primary hover:bg-opacity-80 text-[#050509] font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-surface-alt disabled:text-text-disabled disabled:cursor-not-allowed text-sm">
                            <ArrowDownTrayIcon className="w-5 h-5"/>
                            Download Video
                        </button>
                    </div>
                </div>
                <div className="aspect-video bg-black rounded-md overflow-hidden relative flex items-center justify-center text-text-muted">
                   {finalVideoUrl && !isProcessing ? (
                       <video ref={videoRef} src={finalVideoUrl} controls className="w-full h-full" />
                   ) : (
                       <div className="text-center p-4">
                           <FilmIcon className="w-16 h-16 mx-auto text-primary/50"/>
                           <p className="mt-2">Your rendered video will appear here</p>
                       </div>
                   )}

                    {isProcessing && (
                         <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4">
                            <Spinner message={renderState.message} />
                            <div className="w-full bg-surface-alt rounded-full h-2.5 mt-4 max-w-sm">
                                <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${renderState.progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Prompt input with tabs */}
            <div className="bg-surface p-6 rounded-lg shadow-soft space-y-4">
                 <h2 className="text-2xl font-bold text-main font-display">Start Your Project</h2>
                 <div className="flex border-b border-border-strong">
                    <button 
                        onClick={() => setInputMode('text')}
                        disabled={generationStage !== 'idle'}
                        className={`px-4 py-2 font-medium text-sm transition-colors disabled:opacity-50 ${inputMode === 'text' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:bg-surface-alt'}`}
                    >
                        Write an Idea
                    </button>
                    <button 
                        onClick={() => setInputMode('audio')}
                        disabled={generationStage !== 'idle'}
                        className={`px-4 py-2 font-medium text-sm transition-colors disabled:opacity-50 ${inputMode === 'audio' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:bg-surface-alt'}`}
                    >
                        Upload Narration
                    </button>
                </div>

                {inputMode === 'text' && (
                    <div className="animate-fade-in space-y-4 pt-2">
                        <div>
                            <label htmlFor="sample-prompts" className="block text-sm font-medium text-text-muted mb-1">
                                Or start with a sample idea
                            </label>
                            <select
                                id="sample-prompts"
                                onChange={handleSamplePromptChange}
                                className="w-full p-3 bg-bg border border-border-strong rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                disabled={generationStage !== 'idle'}
                            >
                                <option value="">-- Select a sample idea --</option>
                                {samplePrompts.map((prompt, index) => (
                                    <option key={index} value={prompt.script}>{prompt.title}</option>
                                ))}
                            </select>
                        </div>
                        <textarea
                            id="video-idea"
                            value={videoIdea}
                            onChange={(e) => setVideoIdea(e.target.value)}
                            rows={4}
                            className="w-full p-3 bg-bg border border-border-strong rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-70"
                            placeholder="e.g., A cinematic video about space exploration..."
                            disabled={generationStage !== 'idle'}
                        />
                    </div>
                )}
                 {inputMode === 'audio' && (
                    <div className="animate-fade-in pt-2">
                        <label htmlFor="audio-upload" className="block text-sm font-medium text-text-muted mb-2">
                            Upload your pre-recorded narration audio file. The AI will transcribe it to create the script.
                        </label>
                        <input
                            id="audio-upload"
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    onAudioUpload(e.target.files[0]);
                                }
                            }}
                            disabled={generationStage !== 'idle'}
                            className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-[#050509] hover:file:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                )}
            </div>
            
            {renderError && <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg" role="alert">{renderError}</div>}
            
             {narrationScript && (
                <div className="bg-surface p-6 rounded-lg shadow-soft space-y-2 pt-4 animate-fade-in">
                    <h3 className="text-xl font-bold text-main">Generated Script</h3>
                    <textarea
                        id="narration"
                        readOnly
                        value={narrationScript}
                        rows={6}
                        className="w-full p-3 bg-bg border border-border-strong rounded-lg focus:outline-none cursor-default"
                    />
                </div>
            )}

            {mediaItems.length > 0 && (
                 <div className="bg-surface p-6 rounded-lg shadow-soft animate-fade-in">
                     <h3 className="text-xl font-bold text-main mb-4">Generated Scenes</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                         {mediaItems.map((item, index) => (
                             <img
                                key={index}
                                src={item.url}
                                alt={item.prompt}
                                title={item.prompt}
                                className="rounded-lg shadow-md aspect-video object-cover border-2 border-transparent" />
                         ))}
                     </div>
                </div>
            )}
        </div>
    );
};
