import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Bot, Check, X, Eye, EyeOff, Info } from 'lucide-react';
import { aiService } from '../lib/aiService';
import { toast } from 'sonner@2.0.3';

interface AISettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AISettingsDialog({ open, onClose }: AISettingsDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic' | 'gemini'>('openai');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [testing, setTesting] = useState(false);

  const currentProvider = aiService.getConfiguredProvider();

  const handleSave = () => {
    let saved = false;
    
    if (openaiKey) {
      aiService.setAPIKey('openai', openaiKey);
      saved = true;
    }
    
    if (anthropicKey) {
      aiService.setAPIKey('anthropic', anthropicKey);
      saved = true;
    }
    
    if (geminiKey) {
      aiService.setAPIKey('gemini', geminiKey);
      saved = true;
    }

    if (saved) {
      toast.success('API Key Saved!', {
        description: 'The chatbot will now use AI for more intelligent responses.',
      });
      onClose();
    } else {
      toast.error('No API Key Provided', {
        description: 'Please enter at least one API key.',
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await aiService.ask('Hello, can you help me?', 'test-user');
      toast.success('AI Test Successful!', {
        description: `Connected to ${response.provider}. Response: "${response.answer.substring(0, 50)}..."`,
        duration: 5000,
      });
    } catch (error: any) {
      toast.error('AI Test Failed', {
        description: error.message || 'Could not connect to AI service. Check your API key.',
        duration: 5000,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Chatbot Settings
          </DialogTitle>
          <DialogDescription>
            Configure AI API keys to enable intelligent chatbot responses
          </DialogDescription>
        </DialogHeader>

        {/* Current Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${currentProvider ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                {currentProvider ? `Connected to ${currentProvider}` : 'No AI Provider Configured'}
              </span>
            </div>
            {currentProvider && (
              <Button onClick={handleTest} disabled={testing} size="sm" variant="outline">
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            )}
          </div>
          {!currentProvider && (
            <p className="text-xs text-gray-600 mt-2">
              The chatbot will use pattern matching fallback until an AI provider is configured.
            </p>
          )}
        </div>

        {/* API Key Configuration */}
        <Tabs value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="openai">OpenAI</TabsTrigger>
            <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
            <TabsTrigger value="gemini">Google Gemini</TabsTrigger>
          </TabsList>

          {/* OpenAI Tab */}
          <TabsContent value="openai" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>OpenAI GPT-4o-mini:</strong> Best quality responses. Requires API key from{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                  platform.openai.com
                </a>
                . Cost: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="openai-key"
                    type={showKeys ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKeys(!showKeys)}
                >
                  {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
              <p className="font-medium">How to get OpenAI API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Go to <a href="https://platform.openai.com/signup" target="_blank" className="underline">platform.openai.com/signup</a></li>
                <li>Create an account or sign in</li>
                <li>Go to "API keys" in settings</li>
                <li>Click "Create new secret key"</li>
                <li>Copy and paste it here</li>
              </ol>
            </div>
          </TabsContent>

          {/* Anthropic Tab */}
          <TabsContent value="anthropic" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Anthropic Claude 3 Haiku:</strong> Fast and cost-effective. Requires API key from{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">
                  console.anthropic.com
                </a>
                . Cost: ~$0.25 per 1M input tokens, $1.25 per 1M output tokens.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="anthropic-key"
                    type={showKeys ? 'text' : 'password'}
                    placeholder="sk-ant-..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKeys(!showKeys)}
                >
                  {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
              <p className="font-medium">How to get Anthropic API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Go to <a href="https://console.anthropic.com" target="_blank" className="underline">console.anthropic.com</a></li>
                <li>Create an account or sign in</li>
                <li>Go to "API Keys"</li>
                <li>Click "Create Key"</li>
                <li>Copy and paste it here</li>
              </ol>
            </div>
          </TabsContent>

          {/* Gemini Tab */}
          <TabsContent value="gemini" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Google Gemini 1.5 Flash:</strong> FREE tier available! Get API key from{' '}
                <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">
                  Google AI Studio
                </a>
                . Free tier: 15 requests/minute, 1500 requests/day.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="gemini-key">Google Gemini API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="gemini-key"
                    type={showKeys ? 'text' : 'password'}
                    placeholder="AIza..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKeys(!showKeys)}
                >
                  {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
              <p className="font-medium">How to get Google Gemini API key (FREE):</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" className="underline">Google AI Studio</a></li>
                <li>Sign in with your Google account</li>
                <li>Click "Get API key"</li>
                <li>Click "Create API key"</li>
                <li>Copy and paste it here</li>
              </ol>
              <p className="font-medium text-green-600 mt-2">✨ Recommended for students (FREE!)</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between items-center gap-2 pt-4">
          <p className="text-xs text-gray-500">
            💡 Tip: Try Google Gemini first - it's free and works great!
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save API Key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
