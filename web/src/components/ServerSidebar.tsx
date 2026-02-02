import React from 'react';
import type { Server } from '../types';

interface ServerSidebarProps {
    servers: Server[];
    selectedServerId: number | null;
    onSelectServer: (serverId: number | null) => void;
    onCreateServer: () => void;
}

const ServerSidebar: React.FC<ServerSidebarProps> = ({
    servers,
    selectedServerId,
    onSelectServer,
    onCreateServer,
}) => {
    return (
        <nav className="server-rail">
            <div
                className={`server-icon home-icon ${selectedServerId === null ? 'active' : ''}`}
                onClick={() => onSelectServer(null)}
                title="Home"
            >
                🏠
            </div>

            {servers.map(server => (
                <div
                    key={server.id}
                    className={`server-icon ${selectedServerId === server.id ? 'active' : ''}`}
                    onClick={() => onSelectServer(server.id)}
                    title={server.name}
                >
                    {server.iconUrl ? (
                        <img src={server.iconUrl} alt={server.name} />
                    ) : (
                        <span>{server.name.substring(0, 2).toUpperCase()}</span>
                    )}
                </div>
            ))}

            <div
                className="server-icon add-server-btn"
                onClick={onCreateServer}
                title="Create Server"
            >
                +
            </div>
        </nav>
    );
};

export default ServerSidebar;
