
import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";
import type { GeolocationCoordinates, PexelsPhotoSearchResponse, PexelsVideoSearchResponse } from '../types';
import { PROMPT_GENERATOR_SYSTEM_PROMPT, SCRIPT_GENERATOR_SYSTEM_PROMPT, THUMBNAIL_TITLE_PROMPT, VOICE_STYLES, VOICE_TONES } from "../constants";

const getAiClient = () => {
    // API key is automatically injected by the environment
    if (!process.env.API_KEY) {
        // In a real app, you might want to handle this more gracefully.
        // For this context, we assume the key is always present.
        console.warn("API_KEY environment variable not set.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateScriptFromPrompt = async (prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SCRIPT_GENERATOR_SYSTEM_PROMPT,
        },
    });
    return response.text.trim();
};

export const generateCinematicImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const ai = getAiClient();

    // The new system prompt for generating prompts is now responsible for the full visual style.
    // The prompt received here should already be complete.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const candidate = response.candidates?.[0];

    // It's crucial to check for a blocked response first.
    if (response.promptFeedback?.blockReason) {
        throw new Error(`Image generation was blocked. Reason: ${response.promptFeedback.blockReason}.`);
    }

    // Now, check if we have a candidate and if it contains the image data.
    if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
    }
    
    // If we haven't returned yet, provide a more detailed error based on what we know.
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Image generation failed to complete. Reason: ${candidate.finishReason}.`);
    }
    
    throw new Error("Image generation failed. The AI model's response did not contain an image.");
};


export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const candidate = response.candidates?.[0];
    
    // It's crucial to check for a blocked response first.
    if (response.promptFeedback?.blockReason) {
        throw new Error(`Image editing was blocked. Reason: ${response.promptFeedback.blockReason}.`);
    }

    // Now, check if we have a candidate and if it contains the image data.
    if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
    }

    // If we haven't returned yet, provide a more detailed error based on what we know.
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Image editing failed to complete. Reason: ${candidate.finishReason}.`);
    }

    throw new Error("Image editing failed. The AI model's response did not contain an image.");
};

export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    const imagePart = {
        inlineData: {
            mimeType,
            data: base64Image,
        },
    };
    const textPart = {
        text: prompt,
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
    return response.text;
};


export const groundedSearch = async (prompt: string): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
    return response;
};

export const groundedMapsSearch = async (prompt: string, location: GeolocationCoordinates): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
                retrievalConfig: {
                    latLng: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                    }
                }
            }
        },
    });
    return response;
};

export const quickResponse = async (prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        // FIX: Use the correct model name for gemini flash lite according to the guidelines.
        model: 'gemini-flash-lite-latest',
        contents: prompt,
    });
    return response.text;
};

export const enhanceScript = async (script: string, systemInstruction: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: script,
        config: {
            systemInstruction: systemInstruction,
        },
    });
    return response.text;
};

export const generateVideoTitle = async (script: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: script,
        config: {
            systemInstruction: THUMBNAIL_TITLE_PROMPT,
        },
    });
    return response.text.trim();
};

export const generatePromptsFromScript = async (script: string, aspectRatio: string): Promise<string[]> => {
    const ai = getAiClient();
    const userPrompt = `
Here is the script:
---
${script}
---

Please generate the image prompts. IMPORTANT: Adhere to the following style constraint for ALL generated prompts:
- Aspect Ratio: ${aspectRatio}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction: PROMPT_GENERATOR_SYSTEM_PROMPT,
        },
    });

    try {
        const responseText = response.text.trim();
        const prompts = responseText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.toLowerCase().includes('image prompt:'))
            .map(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex === -1) return '';
                
                let prompt = line.substring(colonIndex + 1).trim();
                
                if (prompt.startsWith('*') && prompt.endsWith('*')) {
                    prompt = prompt.substring(1, prompt.length - 1);
                }
                return prompt;
            })
            .filter(prompt => prompt.length > 0);

        if (prompts.length === 0) {
            throw new Error("Parsed zero prompts from the AI response.");
        }
        return prompts;
    } catch (e) {
        console.error("Failed to parse prompts from script response:", response.text, e);
        throw new Error("AI failed to generate valid scene prompts in the expected format. Please try again or adjust your script.");
    }
};

export const generateSpeech = async (
    text: string,
    speakers: { speaker?: string; voiceName: string }[]
): Promise<string> => {
    const ai = getAiClient();

    let speechConfig;

    // Per API documentation, multi-speaker voice requires exactly 2 speakers.
    if (speakers.length >= 2) {
        // If more than 2 speakers are detected from the script,
        // we will use the first two for the multi-speaker API call to prevent an error.
        const speakersForApi = speakers.slice(0, 2);

        speechConfig = {
            multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: speakersForApi.map(({ speaker, voiceName }) => {
                    if (!speaker) {
                        throw new Error("Speaker name is required for each speaker in multi-speaker TTS.");
                    }
                    return {
                        speaker,
                        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                    };
                })
            }
        };
    } else {
        // Single speaker (or zero speakers, which will use a default voice).
        // This handles cases where speakers.length is 0 or 1.
        const voiceName = speakers.length > 0 && speakers[0].voiceName ? speakers[0].voiceName : 'Aoede';
        speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
            },
        };
    }


    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig,
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Text-to-speech generation failed.");
    }
    return base64Audio;
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    const ai = getAiClient();
    const audioPart = {
        inlineData: {
            mimeType,
            data: base64Audio,
        },
    };
    const textPart = {
        text: "Transcribe this audio recording accurately. If you detect multiple speakers, please label their dialogue with speaker labels like 'Speaker 1:', 'Speaker 2:', etc. Ensure the transcription is clean and ready for a text-to-speech engine.",
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
    });
    return response.text;
};

export const analyzeScriptStyle = async (script: string): Promise<{ style: string, tone: string }> => {
    const ai = getAiClient();
    const analysisPrompt = `
    Analyze the following script and determine the most appropriate "Voice Style" and "Voice Tone" from the provided lists.
    Your response MUST be a JSON object with two keys: "style" and "tone".

    Available Voice Styles:
    ${VOICE_STYLES.join(', ')}

    Available Voice Tones:
    ${VOICE_TONES.join(', ')}

    Script:
    ---
    ${script}
    ---
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    style: {
                        type: Type.STRING,
                        description: 'The most appropriate voice style from the list.',
                        enum: VOICE_STYLES,
                    },
                    tone: {
                        type: Type.STRING,
                        description: 'The most appropriate voice tone from the list.',
                        enum: VOICE_TONES,
                    },
                },
                required: ['style', 'tone'],
            },
        },
    });

    try {
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        // Validate that the returned values are in our lists
        if (VOICE_STYLES.includes(result.style) && VOICE_TONES.includes(result.tone)) {
            return result;
        }
        // Fallback if the model hallucinates a value not in the enum
        console.warn('AI returned a style or tone not in the predefined lists. Using default.');
        return { style: VOICE_STYLES[0], tone: VOICE_TONES[0] };
    } catch (e) {
        console.error("Failed to parse style analysis from AI response:", response.text, e);
        // Return a default if parsing fails
        return { style: VOICE_STYLES[0], tone: VOICE_TONES[0] };
    }
};


// --- Pexels Service ---
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_BASE = 'https://api.pexels.com/v1';

const pexelsFetch = async (endpoint: string) => {
    if (!PEXELS_API_KEY) {
        throw new Error("Pexels API key not configured. Please set PEXELS_API_KEY environment variable.");
    }
    const response = await fetch(`${PEXELS_API_BASE}${endpoint}`, {
        headers: {
            Authorization: PEXELS_API_KEY
        }
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Pexels API Error:", errorBody);
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
};

export const searchPexelsPhotos = async (query: string): Promise<PexelsPhotoSearchResponse> => {
    return pexelsFetch(`/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`);
};

export const searchPexelsVideos = async (query: string): Promise<PexelsVideoSearchResponse> => {
    return pexelsFetch(`/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`);
};
