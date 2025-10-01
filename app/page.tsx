// Updated page.tsx with backend proxy uploads (NO CORS)

"use client"

import React, { useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  // Video upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const startCamera = async (mode: "user" | "environment" = "user") => {
    setError(null);
    setPhoto(null);
    setUploadResult(null);

    if (cameraStarted) {
      stopCamera();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: mode } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStarted(true);
        setFacingMode(mode);
      }
    } catch (err: any) {
      setError(err.message || "Unable to access camera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraStarted(false);
  };

  // OPTION 1: Single-step upload via backend (RECOMMENDED - NO CORS)
  const uploadViaSingleStep = async (file: File, fileId: string): Promise<any> => {
    console.log("=== CLIENT: Starting single-step upload ===");
    console.log(`File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    setUploadProgress(prev => ({ ...prev, [fileId]: 5 }));

    const formData = new FormData();
    formData.append('file', file);

    console.log("Sending file to backend...");
    
    const response = await fetch('/api/upload/video', {
      method: 'POST',
      body: formData,
    });

    console.log(`Backend response: ${response.status} ${response.statusText}`);
    setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));

    if (!response.ok) {
      const error = await response.json();
      console.error("Upload failed:", error);
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    console.log("✓ Upload successful:", result);
    console.log("=== CLIENT: Upload completed ===");
    
    setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
    return result;
  };

  // OPTION 2: Two-step upload via proxy (for chunked/resumable uploads)
  const uploadViaTwoStep = async (file: File, fileId: string): Promise<any> => {
    console.log("=== CLIENT: Starting two-step upload ===");
    console.log(`File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Step 1: Get resumable upload URL
    console.log("Step 1: Requesting upload URL...");
    setUploadProgress(prev => ({ ...prev, [fileId]: 5 }));

    const urlResponse = await fetch('/api/upload/video-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }),
    });

    console.log(`Upload URL response: ${urlResponse.status} ${urlResponse.statusText}`);

    if (!urlResponse.ok) {
      const error = await urlResponse.json();
      console.error("Failed to get upload URL:", error);
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { uploadUrl } = await urlResponse.json();
    console.log("✓ Upload URL received");
    console.log(`Upload URL: ${uploadUrl.substring(0, 100)}...`);
    
    setUploadProgress(prev => ({ ...prev, [fileId]: 10 }));

    // Step 2: Upload through the proxy to avoid CORS
    console.log("Step 2: Uploading file through proxy...");
    
    const uploadResponse = await fetch(
      `/api/upload/proxy?uploadUrl=${encodeURIComponent(uploadUrl)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      }
    );

    console.log(`Proxy response: ${uploadResponse.status} ${uploadResponse.statusText}`);
    setUploadProgress(prev => ({ ...prev, [fileId]: 90 }));

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      console.error("Upload through proxy failed:", error);
      throw new Error(error.error || 'Upload failed');
    }

    const result = await uploadResponse.json();
    console.log("✓ Upload successful:", result);
    console.log("=== CLIENT: Two-step upload completed ===");
    
    setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
    return result;
  };

  // Updated photo upload using backend
  const uploadPhotoChunked = async (imageData: string) => {
    setUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      console.log("Converting photo to file...");
      // Convert base64 to blob
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Create a File object from the blob
      const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' });
      
      console.log(`Photo file created: ${(file.size / 1024).toFixed(2)}KB`);
      
      // Upload via backend (choose method based on file size)
      const fileId = `camera-photo-${Date.now()}`;
      
      // Use single-step for small files (< 5MB), two-step for larger
      if (file.size < 5 * 1024 * 1024) {
        await uploadViaSingleStep(file, fileId);
      } else {
        await uploadViaTwoStep(file, fileId);
      }
      
      setUploadResult(`Photo uploaded successfully!`);
      console.log("Photo upload complete!");
    } catch (err: any) {
      console.error("Photo upload error:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip the canvas horizontally for front camera
    if (facingMode === "user") {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const dataURL = canvas.toDataURL("image/png");
    setPhoto(dataURL);
    stopCamera();
    uploadPhotoChunked(dataURL);
  };

  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      console.log(`Compressing image: ${file.name}`);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB -> ${(blob.size / 1024).toFixed(2)}KB`);
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, 'image/jpeg', quality);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const toggleCamera = () => {
    startCamera(facingMode === "user" ? "environment" : "user");
  };

  // Updated unified upload function using backend
  const handleUnifiedUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log(`=== Starting upload of ${files.length} files ===`);
    const uploadTasks: Promise<void>[] = [];
    setError(null);

    Array.from(files).forEach((file, index) => {
      const task = (async () => {
        const fileId = `${file.name}-${index}`;
        console.log(`\n--- Processing file ${index + 1}/${files.length}: ${file.name} (${file.type}) ---`);
        
        setUploadingFiles(prev => [...prev, fileId]);
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        try {
          if (file.type.startsWith("image/")) {
            // Handle image upload
            console.log(`Processing image: ${file.name}`);
            setUploadProgress(prev => ({ ...prev, [fileId]: 5 }));
            
            // Compress the image first
            const compressedBlob = await compressImage(file);
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            
            // Upload via backend (single-step for images)
            await uploadViaSingleStep(compressedFile, fileId);
            
            console.log(`✓ Successfully uploaded image: ${file.name}`);

          } else if (file.type.startsWith("video/")) {
            // Handle video upload
            console.log(`Processing video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // Validate file size (max 500MB)
            const maxSize = 500 * 1024 * 1024;
            if (file.size > maxSize) {
              throw new Error('Video file must be less than 500MB');
            }

            // Choose upload method based on file size
            // Single-step for small files (< 50MB), two-step for larger
            if (file.size < 50 * 1024 * 1024) {
              console.log("Using single-step upload (small file)");
              await uploadViaSingleStep(file, fileId);
            } else {
              console.log("Using two-step upload (large file)");
              await uploadViaTwoStep(file, fileId);
            }
            
            console.log(`✓ Successfully uploaded video: ${file.name}`);
          }

        } catch (error: any) {
          console.error(`✗ Error uploading ${file.name}:`, error);
          setError(`Failed to upload ${file.name}: ${error.message}`);
          setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        } finally {
          // Remove from uploading files list after a short delay
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(id => id !== fileId));
          }, 2000);
        }
      })();

      uploadTasks.push(task);
    });

    // Wait for all uploads to complete
    await Promise.all(uploadTasks);
    console.log('=== All uploads completed ===');
  };

  return (
    <div className="relative min-h-[100vh]p-6 w-[360px] mx-auto">
      <h1 className="garamond-title box-text text-2xl text-center mb-20 mt-14 ">
        Mirova 50tka
      </h1>
      
      
      
      {/* Camera Controls */}
      <div className="flex flex-wrap gap-3 justify-center mb-4">
        <button
          onClick={toggleCamera}
          disabled={!cameraStarted}
          className={`${ 
            cameraStarted ? "garamond box px-4 py-2 rounded-lg hover:bg-white disabled:bg-gray-200" : ""}`}
        >
          {cameraStarted ? facingMode === "user" ? "Zadná" : "Predná"  : " "}
          {cameraStarted ? " Kamera" : " "}
        </button>

        {photo && (
          <div className="flex gap-4 justify-center mt-2">
            <button
              onClick={() => {
                if (!photo) return;
                const link = document.createElement("a");
                link.href = photo;
                link.download = "photo.png";
                link.click();
              }}
              className="garamond box px-4 py-2 text-white rounded-lg hover:bg-white disabled:bg-gray-300 mr-[7px]"
            >
              Stiahni fotku
            </button>
          </div>
        )}
        
        <div className="flex gap-4 justify-center mt-2">
          <a
            className={`${
              uploading ? "garamond box-loading px-4 py-2 bg-gray-400 text-white rounded-lg " : " "
            }`}
          >
            {uploading ? "Nahráva sa fotka..." : " "}
          </a>               
        </div>

        {error && <p className="text-red-500 text-center mb-2">Error: {error}</p>}

        {/* Camera View */}
        {photo ? (
          <div className="text-center">
            <img
              src={photo}
              alt="Captured"
              className="photo rounded-lg shadow-md border mr-[7px]"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`photo rounded-lg bg-black mx-auto ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />

            {cameraStarted && (
              <button
                onClick={takePhoto}
                disabled={!cameraStarted}
                className="camera mt-4 rounded-lg hover:bg-black/60 disabled:bg-gray-200"
              />
            )}
          </div>
        )}

        <button
          onClick={() => startCamera(facingMode)}
          disabled={cameraStarted || uploadingFiles.length > 0}
          className={`${
            cameraStarted ? " " : "garamond box px-4 py-2 rounded-lg"
          } hover:bg-white disabled:bg-gray-400`}
        >
          {cameraStarted ? " " : "Zapni kameru"}
        </button>

        <a
          href="https://drive.google.com/drive/folders/1Feu4T54SDYag8V9n8FPPAfwyHtQpShkL?usp=share_link"
          target="_blank"
          rel="noopener noreferrer"
          className={`${
            cameraStarted ? " " : "garamond box px-4 py-2 text-white rounded-lg hover:bg-white"}`}
        > 
          {cameraStarted ? " ": "Otvor Album"}
        </a>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-center">Nahrávanie súborov...</h3>
          {uploadingFiles.map((fileId) => (
            <div key={fileId} className="bg-white-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress[fileId] || 0}%` }}
              />
              <div className="text-xs text-center mt-1">
                {fileId.split('-')[0]} - {Math.round(uploadProgress[fileId] || 0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified File Upload */}
      <div className="mt-6 border-t blue-color pt-4">
        <div className="border-2 border-dashed blue-color rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <Upload className="mx-auto mb-4" size={32} />
          <label className="cursor-pointer blue-color">
            <span className="garamond box-text px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900">
              Nahraj fotky a videá
            </span>
            <input
              type="file"
              accept="image/*, video/*"
              multiple
              onChange={handleUnifiedUpload}
              className="hidden"
              disabled={uploadingFiles.length > 0}
            />
          </label>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}