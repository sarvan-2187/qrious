import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { requestUploadUrl, confirmUpload } from '../api/resources';
import type { ResourceType } from '../api/resources';
import { FaCloudUploadAlt, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

type UploadState = 'idle' | 'requesting' | 'uploading' | 'confirming' | 'success' | 'error';
type FailedStep = 'request' | 'upload' | 'confirm' | null;

const ACCEPTED_TYPES: Record<ResourceType, { accept: string; mimeType: string; label: string }> = {
  video: { accept: ".mp4,.mov,.webm", mimeType: "video/*", label: "Video (.mp4, .mov, .webm)" },
  ppt: { accept: ".pdf", mimeType: "application/pdf", label: "Slides (PDF) — export PPTX to PDF" },
  notes: { accept: ".pdf", mimeType: "application/pdf", label: "Notes (PDF)" },
  cheatsheet: { accept: ".pdf", mimeType: "application/pdf", label: "Cheatsheet (PDF)" },
  interactive_lab: { accept: ".json,.qasm,.pdf", mimeType: "application/json", label: "Interactive Quantum Lab (Gates Playground)" },
};

export default function ResourceUpload({ lessonId }: { lessonId: string }) {
  const [state, setState] = useState<UploadState>('idle');
  const [failedStep, setFailedStep] = useState<FailedStep>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const [resourceType, setResourceType] = useState<ResourceType | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const uploadDataRef = useRef<{ uploadUrl: string; resourceId: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const validateFile = () => {
    if (!resourceType) {
      setErrorMessage('Please select a resource type first.');
      return false;
    }
    if (!file) {
      setErrorMessage('Please select a file.');
      return false;
    }
    const allowed = ACCEPTED_TYPES[resourceType as ResourceType];
    const isVideo = resourceType === 'video';
    const isValidType = isVideo ? file.type.startsWith('video/') : file.type === allowed.mimeType;
    
    if (!isValidType) {
      setErrorMessage(
        isVideo 
          ? `Invalid file type. Expected a video file.` 
          : `Please upload a PDF. Export your document to PDF first.`
      );
      return false;
    }
    // Size limits: Video max 500MB, PPT max 50MB, Docs max 20MB
    const sizeMap: Record<ResourceType, number> = {
      video: 500 * 1024 * 1024,
      ppt: 50 * 1024 * 1024,
      notes: 20 * 1024 * 1024,
      cheatsheet: 20 * 1024 * 1024,
      interactive_lab: 50 * 1024 * 1024
    };
    if (file.size > sizeMap[resourceType as ResourceType]) {
      setErrorMessage(`File is too large. Maximum size for ${resourceType} is ${sizeMap[resourceType as ResourceType] / (1024 * 1024)}MB.`);
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const doRequestUrl = async () => {
    setState('requesting');
    setFailedStep(null);
    try {
      const data = await requestUploadUrl({
        lesson_id: lessonId,
        resource_type: resourceType as ResourceType,
        title,
        description,
        filename: file!.name,
        content_type: file!.type,
      } as any); // using any for now since we haven't updated frontend API types
      uploadDataRef.current = { uploadUrl: data.upload_url, resourceId: data.resource_id };
      doUpload();
    } catch (err: any) {
      setState('error');
      setFailedStep('request');
      setErrorMessage(err.message || 'Failed to request upload URL. Do you have permission?');
    }
  };

  const doUpload = () => {
    setState('uploading');
    setFailedStep(null);
    setProgress(0);
    
    if (!uploadDataRef.current || !file) return;

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadDataRef.current.uploadUrl, true);
    // Important: DO NOT SET Authorization header here. B2 handles auth via the presigned signature in the URL itself.
    // If you set Authorization, it will fail due to B2 expecting standard S3 signature OR CORS issues.
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        doConfirm();
      } else {
        setState('error');
        setFailedStep('upload');
        setErrorMessage(`Upload failed with status: ${xhr.status}. Please check CORS configuration.`);
      }
    };

    xhr.onerror = () => {
      setState('error');
      setFailedStep('upload');
      setErrorMessage('Upload failed due to a network or CORS error.');
    };

    xhr.send(file);
  };

  const doConfirm = async () => {
    setState('confirming');
    setFailedStep(null);
    if (!uploadDataRef.current) return;
    try {
      await confirmUpload(uploadDataRef.current.resourceId);
      setState('success');
    } catch (err: any) {
      setState('error');
      setFailedStep('confirm');
      setErrorMessage(err.message || 'Failed to confirm upload with server.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFile()) return;
    await doRequestUrl();
  };

  const resetForm = () => {
    setState('idle');
    setFailedStep(null);
    setErrorMessage('');
    setProgress(0);
    setResourceType('');
    setTitle('');
    setDescription('');
    setFile(null);
    uploadDataRef.current = null;
  };

  return (
    <div className="w-full">
      <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <FaCloudUploadAlt className="text-primary" /> Upload Resource
          </CardTitle>
          <CardDescription>
            Add new learning materials to this lesson.
          </CardDescription>
        </CardHeader>
          
          <CardContent>
            {state === 'idle' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Resource Type</Label>
                    <Select value={resourceType} onValueChange={(val) => setResourceType(val as ResourceType)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video Lecture</SelectItem>
                        <SelectItem value="ppt">{ACCEPTED_TYPES.ppt.label}</SelectItem>
                        <SelectItem value="notes">{ACCEPTED_TYPES.notes.label}</SelectItem>
                        <SelectItem value="cheatsheet">{ACCEPTED_TYPES.cheatsheet.label}</SelectItem>
                        <SelectItem value="interactive_lab">Interactive Lab (Gates Playground)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input 
                      placeholder="e.g. Introduction to Qubits" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input 
                      placeholder="e.g. A brief overview of quantum bits" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>File</Label>
                    <Input 
                      type="file" 
                      onChange={handleFileChange} 
                      required 
                      accept={resourceType ? ACCEPTED_TYPES[resourceType as ResourceType].accept : undefined}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm font-medium">
                    {errorMessage}
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-lg">
                  Start Upload
                </Button>
              </form>
            )}

            {(state === 'requesting' || state === 'uploading' || state === 'confirming') && (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    {state === 'requesting' && 'Requesting Secure Upload URL...'}
                    {state === 'uploading' && 'Uploading File to Storage...'}
                    {state === 'confirming' && 'Confirming Upload with Server...'}
                  </h3>
                  
                  {state === 'uploading' && (
                    <div className="w-full max-w-md mx-auto mt-4">
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-muted-foreground mt-2">{progress}% Complete</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FaExclamationCircle className="w-16 h-16 text-destructive mb-4" />
                <h3 className="text-2xl font-bold mb-2">Upload Interrupted</h3>
                <p className="text-muted-foreground mb-6 max-w-md">{errorMessage}</p>
                
                <div className="flex gap-4">
                  <Button variant="outline" onClick={resetForm}>Start Over</Button>
                  
                  {failedStep === 'request' && <Button onClick={doRequestUrl}>Retry Request</Button>}
                  {failedStep === 'upload' && <Button onClick={doUpload}>Retry Upload</Button>}
                  {failedStep === 'confirm' && <Button onClick={doConfirm}>Retry Confirmation</Button>}
                </div>
              </div>
            )}

            {state === 'success' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FaCheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                <h3 className="text-2xl font-bold mb-2">Upload Successful!</h3>
                <p className="text-muted-foreground mb-6">Your resource has been securely stored and published.</p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={resetForm}>Upload Another File</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}

