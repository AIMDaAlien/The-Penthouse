import React, { useState, useRef, useEffect } from 'react';
import { MicIcon, TrashIcon, PlayIcon, PauseIcon, StopIcon, SendIcon } from './Icons';
import './VoiceRecorder.css';

interface VoiceRecorderProps {
    onSend: (audioBlob: Blob, duration: number, mimeType: string) => void;
}

export default function VoiceRecorder({ onSend }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [duration, setDuration] = useState(0);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>('audio/webm');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Detect supported mime type
            const types = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg;codecs=opus',
                'audio/ogg'
            ];
            const supportedType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
            setMimeType(supportedType);

            mediaRecorderRef.current = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: supportedType || 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = window.setInterval(() => {
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
            setDuration(recordingTime);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleSend = () => {
        if (audioBlob) {
            onSend(audioBlob, duration, mimeType);
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

    const visualizerBars = React.useMemo(() =>
        [...Array(10)].map((_, i) => ({ key: i, height: Math.random() * 100 })),
        []);

    return (
        <div className={`voice-recorder ${isRecording ? 'recording' : ''}`}>
            {audioBlob ? (
                <div className="preview-mode">
                    <button className="icon-btn delete-btn" onClick={resetRecorder} title="Discard">
                        <TrashIcon size={18} />
                    </button>

                    <div className="playback-controls">
                        <button className="icon-btn play-btn" onClick={togglePlayback}>
                            {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                        </button>
                        <span className="duration">{formatTime(duration)}</span>
                        {/* Visualizer Placeholder */}
                        <div className="mini-visualizer">
                            {visualizerBars.map(bar => (
                                <div key={bar.key} className="bar" style={{ height: bar.height + '%' }}></div>
                            ))}
                        </div>
                        <audio
                            ref={audioRef}
                            src={audioUrl!}
                            onEnded={() => setIsPlaying(false)}
                            hidden
                        />
                    </div>

                    <button className="icon-btn send-btn" onClick={handleSend} title="Send">
                        <SendIcon size={18} />
                    </button>
                </div>
            ) : isRecording ? (
                <div className="recording-mode">
                    <div className="recording-indicator">
                        <span className="pulse-dot"></span>
                        <span className="timer">{formatTime(recordingTime)}</span>
                    </div>
                    <button className="icon-btn stop-btn" onClick={stopRecording} title="Stop Recording">
                        <StopIcon size={18} />
                    </button>
                </div>
            ) : (
                <button className="icon-btn mic-btn" onClick={startRecording} title="Record Voice Message">
                    <MicIcon size={20} />
                </button>
            )}
        </div>
    );
}
