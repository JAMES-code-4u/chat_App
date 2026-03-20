import React from 'react';
import Card from './components/Card';

const CardPreview = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '32px',
      flexWrap: 'wrap',
      padding: '40px',
      background: 'linear-gradient(135deg, #0f0a1a 0%, #1a1025 40%, #12081f 100%)',
    }}>
      <Card
        title="Welcome Back"
        description="Start chatting with your friends and enjoy seamless, real-time communication."
        buttonText="Get Started"
        onButtonClick={() => alert('Button clicked!')}
      />
      <Card
        title="Premium Plan"
        description="Unlock video calls, voice chat, and unlimited file sharing with our premium tier."
        buttonText="Upgrade Now"
        onButtonClick={() => alert('Upgrade clicked!')}
      />
      <Card
        title="AI Assistant"
        description="Chat with our AI-powered voice assistant for instant help and smart suggestions."
        buttonText="Try AI Chat"
        onButtonClick={() => alert('AI Chat clicked!')}
      />
    </div>
  );
};

export default CardPreview;
