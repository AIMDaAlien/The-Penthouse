import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
    getServers,
    getServerDetails,
    createServer,
    createChannel,
    joinServer as joinServerApi,
    safeApiCall,
} from '../services/api';
import type { Server, Channel, User } from '../types';

interface UseServersReturn {
    // State
    servers: Server[];
    selectedServerId: number | null;
    serverChannels: Channel[];
    serverMembers: User[];
    showNewServer: boolean;
    showNewChannel: boolean;
    showJoinServer: boolean;
    joinCode: string;

    // Actions
    loadServers: () => Promise<void>;
    loadServerDetails: (serverId: number) => Promise<void>;
    handleServerSelect: (serverId: number | null) => void;
    setShowNewServer: (show: boolean) => void;
    setShowNewChannel: (show: boolean) => void;
    setShowJoinServer: (show: boolean) => void;
    setJoinCode: (code: string) => void;
    handleCreateServer: (name: string) => Promise<void>;
    handleCreateChannel: (name: string) => Promise<void>;
    handleJoinServer: (code: string) => Promise<{ success: boolean; serverId?: number }>;
}

export function useServers(): UseServersReturn {
    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
    const [serverChannels, setServerChannels] = useState<Channel[]>([]);
    const [serverMembers, setServerMembers] = useState<User[]>([]);

    // UI State
    const [showNewServer, setShowNewServer] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [showJoinServer, setShowJoinServer] = useState(false);
    const [joinCode, setJoinCode] = useState('');

    const loadServers = useCallback(async () => {
        await safeApiCall(
            getServers(),
            (data) => setServers(data)
        );
    }, []);

    const loadServerDetails = useCallback(async (serverId: number) => {
        await safeApiCall(
            getServerDetails(serverId),
            (data) => {
                setServerChannels(data.channels);
                setServerMembers(data.members || []);
            }
        );
    }, []);

    const handleServerSelect = useCallback((serverId: number | null) => {
        setSelectedServerId(serverId);
        if (!serverId) {
            setServerChannels([]);
            setServerMembers([]);
        }
    }, []);

    const handleCreateServer = useCallback(async (name: string) => {
        await safeApiCall(
            createServer(name.trim()),
            async () => {
                setShowNewServer(false);
                await loadServers();
            },
            (err) => console.error('Server creation failed:', err)
        );
    }, [loadServers]);

    const handleCreateChannel = useCallback(async (name: string) => {
        if (!selectedServerId) return;
        await safeApiCall(
            createChannel(selectedServerId, name.trim()),
            async () => {
                setShowNewChannel(false);
                await loadServerDetails(selectedServerId);
            },
            (err) => console.error('Channel creation failed:', err)
        );
    }, [selectedServerId, loadServerDetails]);

    const handleJoinServer = useCallback(async (code: string): Promise<{ success: boolean; serverId?: number }> => {
        let result = { success: false, serverId: undefined as number | undefined };
        
        await safeApiCall(
            joinServerApi(code.trim()),
            async (data) => {
                if (data.success) {
                    setJoinCode('');
                    setShowJoinServer(false);
                    if (data.alreadyMember) {
                        Alert.alert('Info', 'You are already a member of this server!');
                    }
                    await loadServers();
                    result = { success: true, serverId: data.serverId };
                }
            },
            (err) => {
                console.error('Join failed:', err);
                Alert.alert('Error', 'Failed to join server. Check the code and try again.');
            }
        );
        
        return result;
    }, [loadServers]);

    return {
        servers,
        selectedServerId,
        serverChannels,
        serverMembers,
        showNewServer,
        showNewChannel,
        showJoinServer,
        joinCode,
        loadServers,
        loadServerDetails,
        handleServerSelect,
        setShowNewServer,
        setShowNewChannel,
        setShowJoinServer,
        setJoinCode,
        handleCreateServer,
        handleCreateChannel,
        handleJoinServer,
    };
}
