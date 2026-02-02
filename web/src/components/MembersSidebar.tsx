import React from 'react';
import type { User } from '../types';

interface MembersSidebarProps {
    members: User[];
    collapsed: boolean;
}

const MembersSidebar: React.FC<MembersSidebarProps> = ({ members, collapsed }) => {
    return (
        <aside className={`members-sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="members-header">
                <h3>MEMBERS — {members.length}</h3>
            </div>
            <div className="members-list">
                {members.map((u) => (
                    <div key={u.id} className="member-item">
                        <div className="member-avatar">
                            {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="avatar" />
                            ) : (
                                u.username[0].toUpperCase()
                            )}
                            <div className="member-status-dot online"></div>
                        </div>
                        <div className="member-info">
                            <span className="member-name">{u.displayName || u.username}</span>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default MembersSidebar;
