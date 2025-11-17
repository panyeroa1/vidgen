
import React from 'react';
import { TTS_VOICES, VOICE_STYLES, VOICE_TONES } from '../constants';
import { SparklesIcon, XCircleIcon, ChevronLeftIcon } from './Icons';

type AspectRatio = '16:9' | '1:1' | '9:16';
type SpeakerAssignment = { id: number; name: string; voice: string };
type GenerationStage = 'idle' | 'script_generating' | 'script_done' | 'media_generating' | 'media_done' | 'video_generating' | 'video_done';


interface SidebarProps {
    isProcessing: boolean;
    generationStage: GenerationStage;
    onGenerateScript: () => void;
    onGenerateMedia: () => void;
    onRenderVideo: () => void;
    onToggle: () => void;

    // State and setters
    aspectRatio: AspectRatio;
    setAspectRatio: (ratio: AspectRatio) => void;
    narrationVoice: string;
    setNarrationVoice: (voice: string) => void;
    voiceStyle: string;
    setVoiceStyle: (style: string) => void;
    voiceTone: string;
    setVoiceTone: (tone: string) => void;
    speakerVoiceAssignments: SpeakerAssignment[];
    setSpeakerVoiceAssignments: (assignments: SpeakerAssignment[]) => void;
    bgMusicFile: File | null;
    setBgMusicFile: (file: File | null) => void;
    sceneDuration: number;
    setSceneDuration: (duration: number) => void;
    narrationVolume: number;
    setNarrationVolume: (volume: number) => void;
    bgMusicVolume: number;
    setBgMusicVolume: (volume: number) => void;
}

const AspectRatioButton: React.FC<{
    ratio: AspectRatio,
    label: string,
    currentRatio: AspectRatio,
    setRatio: (ratio: AspectRatio) => void
}> = ({ ratio, label, currentRatio, setRatio }) => {
    const isActive = currentRatio === ratio;
    return (
        <button
            onClick={() => setRatio(ratio)}
            className={`flex-1 p-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-[#050509] shadow' : 'bg-bg hover:bg-surface-alt'}`}
        >
            <div>{ratio}</div>
            <div className="text-xs opacity-70">{label}</div>
        </button>
    );
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const {
        isProcessing, generationStage, onGenerateScript, onGenerateMedia, onRenderVideo, onToggle,
        aspectRatio, setAspectRatio,
        narrationVoice, setNarrationVoice,
        voiceStyle, setVoiceStyle,
        voiceTone, setVoiceTone,
        speakerVoiceAssignments, setSpeakerVoiceAssignments,
        bgMusicFile, setBgMusicFile,
        sceneDuration, setSceneDuration,
        narrationVolume, setNarrationVolume,
        bgMusicVolume, setBgMusicVolume
    } = props;

    const handleBgMusicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setBgMusicFile(file || null);
    };

    const handleSpeakerAssignmentChange = (index: number, field: 'name' | 'voice', value: string) => {
        const newAssignments = [...speakerVoiceAssignments];
        newAssignments[index] = { ...newAssignments[index], [field]: value };
        setSpeakerVoiceAssignments(newAssignments);
    };

    const addSpeakerAssignment = () => {
        setSpeakerVoiceAssignments([
            ...speakerVoiceAssignments,
            { id: Date.now(), name: '', voice: TTS_VOICES[0] }
        ]);
    };

    const removeSpeakerAssignment = (id: number) => {
        if (speakerVoiceAssignments.length <= 1) return;
        setSpeakerVoiceAssignments(speakerVoiceAssignments.filter((assignment) => assignment.id !== id));
    };

    const getButtonProps = () => {
        switch (generationStage) {
            case 'script_done':
                return { onClick: onGenerateMedia, text: 'Generate Audio & Scenes', disabled: isProcessing };
            case 'media_done':
                return { onClick: onRenderVideo, text: 'Render Final Video', disabled: isProcessing };
            case 'video_done':
                return { onClick: () => {}, text: 'Render Complete', disabled: true };
            case 'script_generating':
            case 'media_generating':
            case 'video_generating':
                return { onClick: () => {}, text: 'Generating...', disabled: true };
            case 'idle':
            default:
                return { onClick: onGenerateScript, text: 'Generate Script', disabled: isProcessing };
        }
    };
    const buttonProps = getButtonProps();


    return (
        <aside className="w-96 bg-surface flex-shrink-0 p-6 flex flex-col space-y-6 overflow-y-auto border-r border-border-strong relative animate-fade-in">
            <button onClick={onToggle} className="absolute top-4 -right-4 bg-surface p-1.5 rounded-full border border-border-strong text-text-muted hover:bg-surface-alt hover:text-main z-20">
                <ChevronLeftIcon className="w-5 h-5"/>
            </button>
            
            <h2 className="text-2xl font-bold text-main font-display">Render Settings</h2>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-main">Visuals</h3>
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Aspect Ratio</label>
                    <div className="flex items-center gap-2 p-1 bg-bg rounded-lg border border-border-strong">
                        <AspectRatioButton ratio="16:9" label="Landscape" currentRatio={aspectRatio} setRatio={setAspectRatio} />
                        <AspectRatioButton ratio="1:1" label="Square" currentRatio={aspectRatio} setRatio={setAspectRatio} />
                        <AspectRatioButton ratio="9:16" label="Portrait" currentRatio={aspectRatio} setRatio={setAspectRatio} />
                    </div>
                </div>
                 <div>
                    <label htmlFor="scene-duration" className="flex justify-between text-sm font-medium text-text-muted">
                        <span>Scene Duration</span>
                        <span>{sceneDuration.toFixed(1)}s</span>
                    </label>
                    <input
                        id="scene-duration"
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={sceneDuration}
                        onChange={(e) => setSceneDuration(parseFloat(e.target.value))}
                        className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-divider">
                <h3 className="text-lg font-semibold text-main">Audio</h3>
                 <div>
                    <label htmlFor="narration-voice" className="block text-sm font-medium text-text-muted mb-1">
                        Narration Voice (Default)
                    </label>
                    <select
                        id="narration-voice"
                        value={narrationVoice}
                        onChange={(e) => setNarrationVoice(e.target.value)}
                        className="w-full p-3 bg-bg border border-border-strong rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    >
                        {TTS_VOICES.map((voice) => (
                            <option key={voice} value={voice}>{voice}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="voice-style" className="block text-sm font-medium text-text-muted mb-1">
                            Voice Style
                        </label>
                        <select
                            id="voice-style"
                            value={voiceStyle}
                            onChange={(e) => setVoiceStyle(e.target.value)}
                            className="w-full p-3 bg-bg border border-border-strong rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        >
                            {VOICE_STYLES.map((style) => (
                                <option key={style} value={style}>{style}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="voice-tone" className="block text-sm font-medium text-text-muted mb-1">
                            Voice Tone
                        </label>
                        <select
                            id="voice-tone"
                            value={voiceTone}
                            onChange={(e) => setVoiceTone(e.target.value)}
                            className="w-full p-3 bg-bg border border-border-strong rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        >
                            {VOICE_TONES.map((tone) => (
                                <option key={tone} value={tone}>{tone}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="pt-4 border-t border-divider">
                    <label className="block text-sm font-medium text-text-muted mb-2">
                        Multi-Speaker Voice Assignments
                        <span className="text-xs block text-text-subtle">Detected from script. Assign voices below.</span>
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {speakerVoiceAssignments.map((assignment, index) => (
                            <div key={assignment.id} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Speaker Name"
                                    value={assignment.name}
                                    onChange={(e) => handleSpeakerAssignmentChange(index, 'name', e.target.value)}
                                    className="w-full p-2 bg-bg border border-border-strong rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none text-sm"
                                />
                                <select
                                    value={assignment.voice}
                                    onChange={(e) => handleSpeakerAssignmentChange(index, 'voice', e.target.value)}
                                    className="w-full p-2 bg-bg border border-border-strong rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none text-sm"
                                >
                                    {TTS_VOICES.map((voice) => (
                                        <option key={voice} value={voice}>{voice}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => removeSpeakerAssignment(assignment.id)}
                                    disabled={speakerVoiceAssignments.length <= 1}
                                    className="p-2 text-text-subtle hover:text-error disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Remove speaker"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={addSpeakerAssignment}
                        className="mt-2 text-sm font-medium text-primary hover:text-opacity-80"
                    >
                        + Add Speaker Assignment
                    </button>
                </div>

                 <div>
                    <label htmlFor="bg-music-upload" className="block text-sm font-medium text-text-muted mb-1">
                        Background Music (Optional)
                    </label>
                    <input
                        id="bg-music-upload"
                        type="file"
                        accept="audio/*"
                        onChange={handleBgMusicChange}
                        className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-bg file:text-primary hover:file:bg-surface-alt cursor-pointer border border-border-strong rounded-md"
                    />
                    {bgMusicFile && <p className="text-xs text-text-subtle mt-1 truncate">Selected: {bgMusicFile.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="narration-volume" className="flex justify-between text-sm font-medium text-text-muted">
                            <span>Narration Volume</span>
                            <span>{Math.round(narrationVolume * 100)}%</span>
                        </label>
                        <input
                            id="narration-volume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={narrationVolume}
                            onChange={(e) => setNarrationVolume(parseFloat(e.target.value))}
                            className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="bg-music-volume" className="flex justify-between text-sm font-medium text-text-muted">
                            <span>Music Volume</span>
                            <span>{Math.round(bgMusicVolume * 100)}%</span>
                        </label>
                        <input
                            id="bg-music-volume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={bgMusicVolume}
                            onChange={(e) => setBgMusicVolume(parseFloat(e.target.value))}
                            disabled={!bgMusicFile}
                            className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-divider">
                 <button
                    onClick={buttonProps.onClick}
                    disabled={buttonProps.disabled}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-opacity-80 text-[#050509] font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-surface-alt disabled:text-text-disabled disabled:cursor-not-allowed"
                >
                   <SparklesIcon className="w-5 h-5"/> {buttonProps.text}
                </button>
            </div>

        </aside>
    );
};
