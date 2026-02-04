'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Play, Sparkles, Zap, MessageSquare } from 'lucide-react';
import { ImageGallery } from '@/components/ImageGallery';
import { AgentWorkflow } from '@/components/AgentWorkflow';
import { TokenUsage } from '@/components/planning/TokenUsage';
import { Button } from '@/components/ui/Button';
import { startPlanningSession, createPlanningWebSocket, startExecutionSession, createExecutionWebSocket, WebSocketMessage } from '@/lib/api';
import { AgentState, UploadedImage, VisualPlan, MusicCandidatesResponse, FinalMusicSelection, ExecutedStep } from '@/types/agent';

const initialAgentState: AgentState = {
  phase: 'idle',
  planningSubPhase: null,
  planning: {
    visualPlan: null,
    musicCandidates: null,
    selectedMusic: null,
  },
  editing: {
    currentStep: 0,
    totalSteps: 0,
    executedSteps: [],
  },
  done: {
    videoUrl: null,
    summary: null,
  },
};

export default function StudioPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [agentState, setAgentState] = useState<AgentState>(initialAgentState);
  const [viewPhase, setViewPhase] = useState<'planning' | 'editing' | 'done' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [planningStep, setPlanningStep] = useState<'connecting' | 'visual_plan' | 'music_plan' | 'downloading' | 'final_plan' | 'complete'>('connecting');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [usageData, setUsageData] = useState<{ usageBreakdown: any; pricing: any } | null>(null);
  const [executionStep, setExecutionStep] = useState<'idle' | 'uploading_images' | 'uploading_audio' | 'selecting_images' | 'executing_plan' | 'complete'>('idle');
  const [executionMessage, setExecutionMessage] = useState('');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const execWsRef = useRef<WebSocket | null>(null);

  // Use refs to avoid stale closure issues
  const planningSessionIdRef = useRef<string | null>(null);
  const trimmedAudioPathRef = useRef<string | null>(null);

  const resetAgent = useCallback(() => {
    // Reset all state
    setAgentState(initialAgentState);
    setViewPhase(null);
    setIsProcessing(false);
    setPlanningStep('connecting');
    setDownloadProgress(0);
    setProgressMessage('');
    setUsageData(null);
    setExecutionStep('idle');
    setExecutionMessage('');
    setExecutionLogs([]);
    setImages([]);
    setPrompt('');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Handle execution WebSocket messages
  const handleExecutionMessage = useCallback((message: WebSocketMessage) => {
    console.log('Execution message:', message);

    switch (message.type) {
      case 'execution_started':
      case 'device_connected':
        setExecutionStep('uploading_images');
        setExecutionMessage(message.message || 'Starting execution...');
        break;

      case 'uploading_images':
        setExecutionStep('uploading_images');
        setExecutionMessage(message.message || 'Uploading images...');
        break;

      case 'uploading_audio':
        setExecutionStep('uploading_audio');
        setExecutionMessage(message.message || 'Uploading audio...');
        break;

      case 'selecting_images':
      case 'selecting_images_complete':
        setExecutionStep('selecting_images');
        setExecutionMessage(message.message || 'Selecting images in InShot...');
        break;

      case 'executing_plan':
        setExecutionStep('executing_plan');
        setExecutionMessage(message.message || 'Executing editing plan...');
        break;

      case 'execution_complete':
        setExecutionStep('complete');
        setAgentState(prev => ({
          ...prev,
          phase: 'done',
          done: {
            videoUrl: null,
            summary: {
              totalDuration: 9.5,
              effectsCount: prev.planning.visualPlan?.plan.filter(a => a.tool === 'apply_effect').length || 0,
              transitionsCount: prev.planning.visualPlan?.plan.filter(a => a.tool === 'add_transition').length || 0,
              trackUsed: prev.planning.selectedMusic?.selected_track_filename || 'Unknown',
            },
          },
        }));
        setIsProcessing(false);
        toast.success('Execution Complete!', {
          description: 'Your video has been edited on the device!',
          icon: <Sparkles className="w-4 h-4" />,
        });
        break;

      case 'error':
        toast.error('Execution Error', {
          description: message.message || 'Something went wrong',
        });
        setIsProcessing(false);
        break;

      case 'warning':
        toast.warning('Warning', {
          description: message.message,
        });
        break;

      case 'agent_log':
      case 'agent_step':
        // Add log message to the logs array
        if (message.message) {
          setExecutionLogs(prev => [...prev, message.message!]);
        }
        break;
    }
  }, []);

  const startEditingPhase = useCallback(async (visualPlan: VisualPlan) => {
    const totalSteps = visualPlan.plan.length;

    setAgentState(prev => ({
      ...prev,
      phase: 'editing',
      editing: {
        currentStep: 0,
        totalSteps,
        executedSteps: [],
      },
    }));

    setExecutionStep('uploading_images');
    setExecutionMessage('Starting execution on device...');

    try {
      // Start execution session
      console.log("Planning Session id: ", planningSessionIdRef.current, " audio Path: ", trimmedAudioPathRef.current);
      const execResponse = await startExecutionSession({
        visual_plan: visualPlan,
        planning_session_id: planningSessionIdRef.current || undefined,
        audio_path: trimmedAudioPathRef.current || undefined,
        audio_track_name: 'audio_1',
      });

      // Connect to execution WebSocket
      execWsRef.current = createExecutionWebSocket(
        execResponse.websocket_url,
        handleExecutionMessage,
        (error) => {
          console.error('Execution WebSocket error:', error);
          toast.error('Execution Connection Error', {
            description: 'Lost connection to device. Please try again.',
          });
          setIsProcessing(false);
        },
        () => {
          console.log('Execution WebSocket closed');
        }
      );
    } catch (error) {
      console.error('Failed to start execution:', error);
      toast.error('Execution Failed', {
        description: 'Could not start execution. Make sure device is connected.',
      });
      setIsProcessing(false);
    }
  }, [handleExecutionMessage]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('WebSocket message:', message);

    switch (message.type) {
      case 'planning_started':
        setPlanningStep('visual_plan');
        setProgressMessage('Starting visual plan generation...');
        break;

      case 'visual_plan_started':
        setProgressMessage('Generating visual editing plan...');
        break;

      case 'visual_plan':
        // Visual plan received
        const visualPlan = message.data as VisualPlan;
        setAgentState(prev => ({
          ...prev,
          planning: { ...prev.planning, visualPlan },
        }));
        setPlanningStep('music_plan');
        setProgressMessage('Visual plan complete! Finding music...');
        toast.success('Visual Plan Generated!');
        break;

      case 'music_plan':
        // Music candidates received
        const musicPlan = message.data as MusicCandidatesResponse;
        setAgentState(prev => ({
          ...prev,
          planning: { ...prev.planning, musicCandidates: musicPlan },
        }));
        setPlanningStep('downloading');
        setProgressMessage('Starting music downloads...');
        toast.success('Music Candidates Found!');
        break;

      case 'downloading_music':
      case 'download_progress':
        // Download progress
        if (message.progress !== undefined) {
          setDownloadProgress(message.progress);
        }
        if (message.message) {
          setProgressMessage(message.message);
        }
        break;

      case 'final_plan_started':
        setPlanningStep('final_plan');
        setProgressMessage('Analyzing tracks and syncing...');
        break;

      case 'full_plan':
        // Final plan received
        const fullPlan = message.data as FinalMusicSelection;

        // Extract trimmed audio URL from the plan
        const audioUrl = (message.data as any)?.trimmed_audio_url;
        if (audioUrl) {
          trimmedAudioPathRef.current = audioUrl;
        }

        setAgentState(prev => ({
          ...prev,
          planning: { ...prev.planning, selectedMusic: fullPlan },
        }));
        setPlanningStep('complete');
        setProgressMessage('Planning complete!');
        toast.success('Planning Complete!', {
          description: 'Moving to editing phase.',
        });

        // Move to editing phase after a short delay
        setTimeout(() => {
          setAgentState(prev => {
            if (prev.planning.visualPlan) {
              startEditingPhase(prev.planning.visualPlan);
            }
            return prev;
          });
        }, 1500);
        break;

      case 'planning_complete':
        // Planning finished - extract usage data
        const completeData = message.data as any;
        if (completeData?.usage_breakdown && completeData?.pricing) {
          setUsageData({
            usageBreakdown: completeData.usage_breakdown,
            pricing: completeData.pricing,
          });
        }
        setPlanningStep('complete');
        break;

      case 'error':
        toast.error('Planning Error', {
          description: message.message || 'Something went wrong',
        });
        setIsProcessing(false);
        break;
    }
  }, [startEditingPhase]);

  const startAgent = useCallback(async () => {
    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Please describe how you want your edits');
      return;
    }

    setIsProcessing(true);
    setPlanningStep('connecting');
    setDownloadProgress(0);

    toast.success('Agent Started!', {
      description: 'Connecting to DroidRun AI...',
      icon: <Zap className="w-4 h-4" />,
    });

    // Set planning phase
    setAgentState(prev => ({
      ...prev,
      phase: 'planning',
      planningSubPhase: 'visual-plan',
    }));

    try {
      // Start planning session with backend
      const imageFiles = images.map(img => img.file);
      const response = await startPlanningSession({
        images: imageFiles,
        prompt,
      });

      // Store session ID for execution phase
      planningSessionIdRef.current = response.session_id;
      setProgressMessage('Connected! Starting planning...');

      // Connect to WebSocket for progress updates
      wsRef.current = createPlanningWebSocket(
        response.websocket_url,
        handleWebSocketMessage,
        (error) => {
          console.error('WebSocket error:', error);
          toast.error('Connection Error', {
            description: 'Lost connection to server. Please try again.',
          });
          setIsProcessing(false);
        },
        () => {
          console.log('WebSocket closed');
        }
      );
    } catch (error) {
      console.error('Failed to start planning:', error);
      toast.error('Connection Failed', {
        description: 'Could not connect to server. Make sure the backend is running.',
      });
      setIsProcessing(false);
      setAgentState(prev => ({ ...prev, phase: 'idle' }));
    }
  }, [images, prompt, handleWebSocketMessage]);

  // Determine which phase to display
  const displayPhase = viewPhase || agentState.phase;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#22c55e]" />
          Studio
        </h1>
        <p className="text-[#71717a] mt-1">
          Create stunning AI-edited videos in seconds
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column - Inputs */}
        <div className="xl:col-span-4 space-y-6">
          <div className="p-6 rounded-xl bg-[#111118] border border-[#1f1f28]">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              Input
            </h2>

            <div className="space-y-6">
              {/* Image Gallery */}
              <ImageGallery images={images} onImagesChange={setImages} />

              {/* Edit Prompt */}
              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  How should your edit look?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Make it catchy and trendy with cool transitions, fast-paced phonk vibe..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-[#0d0d12] border border-[#27272a] text-[#e4e4e7] placeholder-[#52525b] transition-all duration-200 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30 hover:border-[#3f3f46] resize-none"
                />
              </div>

              {/* Start Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={startAgent}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column - Agent Workflow */}
        <div className="xl:col-span-8">
          <AgentWorkflow
            state={agentState}
            images={images}
            onReset={resetAgent}
            viewPhase={viewPhase}
            onViewPhaseChange={setViewPhase}
            planningStep={planningStep}
            downloadProgress={downloadProgress}
            progressMessage={progressMessage}
            usageData={usageData}
            executionStep={executionStep}
            executionMessage={executionMessage}
            executionLogs={executionLogs}
          />
        </div>
      </div>
    </div>
  );
}
