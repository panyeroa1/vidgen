
import React, { useState, useEffect } from 'react';
import { VideoCreator } from './components/VideoCreator';
import { Sidebar } from './components/Sidebar';
import { ImageEditor } from './components/ImageEditor';
import { ResearchAssistant } from './components/ResearchAssistant';
import { AudioTranscriber } from './components/AudioTranscriber';
import { FilmIcon, PencilIcon, SparklesIcon, GlobeAltIcon, SunIcon, MoonIcon, MicrophoneIcon, ChevronRightIcon } from './components/Icons';
import type { MediaItem } from './types';
import { generateCinematicImage, generateSpeech, generatePromptsFromScript, generateScriptFromPrompt, enhanceScript, transcribeAudio, analyzeScriptStyle } from './services/geminiService';
import { SCRIPT_ENHANCER_SYSTEM_PROMPT, TTS_VOICES } from './constants';
import { renderVideo } from './utils/videoRenderer';
import { uploadFileToSupabase, createSupabaseProject, addAssetToSupabaseProject, updateSupabaseProjectWithVideo } from './services/supabaseService';
import { fileToBase64 } from './utils/file';

type Tab = 'creator' | 'editor' | 'research' | 'transcriber';
type Theme = 'light' | 'dark';
type AspectRatio = '16:9' | '1:1' | '9:16';
type SpeakerAssignment = { id: number; name: string; voice: string };
type GenerationStage = 'idle' | 'script_generating' | 'script_done' | 'media_generating' | 'media_done' | 'video_generating' | 'video_done';


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('creator');
  const [theme, setTheme] = useState<Theme>(localStorage.getItem('theme') as Theme || 'dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // === State Lifted from VideoCreator ===
  const [videoIdea, setVideoIdea] = useState('A cinematic video about the power of AI to build physical things, showing the transition from digital code to real-world structures.');
  const [bgMusicFile, setBgMusicFile] = useState<File | null>(null);
  const [narrationVolume, setNarrationVolume] = useState(1.0);
  const [bgMusicVolume, setBgMusicVolume] = useState(0.2);
  const [sceneDuration, setSceneDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [narrationVoice, setNarrationVoice] = useState('Aoede');
  const [voiceStyle, setVoiceStyle] = useState('Cinematic Film');
  const [voiceTone, setVoiceTone] = useState('Confident');
  const [speakerVoiceAssignments, setSpeakerVoiceAssignments] = useState<SpeakerAssignment[]>([
      { id: Date.now(), name: 'Narrator', voice: 'Aoede' },
  ]);
  // =====================================

  // Video Creator State - For rendering logic
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [renderState, setRenderState] = useState<{ message: string; progress: number }>({ message: '', progress: 0 });
  const [renderMediaItems, setRenderMediaItems] = useState<MediaItem[]>([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [narrationScript, setNarrationScript] = useState('');
  const [narrationAudio, setNarrationAudio] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const isProcessing = generationStage.endsWith('_generating');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const resetRenderState = () => {
        setNarrationScript('');
        setRenderMediaItems([]);
        setFinalVideoUrl(null);
        setRenderState({ message: '', progress: 0 });
        setRenderError(null);
        setGenerationStage('idle');
        setNarrationAudio(null);
        setProjectId(null);
        setSpeakerVoiceAssignments([{ id: Date.now(), name: 'Narrator', voice: 'Aoede' }]);
  };

  const handleGenerateScript = async () => {
        if (!videoIdea.trim()) {
            setRenderError("Please enter a video idea.");
            return;
        }
        resetRenderState();
        setGenerationStage('script_generating');
        setRenderState({ message: 'AI is writing the script...', progress: 50 });

        try {
            const script = await generateScriptFromPrompt(videoIdea);
            setNarrationScript(script);

            const speakerLabelsInScript = [...new Set(script.match(/^([a-zA-Z0-9\s]+):/gm) || [])]
                .map(label => label.replace(':', '').trim());
            
            if (speakerLabelsInScript.length > 0) {
                const newAssignments = speakerLabelsInScript.map((name, index) => ({
                    id: Date.now() + index,
                    name: name,
                    voice: TTS_VOICES[index % TTS_VOICES.length]
                }));
                setSpeakerVoiceAssignments(newAssignments);
            } else {
                setSpeakerVoiceAssignments([{ id: Date.now(), name: 'Narrator', voice: narrationVoice }]);
            }

            setRenderState({ message: 'Script generated!', progress: 100 });
            setGenerationStage('script_done');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setRenderError(errorMessage);
            setGenerationStage('idle');
        }
    };

    const handleAudioUpload = async (audioFile: File) => {
        resetRenderState();
        setGenerationStage('script_generating');
        setRenderState({ message: 'Transcribing your audio...', progress: 25 });
        
        try {
            const { base64, mimeType } = await fileToBase64(audioFile);
            const transcript = await transcribeAudio(base64, mimeType);
            setNarrationScript(transcript);
            
            setRenderState({ message: 'Analyzing script style...', progress: 60 });
            const styleInfo = await analyzeScriptStyle(transcript);
            setVoiceStyle(styleInfo.style);
            setVoiceTone(styleInfo.tone);

            setRenderState({ message: 'Detecting speakers...', progress: 80 });
            const speakerLabelsInScript = [...new Set(transcript.match(/^([a-zA-Z0-9\s]+):/gm) || [])]
                .map(label => label.replace(':', '').trim());
            
            if (speakerLabelsInScript.length > 0) {
                const newAssignments = speakerLabelsInScript.map((name, index) => ({
                    id: Date.now() + index,
                    name: name,
                    voice: TTS_VOICES[index % TTS_VOICES.length]
                }));
                setSpeakerVoiceAssignments(newAssignments);
            } else {
                setSpeakerVoiceAssignments([{ id: Date.now(), name: 'Narrator', voice: narrationVoice }]);
            }
            
            setRenderState({ message: 'Script ready!', progress: 100 });
            setGenerationStage('script_done');
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setRenderError(`Failed to process audio: ${errorMessage}`);
            setGenerationStage('idle');
        }
    };
  
    const handleGenerateMedia = async () => {
        if (!narrationScript) {
            setRenderError("A script must be generated first.");
            return;
        }
        setGenerationStage('media_generating');
        setRenderError(null);
        
        const params = { videoIdea, voiceStyle, voiceTone, speakerVoiceAssignments, narrationVoice, aspectRatio };

        try {
            setRenderState({ message: 'Creating project...', progress: 5 });
            const { id: newProjectId } = await createSupabaseProject(params.videoIdea, narrationScript);
            setProjectId(newProjectId);

            setRenderState({ message: 'Enhancing script for AI voice...', progress: 10 });
            const enhancerPrompt = `Please apply the following performance characteristics to the script below.\n\n- Voice Style: ${params.voiceStyle}\n- Voice Tone: ${params.voiceTone}\n\nScript:\n${narrationScript}`;
            const enhancedScript = await enhanceScript(enhancerPrompt, SCRIPT_ENHANCER_SYSTEM_PROMPT);

            setRenderState({ message: 'AI is narrating the script...', progress: 20 });
            const speakerLabelsInScript = [...new Set(enhancedScript.match(/^([a-zA-Z0-9\s]+):/gm) || [])]
                .map(label => label.replace(':', '').trim());

            let speakersForTTS: { speaker?: string; voiceName: string }[];
            if (speakerLabelsInScript.length > 0 && params.speakerVoiceAssignments.length > 0) {
                 speakersForTTS = speakerLabelsInScript.map(label => {
                    const assignment = params.speakerVoiceAssignments.find(a => a.name.trim().toLowerCase() === label.toLowerCase());
                    return { speaker: label, voiceName: assignment ? assignment.voice : params.narrationVoice };
                });
            } else {
                speakersForTTS = [{ voiceName: params.narrationVoice }];
            }

            const base64Audio = await generateSpeech(enhancedScript, speakersForTTS);
            const narrationResponse = await fetch(`data:application/octet-stream;base64,${base64Audio}`);
            const narrationBlob = await narrationResponse.blob();
            const narrationPath = `projects/${newProjectId}/audio/${crypto.randomUUID()}.raw`;
            await uploadFileToSupabase(narrationBlob, 'project_assets', narrationPath);
            await addAssetToSupabaseProject(newProjectId, 'narration', narrationPath);
            setNarrationAudio(base64Audio);

            setRenderState({ message: 'Breaking script into scenes...', progress: 40 });
            const prompts = await generatePromptsFromScript(narrationScript, params.aspectRatio);
            if (!prompts || prompts.length === 0) throw new Error("The AI could not generate any scenes from the script.");

            const generatedMedia: MediaItem[] = [];
            for (let i = 0; i < prompts.length; i++) {
                const progress = 50 + (i / prompts.length) * 50;
                setRenderState({ message: `Generating scene ${i + 1} of ${prompts.length}...`, progress });
                
                const imageUrl = await generateCinematicImage(prompts[i], params.aspectRatio);
                const imageBlob = await fetch(imageUrl).then(res => res.blob());
                const imagePath = `projects/${newProjectId}/images/${crypto.randomUUID()}.png`;
                await uploadFileToSupabase(imageBlob, 'project_assets', imagePath);
                await addAssetToSupabaseProject(newProjectId, 'image', imagePath, i);

                generatedMedia.push({ type: 'image' as const, url: imageUrl, prompt: prompts[i] });
                setRenderMediaItems([...generatedMedia]);
            }
            
            setRenderState({ message: 'Media generated!', progress: 100 });
            setGenerationStage('media_done');
        } catch (err) {
             const errorMessage = err instanceof Error ? err.message : String(err);
            setRenderError(errorMessage);
            setGenerationStage('script_done');
        }
    };

    const handleRenderVideo = async () => {
         if (renderMediaItems.length === 0 || !narrationAudio || !projectId) {
            setRenderError("Media (images and audio) must be generated first.");
            return;
        }
        setGenerationStage('video_generating');
        setRenderError(null);
        
        const params = { videoIdea, bgMusicFile, narrationVolume, bgMusicVolume, sceneDuration, aspectRatio };
        const bgMusicUrl = params.bgMusicFile ? URL.createObjectURL(params.bgMusicFile) : null;
        
        try {
            setRenderState({ message: 'Rendering final video...', progress: 15 });
            const imageUrlsToRender = renderMediaItems.map(item => item.url);
            const videoBlob = await renderVideo(imageUrlsToRender, narrationAudio, bgMusicUrl, {
                onProgress: (progress, message) => setRenderState({ message, progress: 15 + (progress / 100) * 75 }),
                narrationVolume: params.narrationVolume,
                bgMusicVolume: params.bgMusicVolume,
                sceneDuration: params.sceneDuration * 1000,
                width: params.aspectRatio === '9:16' ? 720 : (params.aspectRatio === '1:1' ? 1080 : 1280),
                height: params.aspectRatio === '9:16' ? 1280 : (params.aspectRatio === '1:1' ? 1080 : 720),
            });

            setRenderState({ message: 'Uploading final video...', progress: 95 });
            const videoFileName = `${params.videoIdea.substring(0, 20).replace(/\s+/g, '_')}_${crypto.randomUUID()}.mp4`;
            const videoPath = `projects/${projectId}/${videoFileName}`;
            const { publicUrl } = await uploadFileToSupabase(videoBlob, 'final_videos', videoPath);
            await updateSupabaseProjectWithVideo(projectId, videoPath);

            setFinalVideoUrl(publicUrl);
            setRenderState({ message: 'Done!', progress: 100 });
            setGenerationStage('video_done');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setRenderError(errorMessage);
            setGenerationStage('media_done');
        } finally {
            if (bgMusicUrl) URL.revokeObjectURL(bgMusicUrl);
        }
    };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'creator':
        return <VideoCreator 
                  isProcessing={isProcessing}
                  generationStage={generationStage}
                  renderState={renderState}
                  mediaItems={renderMediaItems}
                  finalVideoUrl={finalVideoUrl}
                  renderError={renderError}
                  narrationScript={narrationScript}
                  onReset={resetRenderState}
                  videoIdea={videoIdea}
                  setVideoIdea={setVideoIdea}
                  onAudioUpload={handleAudioUpload}
                />;
      case 'editor':
        return <ImageEditor />;
      case 'research':
        return <ResearchAssistant />;
      case 'transcriber':
        return <AudioTranscriber />;
      default:
        return null;
    }
  };
  
  const TabButton: React.FC<{tabName: Tab, label: string, icon: React.ReactNode}> = ({tabName, label, icon}) => (
      <button
        onClick={() => setActiveTab(tabName)}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-300 ease-in-out text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          activeTab === tabName 
            ? 'bg-primary-soft text-primary' 
            : 'text-text-muted hover:bg-surface-alt hover:text-main'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
  );

  return (
    <div className="min-h-screen bg-bg text-text-muted font-sans flex flex-col">
      <header className="bg-surface/80 backdrop-blur-sm sticky top-0 z-20 w-full border-b border-border-strong">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <SparklesIcon className="w-8 h-8 text-primary" />
             <h1 className="text-2xl font-bold text-main font-display">Eburon Media Suite</h1>
          </div>
          <nav className="hidden md:flex items-center gap-2">
              <TabButton tabName="creator" label="Video Creator" icon={<FilmIcon className="w-5 h-5" />} />
              <TabButton tabName="editor" label="Image Studio" icon={<PencilIcon className="w-5 h-5" />} />
              <TabButton tabName="research" label="AI Research" icon={<GlobeAltIcon className="w-5 h-5" />} />
              <TabButton tabName="transcriber" label="Audio Transcriber" icon={<MicrophoneIcon className="w-5 h-5" />} />
          </nav>
          <div className="flex items-center">
            <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <MoonIcon className="w-6 h-6 text-text-muted" />
                ) : (
                  <SunIcon className="w-6 h-6 text-text-muted" />
                )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'creator' && isSidebarOpen && (
            <Sidebar
                isProcessing={isProcessing}
                generationStage={generationStage}
                onGenerateScript={handleGenerateScript}
                onGenerateMedia={handleGenerateMedia}
                onRenderVideo={handleRenderVideo}
                onToggle={() => setIsSidebarOpen(false)}
                aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                narrationVoice={narrationVoice} setNarrationVoice={setNarrationVoice}
                voiceStyle={voiceStyle} setVoiceStyle={setVoiceStyle}
                voiceTone={voiceTone} setVoiceTone={setVoiceTone}
                speakerVoiceAssignments={speakerVoiceAssignments} setSpeakerVoiceAssignments={setSpeakerVoiceAssignments}
                bgMusicFile={bgMusicFile} setBgMusicFile={setBgMusicFile}
                sceneDuration={sceneDuration} setSceneDuration={setSceneDuration}
                narrationVolume={narrationVolume} setNarrationVolume={setNarrationVolume}
                bgMusicVolume={bgMusicVolume} setBgMusicVolume={setBgMusicVolume}
            />
        )}
        
        <main className="flex-1 overflow-y-auto relative">
             {activeTab === 'creator' && !isSidebarOpen && (
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="fixed top-20 left-4 bg-surface p-2 rounded-full shadow-md border border-border-strong text-text-muted hover:bg-surface-alt hover:text-main z-20"
                    aria-label="Open settings sidebar"
                >
                    <ChevronRightIcon className="w-6 h-6"/>
                </button>
            )}
            <div className="container mx-auto p-4 md:p-6">
                <div className="animate-fade-in">
                    {renderTabContent()}
                </div>
            </div>
            <footer className="w-full text-center p-4 border-t border-border-strong mt-8">
                <p className="text-sm text-text-subtle">&copy; {new Date().getFullYear()} Eburon Media Suite. Powered by AI.</p>
            </footer>
        </main>
      </div>

      {isProcessing && (
        <div className="fixed bottom-6 right-6 bg-surface shadow-soft p-4 rounded-lg w-full max-w-sm z-50 animate-fade-in border border-border-strong">
            <div className="flex items-center justify-between mb-2">
                 <h4 className="font-bold text-main">Render in Progress</h4>
                 <div className="w-5 h-5 border-2 border-primary-soft border-t-primary rounded-full animate-spin"></div>
            </div>
            <p className="text-sm text-text-muted truncate">{renderState.message}</p>
            <div className="w-full bg-surface-alt rounded-full h-2 mt-3">
                <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${renderState.progress}%` }}></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
