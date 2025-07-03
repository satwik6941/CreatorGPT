
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  ArrowRight, 
  Youtube, 
  Play,
  ArrowLeft 
} from "lucide-react";

const CreatorProfile = () => {
  const navigate = useNavigate();
  const [channelId, setChannelId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (channelId.trim()) {
      console.log("Channel ID:", channelId);
      navigate(`/analysis-realtime?channelId=${encodeURIComponent(channelId)}`);
    }
  };

  return (
    <div className="min-h-screen bg-deep-black text-white animate-fade-in">
      {/* Header */}
      <nav className="p-6 border-b border-gray-800 animate-fade-in">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-r from-electric-blue to-bright-red rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Brain className="w-5 h-5 text-white transition-transform duration-300 group-hover:animate-pulse" />
            </div>
            <span className="text-xl font-bold transition-colors duration-300 group-hover:text-electric-blue">Creator GPT</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Home
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12 animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            <div className="w-16 h-16 bg-gradient-to-r from-electric-blue to-bright-red rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-110 hover:rotate-12 transition-all duration-500 group">
              <Youtube className="w-8 h-8 text-white group-hover:animate-bounce" />
            </div>
            <h1 className="text-4xl font-bold mb-4 hover:text-electric-blue transition-colors duration-300">Enter Your Channel ID</h1>
            <p className="text-xl text-gray-300 hover:text-white transition-colors duration-300">
              Start analyzing your YouTube comments with AI-powered sentiment analysis
            </p>
          </div>

          <Card className="glass-effect border-electric-blue/20 hover:border-electric-blue/50 transition-all duration-500 hover:shadow-2xl hover:shadow-electric-blue/20 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
            <CardHeader className="group">
              <CardTitle className="text-2xl group-hover:text-electric-blue transition-colors duration-300">YouTube Channel Analysis</CardTitle>
              <CardDescription className="group-hover:text-gray-300 transition-colors duration-300">
                Enter your YouTube Channel ID to begin sentiment analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Channel ID */}
                <div className="space-y-2 group animate-fade-in opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
                  <Label htmlFor="channelId" className="group-hover:text-electric-blue transition-colors duration-300">YouTube Channel ID *</Label>
                  <Input
                    id="channelId"
                    placeholder="Enter your YouTube Channel ID"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="bg-dark-surface border-gray-600 focus:border-electric-blue transition-all duration-300 hover:border-gray-500 focus:scale-[1.02] focus:shadow-lg focus:shadow-electric-blue/20"
                    required
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    You can find your Channel ID in YouTube Studio → Settings → Channel → Advanced settings
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-6 animate-fade-in opacity-0" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-electric-blue hover:bg-electric-blue/90 text-black font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-electric-blue/50 group"
                    disabled={!channelId.trim()}
                  >
                    <Play className="w-5 h-5 mr-2 group-hover:animate-spin transition-transform duration-300" />
                    Start Analyzing My Comments
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-8 text-gray-400 hover:text-white transition-colors duration-300 animate-fade-in opacity-0" style={{ animationDelay: '1.0s', animationFillMode: 'forwards' }}>
            <p>Your data is secure and will never be shared with third parties.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorProfile;
