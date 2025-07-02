
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Brain,
  TrendingUp,
  Shield,
  Zap,
  Users,
  MessageSquare,
  ArrowRight,
  Play
} from "lucide-react";

const Index = () => {
  const [channelId, setChannelId] = useState("");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/creator-profile");
  };

  return (
    <div className="min-h-screen bg-deep-black text-white overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-50 p-6 animate-fade-in">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-r from-electric-blue to-bright-red rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Brain className="w-5 h-5 text-white transition-transform duration-300 group-hover:animate-pulse" />
            </div>
            <span className="text-xl font-bold transition-colors duration-300 group-hover:text-electric-blue">Creator GPT</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-electric-blue transition-all duration-300 relative after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-electric-blue after:transition-all after:duration-300 hover:after:w-full">Features</a>
            <a href="#how-it-works" className="text-gray-300 hover:text-electric-blue transition-all duration-300 relative after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-electric-blue after:transition-all after:duration-300 hover:after:w-full">How it Works</a>
            <Button variant="outline" className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-black transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-electric-blue/20">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-gradient-radial from-electric-blue/10 via-transparent to-transparent animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-conic from-bright-red/5 via-transparent to-electric-blue/5 animate-spin" style={{ animationDuration: '20s' }}></div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="animate-fade-in">
            <Badge className="mb-6 bg-glass border-electric-blue/30 text-electric-blue animate-bounce hover:animate-none transition-all duration-300 hover:scale-110 hover:bg-electric-blue/20">
              <Zap className="w-4 h-4 mr-2 animate-pulse" />
              AI-Powered Analytics
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-electric-blue to-white bg-clip-text text-transparent animate-fade-in hover:animate-pulse transition-all duration-300">
              Decode Your YouTube
              <br />
              <span className="text-electric-blue animate-glow-pulse">Comment Sentiment</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              Transform YouTube comments into actionable insights with advanced AI sentiment analysis. 
              Understand your audience, track trends, and optimize your content strategy.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fade-in opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
              <Button 
                size="lg" 
                className="bg-electric-blue hover:bg-electric-blue/90 text-black font-semibold px-8 py-4 text-lg glow-button animate-glow-pulse hover:scale-105 hover:shadow-2xl hover:shadow-electric-blue/50 transition-all duration-300 group"
                onClick={handleGetStarted}
              >
                <Play className="w-5 h-5 mr-2 group-hover:animate-spin transition-transform duration-300" />
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg hover:scale-105 hover:border-electric-blue transition-all duration-300 hover:shadow-lg">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-6 hover:text-electric-blue transition-colors duration-300">Powerful Features for Content Creators</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to understand and engage with your YouTube audience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Real-time Analytics",
                description: "Monitor sentiment trends across all your videos with live updates and interactive charts."
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "AI Sentiment Analysis",
                description: "Advanced machine learning algorithms analyze comment emotions with 95+ accuracy."
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "Trend Detection",
                description: "Identify emerging topics and sentiment shifts before they become viral."
              },
              {
                icon: <MessageSquare className="w-8 h-8" />,
                title: "Comment Insights",
                description: "Categorize comments by sentiment, keywords, and engagement levels."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Audience Intelligence",
                description: "Understand your community demographics and behavior patterns."
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Privacy Protected",
                description: "Enterprise-grade security with full data encryption and privacy compliance."
              }
            ].map((feature, index) => (
              <Card key={index} className="glass-effect p-8 hover:border-electric-blue/50 transition-all duration-500 group hover:scale-105 hover:shadow-2xl hover:shadow-electric-blue/20 animate-fade-in opacity-0 hover:-translate-y-2" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}>
                <div className="text-electric-blue mb-4 group-hover:animate-float transition-all duration-300 group-hover:text-bright-red group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-electric-blue transition-colors duration-300">{feature.title}</h3>
                <p className="text-gray-300 group-hover:text-white transition-colors duration-300">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-dark-surface/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-6 hover:text-electric-blue transition-colors duration-300">Get Started in 3 Simple Steps</h2>
            <p className="text-xl text-gray-300">
              From setup to insights in under 5 minutes
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Connect Your Channel",
                description: "Securely link your YouTube channel with our OAuth integration. Your data stays protected."
              },
              {
                step: "02", 
                title: "AI Analyzes Comments",
                description: "Our advanced AI processes all comments across your videos, detecting sentiment and keywords."
              },
              {
                step: "03",
                title: "Get Actionable Insights",
                description: "Access comprehensive dashboards with sentiment trends, audience insights, and growth recommendations."
              }
            ].map((step, index) => (
              <div key={index} className="text-center relative group animate-fade-in opacity-0 hover:scale-105 transition-all duration-500" style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'forwards' }}>
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-electric-blue to-bright-red rounded-full flex items-center justify-center text-2xl font-bold text-black transition-all duration-300 group-hover:scale-110 group-hover:animate-bounce">
                  {step.step}
                </div>
                <h3 className="text-2xl font-semibold mb-4 group-hover:text-electric-blue transition-colors duration-300">{step.title}</h3>
                <p className="text-gray-300 text-lg group-hover:text-white transition-colors duration-300">{step.description}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-electric-blue to-bright-red opacity-30 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta-section" className="py-24 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 hover:animate-pulse transition-all duration-300">
              Ready to Transform Your
              <br />
              <span className="text-electric-blue animate-glow-pulse">YouTube Strategy?</span>
            </h2>
            <p className="text-xl text-gray-300 mb-12">
              Enter your YouTube Channel ID to start analyzing your comments with AI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="flex">
                <Input
                  type="text"
                  placeholder="Enter your YouTube Channel ID"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-80 bg-dark-surface border-gray-600 focus:border-electric-blue text-white transition-all duration-300 focus:scale-105 focus:shadow-lg focus:shadow-electric-blue/20"
                />
              </div>
              <Button 
                size="lg" 
                className="bg-electric-blue hover:bg-electric-blue/90 text-black font-semibold px-8 py-3 hover:scale-105 hover:shadow-2xl hover:shadow-electric-blue/50 transition-all duration-300 group"
                onClick={() => channelId && navigate(`/analysis?channelId=${encodeURIComponent(channelId)}`)}
                disabled={!channelId.trim()}
              >
                Start Analysis
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6 animate-fade-in">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0 group">
              <div className="w-8 h-8 bg-gradient-to-r from-electric-blue to-bright-red rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold group-hover:text-electric-blue transition-colors duration-300">Creator GPT</span>
            </div>
            <div className="flex space-x-6 text-gray-400">
              <a href="#" className="hover:text-electric-blue transition-all duration-300 hover:scale-110 relative after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-electric-blue after:transition-all after:duration-300 hover:after:w-full">Privacy</a>
              <a href="#" className="hover:text-electric-blue transition-all duration-300 hover:scale-110 relative after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-electric-blue after:transition-all after:duration-300 hover:after:w-full">Terms</a>
              <a href="#" className="hover:text-electric-blue transition-all duration-300 hover:scale-110 relative after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-electric-blue after:transition-all after:duration-300 hover:after:w-full">Support</a>
            </div>
          </div>
          <div className="text-center text-gray-400 mt-8 hover:text-white transition-colors duration-300">
            © 2024 Creator GPT. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
