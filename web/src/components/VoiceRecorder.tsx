import { useState, useRef, useEffect } from 'react';
import './VoiceRecorder.css';

interface VoiceRecorderProps {
    onSend: (audioBlob: Blob, duration: number) => void;
}

export default function VoiceRecorder({ onSend }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [duration, setDuration] = useState(0);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setDuration(recordingTime); // Capture final duration
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleSend = () => {
        if (audioBlob) {
            onSend(audioBlob, duration);
            resetRecorder();
        }
    };

    const resetRecorder = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setIsRecording(false);
        setRecordingTime(0);
        setDuration(0);
        setIsPlaying(false);
        chunksRef.current = [];
    };

    const togglePlayback = () => {
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`voice-recorder ${isRecording ? 'recording' : ''}`}>
            {audioBlob ? (
                // Preview Mode
                <div className="preview-mode">
                    <button className="icon-btn delete-btn" onClick={resetRecorder} title="Discard">
                        🗑️
                    </button>

                    <div className="playback-controls">
                        <button className="icon-btn play-btn" onClick={togglePlayback}>
                            {isPlaying ? '⏸️' : '▶️'}
                        </button>
                        <span className="duration">{formatTime(duration)}</span>
                        <audio
                            ref={audioRef}
                            src={audioUrl!}
                            onEnded={() => setIsPlaying(false)}
                            hidden
                        />
                    </div>

                    <button className="icon-btn send-btn" onClick={handleSend} title="Send">
                        📤
                    </button>
                </div>
            ) : isRecording ? (
                // Recording Mode
                <div className="recording-mode">
                    <div className="recording-indicator">
                        <span className="pulse-dot"></span>
                        <span className="timer">{formatTime(recordingTime)}</span>
                    </div>
                    <button className="icon-btn stop-btn" onClick={stopRecording} title="Stop Recording">
                        ⏹️
                    </button>
                </div>
            ) : (
                // Idle Mode
                <button className="icon-btn mic-btn" onClick={startRecording} title="Record Voice Message">
                    🎙️
                </button>
            )}
        </div>
    );
}
