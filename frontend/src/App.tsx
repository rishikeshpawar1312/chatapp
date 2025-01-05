import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import AuthForm from './Auth/Authform';

// Types
interface Message {
  content: string;
  sender: {
    username: string;
    id: string;
  };
}

interface User {
  id: string;
  username: string;
}

const App: React.FC = () => {
  // States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);

  // Socket connection effect
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const newSocket = io('http://localhost:3000', {
        auth: { token }
      });

      setSocket(newSocket);

      newSocket.on('connect_error', (err: Error) => {
        if (err.message === 'Authentication error') {
          localStorage.removeItem('token');
          setUser(null);
        }
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  // Message listener effect
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

  // Handlers
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
  };

  if (!user) {
    return <AuthForm setUser={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Chat Room</CardTitle>
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
                  <div className="font-semibold text-sm">
                    {message.sender.username}
                  </div>
                  <div>{message.content}</div>
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
  );
};

export default App;