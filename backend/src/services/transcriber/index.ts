import fs from 'fs';
import { execSync, spawn } from 'child_process';
import path from 'path';
import { config } from '../../config/env';
import llm from '../../utils/llm/llm';

export type TranscriptionProvider = 'openai' | 'google' | 'assemblyai' | 'elevenlabs' | 'whisper' | 'disabled';

export type TranscriptionResult = {
    text: string;
    provider: TranscriptionProvider;
    duration?: number;
    confidence?: number;
    studyMaterials?: StudyMaterials;
};

export type StudyMaterials = {
    summary: string;
    keyPoints: string[];
    topics: string[];
    categories: string[];
    searchableKeywords: string[];
    studyGuide: {
        mainConcepts: string[];
        importantTerms: { term: string; definition: string; }[];
        questions: string[];
        takeaways: string[];
    };
    timestamps?: { time: number; content: string; topic: string; }[];
};

function toText(out: any): string {
    if (typeof out === 'string') return out;
    if (out?.content) return String(out.content);
    if (out?.text) return String(out.text);
    return JSON.stringify(out);
}

export async function transcribeAudio(filePath: string, provider?: TranscriptionProvider): Promise<TranscriptionResult> {
    let result: TranscriptionResult;
    
    // Use config provider if not specified
    const activeProvider = provider || config.transcription_provider as TranscriptionProvider || 'whisper';

    // Check if transcription is disabled
    if (activeProvider === 'disabled') {
        throw new Error('Transcription is disabled. Set TRANSCRIPTION_PROVIDER in .env to enable.');
    }

    switch (activeProvider) {
        case 'whisper':
            result = await transcribeWithWhisper(filePath);
            break;
        case 'openai':
            result = await transcribeWithOpenAI(filePath);
            break;
        case 'google':
            result = await transcribeWithGoogle(filePath);
            break;
        case 'assemblyai':
            result = await transcribeWithAssemblyAI(filePath);
            break;
        case 'elevenlabs':
            result = await transcribeWithElevenLabs(filePath);
            break;
        default:
            throw new Error(`Unknown provider: ${activeProvider}`);
    }

    if (result.text && result.text.length > 50) {
        result.studyMaterials = await generateStudyMaterials(result.text);
    }

    return result;
}

// Local Whisper transcription using faster-whisper (Python)
async function transcribeWithWhisper(filePath: string): Promise<TranscriptionResult> {
    const whisperModel = process.env.WHISPER_MODEL || 'medium';
    const timeout = 300000; // 5 minutes timeout
    
    return new Promise((resolve, reject) => {
        let isResolved = false;
        let timeoutId: NodeJS.Timeout;
        
        // Python script to run faster-whisper
        const pythonScript = `
import sys
import json
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
try:
    from faster_whisper import WhisperModel
    model = WhisperModel("${whisperModel}", device="cpu", compute_type="int8")
    segments, info = model.transcribe("${filePath.replace(/\\/g, '/')}", beam_size=5)
    text = " ".join([segment.text for segment in segments])
    result = {"text": text.strip(), "duration": info.duration if hasattr(info, 'duration') else 0}
    print(json.dumps(result))
    sys.stdout.flush()
except ImportError as e:
    print(json.dumps({"error": "faster-whisper not installed. Run: pip install faster-whisper"}))
    sys.stdout.flush()
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.stdout.flush()
`;
        
        const proc = spawn('python', ['-c', pythonScript], {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false,
            windowsHide: true
        });

        let stdout = '';
        let stderr = '';

        // Set timeout to kill process if it takes too long
        timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                proc.kill('SIGTERM');
                setTimeout(() => proc.kill('SIGKILL'), 1000);
                reject(new Error(`Whisper transcription timed out after ${timeout/1000} seconds. Try using a smaller model (tiny/base) or use OpenAI Whisper API instead.`));
            }
        }, timeout);

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(timeoutId);
            
            try {
                const lines = stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const result = JSON.parse(lastLine);
                
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve({
                        text: result.text || '',
                        provider: 'whisper',
                        duration: result.duration
                    });
                }
            } catch (e) {
                const errorMsg = stderr || stdout || 'Unknown error';
                reject(new Error(`Whisper transcription failed: ${errorMsg}`));
            }
        });

        proc.on('error', (err) => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(timeoutId);
            reject(new Error(`Failed to run Python: ${err.message}. Make sure Python is installed and in PATH.`));
        });
    });
}

async function transcribeWithOpenAI(filePath: string): Promise<TranscriptionResult> {
    try {
        // OpenAI Whisper transcription requires an API key
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            throw new Error('OpenAI API key is required for audio transcription. Ollama does not support audio transcription. Please set OPENAI_API_KEY in your .env file or use a different transcription provider.');
        }

        const { OpenAI } = await import('openai');
        const openaiClient = new OpenAI({ apiKey: openaiApiKey });

        const audioFile = fs.createReadStream(filePath);

        const transcription = await openaiClient.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });

        return {
            text: transcription.text,
            provider: 'openai',
        };
    } catch (error: any) {
        console.error('OpenAI transcription error:', error);
        throw new Error(`OpenAI transcription failed: ${error.message}`);
    }
}

async function transcribeWithGoogle(filePath: string): Promise<TranscriptionResult> {
    try {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error('Google Cloud credentials not configured');
        }

        let speech: any;
        try {
            speech = await eval(`import('@google-cloud/speech')`);
        } catch (importError) {
            throw new Error('Google Cloud Speech SDK not installed. Run: npm install @google-cloud/speech');
        }

        const client = new speech.SpeechClient();

        const audioBytes = fs.readFileSync(filePath);

        const audioConfig = {
            encoding: 'WEBM_OPUS' as any,
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
        };

        const request = {
            audio: { content: audioBytes },
            config: audioConfig,
        };

        const [response] = await client.recognize(request);

        if (!response.results || response.results.length === 0) {
            throw new Error('No transcription results from Google Speech');
        }

        const transcription = response.results
            .map(result => result.alternatives?.[0]?.transcript || '')
            .join(' ');

        const confidence = response.results[0]?.alternatives?.[0]?.confidence || 0;

        return {
            text: transcription,
            provider: 'google',
            confidence,
        };
    } catch (error: any) {
        console.error('Google Speech transcription error:', error);
        throw new Error(`Google Speech transcription failed: ${error.message}`);
    }
}

async function transcribeWithAssemblyAI(filePath: string): Promise<TranscriptionResult> {
    try {
        const apiKey = process.env.ASSEMBLYAI_API_KEY;
        if (!apiKey) {
            throw new Error('AssemblyAI API key not configured');
        }

        const audioData = fs.readFileSync(filePath);

        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/octet-stream',
            },
            body: audioData,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const { upload_url } = await uploadResponse.json();

        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audio_url: upload_url,
                punctuate: true,
                format_text: true,
            }),
        });

        if (!transcriptResponse.ok) {
            throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`);
        }

        const { id } = await transcriptResponse.json();

        let status = 'queued';
        let result: any;

        while (status !== 'completed' && status !== 'error') {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });

            if (!pollResponse.ok) {
                throw new Error(`Polling failed: ${pollResponse.statusText}`);
            }

            result = await pollResponse.json();
            status = result.status;
        }

        if (status === 'error') {
            throw new Error(`AssemblyAI transcription failed: ${result.error}`);
        }

        return {
            text: result.text || '',
            provider: 'assemblyai',
            confidence: result.confidence,
        };
    } catch (error: any) {
        console.error('AssemblyAI transcription error:', error);
        throw new Error(`AssemblyAI transcription failed: ${error.message}`);
    }
}

async function transcribeWithElevenLabs(filePath: string): Promise<TranscriptionResult> {
    try {
        const apiKey = process.env.ELEVEN_API_KEY || '';
        if (!apiKey) {
            throw new Error('ElevenLabs API key not configured');
        }

        const audioData = fs.readFileSync(filePath);
        const formData = new FormData();
        formData.append('audio', new Blob([audioData]), 'audio.webm');

        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.statusText}`);
        }

        const result = await response.json();

        return {
            text: result.text || '',
            provider: 'elevenlabs',
        };
    } catch (error: any) {
        console.error('ElevenLabs transcription error:', error);
        throw new Error(`ElevenLabs transcription failed: ${error.message}`);
    }
}

async function generateStudyMaterials(transcriptionText: string): Promise<StudyMaterials> {
    try {
        const prompt = `Analyze this transcription and create organized study materials:

TRANSCRIPTION:
${transcriptionText}

Please provide a JSON response with the following structure:
{
    "summary": "Brief overview of the main content (2-3 sentences)",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "topics": ["Topic 1", "Topic 2", "Topic 3"],
    "categories": ["Category like 'Science', 'History', 'Math', etc."],
    "searchableKeywords": ["keyword1", "keyword2", "keyword3"],
    "studyGuide": {
        "mainConcepts": ["Concept 1", "Concept 2"],
        "importantTerms": [{"term": "Term", "definition": "Definition"}],
        "questions": ["Question 1?", "Question 2?"],
        "takeaways": ["Key takeaway 1", "Key takeaway 2"]
    }
}

Make it educational and useful for studying. Focus on extracting the most important information for learning purposes.`;

        const response = await llm.invoke([
            {
                role: 'system',
                content: 'You are an expert educational content analyzer. Create comprehensive study materials from transcriptions. Always respond with valid JSON only.'
            },
            {
                role: 'user',
                content: prompt
            }
        ]);

        const responseText = toText(response).trim();
        if (!responseText) {
            throw new Error('No response from AI');
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid JSON response from AI');
        }

        const studyMaterials = JSON.parse(jsonMatch[0]);

        return {
            summary: studyMaterials.summary || 'Content analysis not available',
            keyPoints: studyMaterials.keyPoints || [],
            topics: studyMaterials.topics || [],
            categories: studyMaterials.categories || ['General'],
            searchableKeywords: studyMaterials.searchableKeywords || [],
            studyGuide: {
                mainConcepts: studyMaterials.studyGuide?.mainConcepts || [],
                importantTerms: studyMaterials.studyGuide?.importantTerms || [],
                questions: studyMaterials.studyGuide?.questions || [],
                takeaways: studyMaterials.studyGuide?.takeaways || []
            }
        };
    } catch (error: any) {
        console.error('Study materials generation error:', error);

        return {
            summary: 'Unable to generate summary',
            keyPoints: [],
            topics: [],
            categories: ['General'],
            searchableKeywords: [],
            studyGuide: {
                mainConcepts: [],
                importantTerms: [],
                questions: [],
                takeaways: []
            }
        };
    }
}