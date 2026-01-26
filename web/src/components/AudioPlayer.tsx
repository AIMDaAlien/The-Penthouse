import { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon } from './Icons';
import './AudioPlayer.css';

interface AudioPlayerProps {
    src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const onEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        const onLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current) return;
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = percent * audioRef.current.duration;
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="custom-audio-player">
            <button className="player-btn" onClick={togglePlay}>
                {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>

            <div className="progress-container" onClick={handleSeek}>
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            <span className="time-display">
                {formatTime(duration || 0)}
            </span>

            <audio ref={audioRef} src={src} preload="metadata" />
        </div>
    );
}
