import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Shield } from "lucide-react";
import AuthForm from './Auth/Authform';
import { useToast } from './hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: {
    username: string;
    id: string;
    role: string;
  };
}

interface User {
  id: string;
  username: string;
  role: string;
}

const API_BASE_URL = 'http://localhost:3000';

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const newSocket = io(API_BASE_URL, {
        auth: { token }
      });

      setSocket(newSocket);

      newSocket.on('connect_error', (err: Error) => {
        if (err.message === 'Authentication error') {
          localStorage.removeItem('token');
          setUser(null);
          toast({
            title: "Authentication Error",
            description: "Please log in again.",
            variant: "destructive"
          });
        }
      });

      newSocket.on('users', (users: User[]) => {
        setOnlineUsers(users);
      });

      newSocket.on('messageDeleted', (messageId: string) => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        setIsDeleting(null);
        toast({
          title: "Success",
          description: "Message deleted successfully",
        });
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      const messageHandler = (message: Message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      };

      socket.on('message', messageHandler);

      return () => {
        socket.off('message', messageHandler);
      };
    }
  }, [socket]);

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || isDeleting) return;
    
    setIsDeleting(messageId);
    
    // Emit deleteMessage event through socket
    socket.emit('deleteMessage', messageId);

    // Set up a timeout to handle cases where server doesn't respond
    const timeoutId = setTimeout(() => {
      setIsDeleting(null);
      toast({
        title: "Error",
        description: "Delete operation timed out. Please try again.",
        variant: "destructive"
      });
    }, 5000);

    // Clear the timeout if component unmounts
    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('sendMessage', {
        content: newMessage
      });
      setNewMessage('');
    }
  };

  const handleMessageChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewMessage(e.target.value);
  };

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    setUser(null);
    if (socket) {
      socket.close();
    }
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  if (!user) {
    return <AuthForm setUser={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-4 gap-4">
        {/* User List Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Online Users</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {onlineUsers.map((onlineUser) => (
                <div
                  key={onlineUser.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className={`${
                    onlineUser.id === user.id ? 'font-bold' : ''
                  }`}>
                    {onlineUser.username}
                    {onlineUser.role === 'admin' && (
                      <Shield className="inline ml-1 w-4 h-4 text-blue-500" />
                    )}
                    {onlineUser.id === user.id ? ' (You)' : ''}
                  </span>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Card */}
        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Chat Room</CardTitle>
              {user.role === 'admin' && (
                <Button
                  variant="outline"
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                >
                  Admin Panel
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
            >
              Logout
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] p-4 border rounded-lg mb-4">
              {messages.map((message: Message, index: number) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.sender.username === user.username
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.sender.username === user.username
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center gap-1">
                      {message.sender.username}
                      {message.sender.role === 'admin' && (
                        <Shield className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {message.content}
                      {user.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isDeleting === message.id}
                        >
                          <Trash2 className={`w-4 h-4 ${isDeleting === message.id ? 'opacity-50' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
            
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={handleMessageChange}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button type="submit">Send</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default App;