import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';

interface ConversationUser {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
  isOnline: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    senderId: string;
    content: string;
    timestamp: string;
    isRead: boolean;
  };
  otherUser: ConversationUser | null;
}

interface ChatUserListProps {
  conversations: Conversation[];
}

// Compact relative time, e.g. "4m", "2h", "3d" - avoids overflow in the narrow sidebar
const shortTimeAgo = (timestamp: string): string => {
  const full = formatDistanceToNowStrict(new Date(timestamp));
  return full
    .replace(' seconds', 's')
    .replace(' second', 's')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd')
    .replace(' months', 'mo')
    .replace(' month', 'mo')
    .replace(' years', 'y')
    .replace(' year', 'y');
};

export const ChatUserList: React.FC<ChatUserListProps> = ({ conversations }) => {
  const navigate = useNavigate();
  const { userId: activeUserId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();

  if (!currentUser) return null;

  const handleSelectUser = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  return (
    <div className="bg-white border-r border-gray-200 w-full md:w-64 h-full overflow-y-auto">
      <div className="py-4">
        <h2 className="px-4 text-lg font-semibold text-gray-800 mb-4">Messages</h2>

        <div className="space-y-1">
          {conversations.length > 0 ? (
            conversations.map((conversation) => {
              const otherUser = conversation.otherUser;
              if (!otherUser) return null;

              const lastMessage = conversation.lastMessage;
              const isActive = activeUserId === otherUser.id;

              return (
                <div
                  key={conversation.id}
                  className={`px-3 py-3 flex items-start cursor-pointer transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 border-l-4 border-primary-600'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                  onClick={() => handleSelectUser(otherUser.id)}
                >
                  <Avatar
                    src={otherUser.avatarUrl}
                    alt={otherUser.name}
                    size="md"
                    status={otherUser.isOnline ? 'online' : 'offline'}
                    className="mr-2 flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate min-w-0">
                        {otherUser.name}
                      </h3>

                      {lastMessage && (
                        <span className="text-[11px] text-gray-500 flex-shrink-0 whitespace-nowrap mt-0.5">
                          {shortTimeAgo(lastMessage.timestamp)}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-1 gap-1">
                      {lastMessage && (
                        <p className="text-xs text-gray-600 truncate min-w-0">
                          {lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                          {lastMessage.content}
                        </p>
                      )}

                      {lastMessage && !lastMessage.isRead && lastMessage.senderId !== currentUser.id && (
                        <Badge variant="primary" size="sm" rounded className="flex-shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No conversations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};